// End-to-end round trip: sign up -> verify session -> sign out -> sign in.
//
// Usage: node scripts/verify-roundtrip.mjs
import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

const profile = mkdtempSync(join(tmpdir(), "chrome-roundtrip-"))
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--remote-debugging-port=9227",
  `--user-data-dir=${profile}`,
  "about:blank",
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const j = await (await fetch("http://127.0.0.1:9227/json/version")).json()
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl
    } catch {}
    await sleep(200)
  }
  throw new Error("no chrome")
}

const ws = new WebSocket(await getWsUrl())
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})

let nextId = 1
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    if (m.error) {
      reject(new Error(JSON.stringify(m.error)))
    } else {
      resolve(m.result)
    }
  }
}
const send = (method, params = {}, sessionId) => {
  const id = nextId++
  const payload = { id, method, params }
  if (sessionId) {
    payload.sessionId = sessionId
  }
  ws.send(JSON.stringify(payload))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" })
const { sessionId } = await send("Target.attachToTarget", {
  targetId,
  flatten: true,
})
const call = (method, params) => send(method, params, sessionId)
await call("Runtime.enable")
await call("Page.enable")
await call("Network.enable")

const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? "err")
  }
  return r.result.value
}

const results = []
function check(name, pass, detail = "") {
  results.push({ name, pass, detail })
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`
  )
}

const email = `roundtrip-${Date.now()}@hireloop.dev`
const password = "password1234"

const FILL = (fields) => `(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  };
  ${fields
    .map(([n, v]) => `set(${JSON.stringify(n)}, ${JSON.stringify(v)});`)
    .join("\n  ")}
  form.requestSubmit();
})()`

async function session() {
  await call("Page.navigate", { url: `${BASE}/api/auth/get-session` })
  await sleep(1000)
  return evaluate(`document.body.innerText`)
}

// ---------------------------------------------------------------- sign up
await call("Page.navigate", { url: `${BASE}/sign-up` })
await sleep(1500)
await evaluate(
  FILL([
    ["name", "Round Trip"],
    ["email", email],
    ["password", password],
  ])
)
await evaluate(`document.querySelector('input[name="terms"]').click()`)
await evaluate(`document.querySelector('form').requestSubmit()`)
await sleep(2500)

let sessionText = await session()
check(
  "signed up and session is active",
  sessionText.includes(email),
  sessionText.slice(0, 100)
)

// better-auth's sign-out endpoint is POST-only and requires a JSON body.
const SIGN_OUT = `fetch('/api/auth/sign-out', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
})`

// ---------------------------------------------------------------- sign out
await evaluate(SIGN_OUT)
await sleep(1500)

sessionText = await session()
check(
  "after sign-out there is no session",
  sessionText.trim() === "null" || !sessionText.includes(email),
  sessionText.slice(0, 80)
)

// ---------------------------------------------------------------- sign in
await call("Page.navigate", { url: `${BASE}/sign-in` })
await sleep(1500)
await evaluate(
  FILL([
    ["email", email],
    ["password", password],
  ])
)
await sleep(2500)

sessionText = await session()
check(
  "signed back in with the same credentials",
  sessionText.includes(email),
  sessionText.slice(0, 100)
)

// ---------------------------------------------------------------- wrong password
await evaluate(SIGN_OUT)
await sleep(1200)
await call("Page.navigate", { url: `${BASE}/sign-in` })
await sleep(1400)
await evaluate(
  FILL([
    ["email", email],
    ["password", "wrongpassword"],
  ])
)
await sleep(2200)

const bodyText = await evaluate(`document.body.innerText`)
check(
  "wrong password is rejected",
  /incorrect|invalid|wrong/i.test(bodyText),
  bodyText.match(/[^.]*\b(incorrect|invalid|wrong)\b[^.]*\./i)?.[0] ??
    "no message"
)

sessionText = await session()
check(
  "no session after a failed sign-in",
  sessionText.trim() === "null" || !sessionText.includes(email),
  sessionText.slice(0, 80)
)

console.log("\n" + "=".repeat(60))
const failed = results.filter((r) => !r.pass)
console.log(`${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.log("FAILED:")
  failed.forEach((f) => console.log(`  - ${f.name} ${f.detail}`))
}

ws.close()
chrome.kill()
process.exit(failed.length ? 1 : 0)
