// Drives headless Chrome over the DevTools Protocol to verify the auth forms.
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

const wsUrl = await getWsUrl()
const ws = new WebSocket(wsUrl)
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})

let nextId = 1
const pending = new Map()
const consoleLogs = []

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
    const text = (msg.params.args ?? [])
      .map((a) => a.value ?? a.description ?? "")
      .join(" ")
    consoleLogs.push(text)
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

// Attach to a fresh tab
const { targetId } = await send("Target.createTarget", { url: "about:blank" })
const { sessionId } = await send("Target.attachToTarget", {
  targetId,
  flatten: true,
})

const call = (method, params) => send(method, params, sessionId)

await call("Runtime.enable")
await call("Page.enable")

async function goto(url) {
  await call("Page.navigate", { url })
  await sleep(1400)
}

async function evaluate(expression) {
  const res = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (res.exceptionDetails) {
    throw new Error(
      `Evaluate failed: ${JSON.stringify(res.exceptionDetails.exception?.description ?? res.exceptionDetails)}`
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

// ---------------------------------------------------------------- sign-in
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

// Fill and submit, then read the collected-data panel the form renders.
const signInResult = await evaluate(`(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set('email', 'seeker@hireloop.dev');
  set('password', 'supersecret123');
  form.querySelector('input[name="rememberMe"]').click();
  form.requestSubmit();
  return true;
})()`)
void signInResult

await sleep(700)

const signInPanel = await evaluate(`(() => {
  const panel = [...document.querySelectorAll('div')].find(d =>
    /collected form data/i.test(d.innerText || '')
  );
  if (!panel) return null;
  return panel.innerText.replace(/\\s+/g, ' ').trim();
})()`)

check(
  "sign-in submit renders collected data",
  signInPanel !== null,
  signInPanel ?? "no panel"
)

check(
  "sign-in collected email is correct",
  (signInPanel ?? "").includes("seeker@hireloop.dev"),
  signInPanel ?? ""
)

check(
  "sign-in collected rememberMe is true",
  /rememberMe\\s+true/.test(signInPanel ?? "") ||
    (signInPanel ?? "").includes("rememberMe true"),
  signInPanel ?? ""
)

check(
  "sign-in password is masked in the panel",
  !(signInPanel ?? "").includes("supersecret123"),
  "password leaked" // only reached on failure
)

const loggedSignIn = consoleLogs.find((l) => l.includes("sign-in form data"))
check(
  "sign-in handler logged the payload",
  Boolean(loggedSignIn),
  loggedSignIn ?? "no log"
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

// ---------------------------------------------------------------- sign-up
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

await evaluate(`(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set('name', 'Abdur Rashid');
  set('email', 'recruiter@hireloop.dev');
  set('password', 'anotherpass456');
  form.querySelector('input[name="terms"]').click();
  form.requestSubmit();
  return true;
})()`)

await sleep(700)

const signUpPanel = await evaluate(`(() => {
  const panel = [...document.querySelectorAll('div')].find(d =>
    /collected form data/i.test(d.innerText || '')
  );
  if (!panel) return null;
  return panel.innerText.replace(/\\s+/g, ' ').trim();
})()`)

check(
  "sign-up submit renders collected data",
  signUpPanel !== null,
  signUpPanel ?? ""
)
check(
  "sign-up collected name is correct",
  (signUpPanel ?? "").includes("Abdur Rashid"),
  signUpPanel ?? ""
)
check(
  "sign-up collected terms is true",
  (signUpPanel ?? "").includes("terms true"),
  signUpPanel ?? ""
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
