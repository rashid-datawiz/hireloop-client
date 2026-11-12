// Captures screenshots of the signed-in navbar and the account menu.
import { spawn } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const OUT = process.env.OUT_DIR ?? "/tmp/signout-shots"

const profile = mkdtempSync(join(tmpdir(), "chrome-shot-so-"))
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--remote-debugging-port=9234",
  `--user-data-dir=${profile}`,
  "about:blank",
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const j = await (await fetch("http://127.0.0.1:9234/json/version")).json()
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
    if (m.error) reject(new Error(JSON.stringify(m.error)))
    else resolve(m.result)
  }
}
const send = (method, params = {}, sessionId) => {
  const id = nextId++
  const payload = { id, method, params }
  if (sessionId) payload.sessionId = sessionId
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
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 2,
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

async function shoot(file) {
  const { data } = await call("Page.captureScreenshot", { format: "png" })
  writeFileSync(join(OUT, file), Buffer.from(data, "base64"))
  console.log("wrote", join(OUT, file))
}

const email = "signed.in@hireloop.dev"

// Sign up so the navbar shows the account menu
await call("Page.navigate", { url: `${BASE}/sign-up` })
await sleep(1500)
await evaluate(`(() => {
  const form = document.querySelector('form');
  const set = (name, value) => {
    const el = form.querySelector('[name="' + name + '"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
  };
  set('name','Abdur Rashid');
  set('email','${email}');
  set('password','password1234');
  form.querySelector('input[name="terms"]').click();
  form.requestSubmit();
})()`)
await sleep(2500)

await call("Page.navigate", { url: `${BASE}/` })
await sleep(2500)
await shoot("navbar-signed-in.png")

// Open the account menu with real mouse events
const box = await evaluate(`(() => {
  const el = document.querySelector('[aria-label="Open account menu"]');
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width/2, y: r.y + r.height/2 };
})()`)
await call("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: box.x,
  y: box.y,
})
await call("Input.dispatchMouseEvent", {
  type: "mousePressed",
  x: box.x,
  y: box.y,
  button: "left",
  buttons: 1,
  clickCount: 1,
})
await call("Input.dispatchMouseEvent", {
  type: "mouseReleased",
  x: box.x,
  y: box.y,
  button: "left",
  buttons: 0,
  clickCount: 1,
})
await sleep(1000)
await shoot("account-menu-open.png")

ws.close()
chrome.kill()
