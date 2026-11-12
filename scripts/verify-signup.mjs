// Drives headless Chrome over the DevTools Protocol to verify the sign-up
// flow against a real better-auth server.
//
// Usage: node scripts/verify-signup.mjs
import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

const profile = mkdtempSync(join(tmpdir(), "chrome-signup-"))
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=9225",
  `--user-data-dir=${profile}`,
  "about:blank",
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9225/json/version")
      const json = await res.json()
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl
    } catch {}
    await sleep(200)
  }
  throw new Error("Chrome did not expose a debugging endpoint")
}

const ws = new WebSocket(await getWsUrl())
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})

let nextId = 1
const pending = new Map()
const consoleLogs = []
const networkCalls = []

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) {
      reject(new Error(JSON.stringify(msg.error)))
    } else {
      resolve(msg.result)
    }
    return
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    consoleLogs.push(
      (msg.params.args ?? [])
        .map((a) => a.value ?? a.description ?? "")
        .join(" ")
    )
  }
  if (
    msg.method === "Network.requestWillBeSent" &&
    msg.params.request.url.includes("/api/auth")
  ) {
    networkCalls.push({
      url: msg.params.request.url,
      method: msg.params.request.method,
      postData: msg.params.request.postData,
    })
  }
  if (
    msg.method === "Network.responseReceived" &&
    msg.params.response.url.includes("/api/auth")
  ) {
    const entry = networkCalls.find(
      (c) => c.url === msg.params.response.url && c.status === undefined
    )
    if (entry) entry.status = msg.params.response.status
  }
}

function send(method, params = {}, sessionId) {
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

async function evaluate(expression) {
  const res = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (res.exceptionDetails) {
    throw new Error(
      res.exceptionDetails.exception?.description ??
        JSON.stringify(res.exceptionDetails)
    )
  }
  return res.result.value
}

const results = []
function check(name, pass, detail = "") {
  results.push({ name, pass, detail })
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`
  )
}

const uniqueEmail = `browser-${Date.now()}@hireloop.dev`

// ---------------------------------------------------------------- sign-up page
await call("Page.navigate", { url: `${BASE}/sign-up` })
await sleep(1500)

check(
  "sign-up page loads",
  (await evaluate("document.title")) === "Sign Up | Hireloop",
  await evaluate("document.title")
)

check(
  "no 'Collected form data' debug panel remains",
  !(await evaluate(`/collected form data/i.test(document.body.innerText)`))
)

// ---------------------------------------------------------------- client-side validation
await evaluate(`(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  };
  set('name','Browser Tester');
  set('email','${uniqueEmail}');
  set('password','short');
  form.requestSubmit();
})()`)
await sleep(500)

check(
  "short password is rejected client-side",
  await evaluate(
    `/Password must be at least 8 characters/i.test(document.body.innerText)`
  ),
  await evaluate(
    `document.body.innerText.replace(/\\s+/g,' ').match(/Password[^.]*\./)?.[0] ?? 'no message'`
  )
)

check(
  "no auth request sent for invalid input",
  networkCalls.length === 0,
  `${networkCalls.length} calls`
)

// ---------------------------------------------------------------- real sign-up
networkCalls.length = 0
await evaluate(`(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  };
  set('name','Browser Tester');
  set('email','${uniqueEmail}');
  set('password','password1234');
  form.querySelector('input[name="terms"]').click();
  form.requestSubmit();
})()`)
await sleep(2500)

const signUpCall = networkCalls.find((c) => c.url.includes("/sign-up/email"))

check(
  "sign-up request was sent to better-auth",
  Boolean(signUpCall),
  signUpCall?.url ?? "none"
)
check(
  "sign-up request used POST",
  signUpCall?.method === "POST",
  signUpCall?.method ?? ""
)
check(
  "sign-up request sent name/email/password",
  (() => {
    if (!signUpCall?.postData) return false
    try {
      const body = JSON.parse(signUpCall.postData)
      return (
        body.name === "Browser Tester" &&
        body.email === uniqueEmail &&
        body.password === "password1234"
      )
    } catch {
      return false
    }
  })(),
  signUpCall?.postData ?? ""
)
check(
  "sign-up request succeeded (2xx)",
  signUpCall?.status >= 200 && signUpCall?.status < 300,
  String(signUpCall?.status)
)

// The session cookie is HttpOnly, so it is invisible to `document.cookie`.
// Read it from the browser's cookie store instead.
const { cookies } = await call("Network.getCookies", {
  urls: [BASE],
})
const sessionCookie = cookies.find((c) =>
  c.name.includes("better-auth.session_token")
)
check(
  "session cookie was set (HttpOnly)",
  Boolean(sessionCookie),
  sessionCookie
    ? `${sessionCookie.name} httpOnly=${sessionCookie.httpOnly}`
    : "no cookie"
)

// ---------------------------------------------------------------- duplicate email
networkCalls.length = 0
await call("Page.navigate", { url: `${BASE}/sign-up` })
await sleep(1400)
await evaluate(`(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  };
  set('name','Duplicate Tester');
  set('email','${uniqueEmail}');
  set('password','password1234');
  form.querySelector('input[name="terms"]').click();
  form.requestSubmit();
})()`)
await sleep(2500)

const dupCall = networkCalls.find((c) => c.url.includes("/sign-up/email"))
check(
  "duplicate email returns 422",
  dupCall?.status === 422,
  String(dupCall?.status)
)

const dupMessage = await evaluate(
  `document.body.innerText.match(/already exists[^.]*\\./i)?.[0] ?? ''`
)
check(
  "duplicate email shows a friendly message",
  /already exists/i.test(dupMessage),
  dupMessage
)

// ---------------------------------------------------------------- session works
await call("Page.navigate", { url: `${BASE}/api/auth/get-session` })
await sleep(1200)
const sessionText = await evaluate(`document.body.innerText`)
check(
  "session endpoint returns the signed-up user",
  sessionText.includes(uniqueEmail),
  sessionText.slice(0, 120)
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
