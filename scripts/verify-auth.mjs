// Drives headless Chrome over the DevTools Protocol to verify the auth pages.
//
// Usage: node scripts/verify-auth.mjs
import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

const profile = mkdtempSync(join(tmpdir(), "chrome-auth-"))
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=9222",
  `--user-data-dir=${profile}`,
  "about:blank",
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version")
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
      status: undefined,
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

async function goto(url) {
  await call("Page.navigate", { url })
  await sleep(1400)
}

const FILL = (fields) => `(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  };
  ${fields
    .map(([n, v]) => `set(${JSON.stringify(n)}, ${JSON.stringify(v)});`)
    .join("\n  ")}
  form.requestSubmit();
})()`

// ---------------------------------------------------------------- sign-in page
await goto(`${BASE}/sign-in`)

check(
  "sign-in page title",
  (await evaluate("document.title")) === "Sign In | Hireloop",
  await evaluate("document.title")
)

check(
  "sign-in toggle marks Sign In active",
  (await evaluate(
    `document.querySelector('nav[aria-label="Authentication mode"] a[aria-current="page"]')?.textContent?.trim()`
  )) === "Sign In"
)

check(
  "sign-in form has email + password + rememberMe",
  await evaluate(`(() => {
    const f = document.querySelector('form');
    if (!f) return false;
    const names = [...f.querySelectorAll('input')].map(i => i.name);
    return names.includes('email') && names.includes('password') && names.includes('rememberMe');
  })()`)
)

check(
  "no 'Collected form data' debug panel remains",
  !(await evaluate(`/collected form data/i.test(document.body.innerText)`))
)

// ---------------------------------------------------------------- password toggle
await goto(`${BASE}/sign-in`)
const toggled = await evaluate(`(async () => {
  const input = document.querySelector('input[name="password"]');
  const before = input.type;
  const btn = [...document.querySelectorAll('button')].find(b =>
    (b.getAttribute('aria-label') || '').startsWith('Show Password')
  );
  if (!btn) return 'no-button';
  btn.click();
  await new Promise(r => setTimeout(r, 300));
  return before + '->' + input.type;
})()`)
check(
  "password reveal toggles input type",
  toggled === "password->text",
  String(toggled)
)

// ---------------------------------------------------------------- sign-in validation
networkCalls.length = 0
await goto(`${BASE}/sign-in`)
await evaluate(
  FILL([
    ["email", ""],
    ["password", ""],
  ])
)
await sleep(500)

check(
  "empty sign-in shows field validation",
  await evaluate(`/Enter your email address/i.test(document.body.innerText)`),
  await evaluate(
    `document.body.innerText.match(/Enter your [^.]*\\./)?.[0] ?? 'no message'`
  )
)
check(
  "no auth request sent for empty sign-in",
  networkCalls.length === 0,
  `${networkCalls.length} calls`
)

// ---------------------------------------------------------------- wrong password
const email = `signin-${Date.now()}@hireloop.dev`
networkCalls.length = 0
await goto(`${BASE}/sign-in`)
await evaluate(
  FILL([
    ["email", email],
    ["password", "password1234"],
  ])
)
await sleep(2500)

const signInCall = networkCalls.find((c) => c.url.includes("/sign-in/email"))
check(
  "sign-in request was sent to better-auth",
  Boolean(signInCall),
  signInCall?.url ?? "none"
)
check(
  "sign-in request sends email + password",
  (() => {
    if (!signInCall?.postData) return false
    try {
      const body = JSON.parse(signInCall.postData)
      return body.email === email && body.password === "password1234"
    } catch {
      return false
    }
  })(),
  signInCall?.postData ?? ""
)
check(
  "sign-in with unknown account shows an error",
  await evaluate(
    `/incorrect|not found|no account|wrong/i.test(document.body.innerText)`
  ),
  await evaluate(
    `document.body.innerText.match(/[^.]*\\b(incorrect|not found|no account)[^.]*\\./i)?.[0] ?? 'no message'`
  )
)

// ---------------------------------------------------------------- sign-up page
await goto(`${BASE}/sign-up`)

check(
  "sign-up page title",
  (await evaluate("document.title")) === "Sign Up | Hireloop",
  await evaluate("document.title")
)

check(
  "sign-up toggle marks Sign Up active",
  (await evaluate(
    `document.querySelector('nav[aria-label="Authentication mode"] a[aria-current="page"]')?.textContent?.trim()`
  )) === "Sign Up"
)

check(
  "sign-up form has name + email + password + terms",
  await evaluate(`(() => {
    const f = document.querySelector('form');
    if (!f) return false;
    const names = [...f.querySelectorAll('input')].map(i => i.name);
    return ['name','email','password','terms'].every(n => names.includes(n));
  })()`)
)

// ---------------------------------------------------------------- toggle navigation
await goto(`${BASE}/sign-in`)
const nav = await evaluate(`(async () => {
  const tab = [...document.querySelectorAll('nav[aria-label="Authentication mode"] a')].find(a =>
    a.textContent.trim() === 'Sign Up'
  );
  if (!tab) return 'no-tab';
  tab.click();
  await new Promise(r => setTimeout(r, 900));
  return location.pathname;
})()`)
check("toggle navigates to /sign-up", nav === "/sign-up", String(nav))

const backNav = await evaluate(`(async () => {
  const tab = [...document.querySelectorAll('nav[aria-label="Authentication mode"] a')].find(a =>
    a.textContent.trim() === 'Sign In'
  );
  if (!tab) return 'no-tab';
  tab.click();
  await new Promise(r => setTimeout(r, 900));
  return location.pathname;
})()`)
check(
  "toggle navigates back to /sign-in",
  backNav === "/sign-in",
  String(backNav)
)

// ---------------------------------------------------------------- console errors
const errors = consoleLogs.filter(
  (l) => l.startsWith("ERROR") || l.includes("Uncaught")
)
check(
  "no console errors on auth pages",
  errors.length === 0,
  errors.join(" | ")
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
