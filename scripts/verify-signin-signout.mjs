// Drives headless Chrome to verify sign-in and sign-out through the real UI:
// the navbar user menu, the session cookie, and the redirected state.
//
// Usage: node scripts/verify-signin-signout.mjs
import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

const profile = mkdtempSync(join(tmpdir(), "chrome-signin-"))
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=9228",
  `--user-data-dir=${profile}`,
  "about:blank",
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const j = await (await fetch("http://127.0.0.1:9228/json/version")).json()
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
const authCalls = []

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
  if (
    msg.method === "Network.requestWillBeSent" &&
    msg.params.request.url.includes("/api/auth")
  ) {
    authCalls.push({
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
    const entry = authCalls.find(
      (c) => c.url === msg.params.response.url && c.status === undefined
    )
    if (entry) entry.status = msg.params.response.status
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

// The desktop navbar links are `hidden` below the `md` breakpoint, so pin a
// wide viewport to assert against them.
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
})

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

const email = `signin-ui-${Date.now()}@hireloop.dev`
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

async function cookies() {
  const { cookies: list } = await call("Network.getCookies", { urls: [BASE] })
  return list
}

async function sessionUser() {
  await call("Page.navigate", { url: `${BASE}/api/auth/get-session` })
  await sleep(1000)
  return evaluate(`document.body.innerText`)
}

// ---------------------------------------------------------------- sign up first
await call("Page.navigate", { url: `${BASE}/sign-up` })
await sleep(1500)
await evaluate(
  FILL([
    ["name", "Sign In Tester"],
    ["email", email],
    ["password", password],
  ])
)
await evaluate(`document.querySelector('input[name="terms"]').click()`)
await evaluate(`document.querySelector('form').requestSubmit()`)
await sleep(2500)

let sessionText = await sessionUser()
check(
  "account created and signed in",
  sessionText.includes(email),
  sessionText.slice(0, 80)
)

// ---------------------------------------------------------------- navbar shows the user
await call("Page.navigate", { url: `${BASE}/` })
await sleep(2000)

const navText = await evaluate(`document.body.innerText`)
check(
  "navbar shows the account menu instead of Get Started",
  !navText.includes("Get Started"),
  navText.includes("Get Started")
    ? "still shows Get Started"
    : "signed-in state"
)
const triggerVisible = await evaluate(`(() => {
  const btn = document.querySelector('[aria-label="Open account menu"]');
  if (!btn) return 'missing';
  const r = btn.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? 'visible' : 'hidden';
})()`)
check(
  "account menu trigger is rendered",
  triggerVisible === "visible",
  String(triggerVisible)
)

// ---------------------------------------------------------------- open the menu
// base-ui's menu trigger toggles on mousedown, so dispatch a full pointer
// sequence the way a real mouse would.
await evaluate(`(() => {
  const el = document.querySelector('[aria-label="Open account menu"]');
  if (!el) return;
  const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerType: 'mouse', isPrimary: true }));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerType: 'mouse', isPrimary: true }));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
})()`)
await sleep(900)

const menuText = await evaluate(`document.body.innerText`)
check(
  "menu lists the signed-in email",
  menuText.includes(email),
  menuText.includes(email) ? email : "email not shown"
)
check(
  "menu has a sign out action",
  /sign out/i.test(menuText),
  /sign out/i.test(menuText) ? "present" : "missing"
)

const itemCount = await evaluate(
  `document.querySelectorAll('[data-slot="dropdown-menu-item"]').length`
)
check("menu rendered its items", itemCount > 0, `${itemCount} items`)

// ---------------------------------------------------------------- sign out
authCalls.length = 0
await evaluate(`(() => {
  const items = [...document.querySelectorAll('[data-slot="dropdown-menu-item"]')];
  const item = items.find(el => /sign out/i.test(el.textContent));
  if (!item) return;
  const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
  item.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerType: 'mouse', isPrimary: true }));
  item.dispatchEvent(new MouseEvent('mousedown', opts));
  item.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerType: 'mouse', isPrimary: true }));
  item.dispatchEvent(new MouseEvent('mouseup', opts));
  item.dispatchEvent(new MouseEvent('click', opts));
})()`)
await sleep(2500)

const signOutCall = authCalls.find((c) => c.url.includes("/sign-out"))
check(
  "sign-out request was sent",
  Boolean(signOutCall),
  signOutCall ? `${signOutCall.method} ${signOutCall.url}` : "none"
)
check(
  "sign-out used POST",
  signOutCall?.method === "POST",
  signOutCall?.method ?? ""
)
check(
  "sign-out succeeded",
  signOutCall?.status >= 200 && signOutCall?.status < 300,
  String(signOutCall?.status)
)

const afterCookies = await cookies()
const sessionCookie = afterCookies.find((c) =>
  c.name.includes("better-auth.session_token")
)
check(
  "session cookie was cleared",
  !sessionCookie,
  sessionCookie ? sessionCookie.name : "gone"
)

sessionText = await sessionUser()
check(
  "no active session after sign out",
  sessionText.trim() === "null" || !sessionText.includes(email),
  sessionText.slice(0, 80)
)

// ---------------------------------------------------------------- navbar back to signed-out
await call("Page.navigate", { url: `${BASE}/` })
await sleep(2000)
const signedOutLinks = await evaluate(`JSON.stringify(
  [...document.querySelectorAll('header a[href="/sign-in"], header a[href="/sign-up"]')]
    .map(a => a.getAttribute('href'))
)`)
check(
  "navbar shows Sign In / Get Started again",
  signedOutLinks.includes("/sign-in") && signedOutLinks.includes("/sign-up"),
  signedOutLinks
)

// ---------------------------------------------------------------- sign in through the UI
authCalls.length = 0
await call("Page.navigate", { url: `${BASE}/sign-in` })
await sleep(1500)
await evaluate(
  FILL([
    ["email", email],
    ["password", password],
  ])
)
await sleep(2500)

const signInCall = authCalls.find((c) => c.url.includes("/sign-in/email"))
check(
  "sign-in request was sent",
  Boolean(signInCall),
  signInCall?.url ?? "none"
)
check(
  "sign-in sends email, password and rememberMe",
  (() => {
    if (!signInCall?.postData) return false
    try {
      const body = JSON.parse(signInCall.postData)
      return (
        body.email === email &&
        body.password === password &&
        typeof body.rememberMe === "boolean"
      )
    } catch {
      return false
    }
  })(),
  signInCall?.postData ?? ""
)
check(
  "sign-in sends a callbackURL",
  (() => {
    if (!signInCall?.postData) return false
    try {
      return JSON.parse(signInCall.postData).callbackURL !== undefined
    } catch {
      return false
    }
  })(),
  signInCall?.postData ?? ""
)

sessionText = await sessionUser()
check(
  "signed in through the UI",
  sessionText.includes(email),
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
