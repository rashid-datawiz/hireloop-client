// Captures screenshots of the auth pages for visual review.
import { spawn } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const OUT = process.env.OUT_DIR ?? "/tmp/auth-shots"

const profile = mkdtempSync(join(tmpdir(), "chrome-shot-"))
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--remote-debugging-port=9224",
  `--user-data-dir=${profile}`,
  "about:blank",
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const j = await (await fetch("http://127.0.0.1:9224/json/version")).json()
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
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  return r.result.value
}

async function shoot(path, file, { width, height, fill = false }) {
  await call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 500,
  })
  await call("Page.navigate", { url: `${BASE}${path}` })
  await sleep(1600)

  if (fill) {
    await evaluate(`(() => {
      const form = document.querySelector('form');
      const set = (name, value) => {
        const el = form.querySelector('[name="' + name + '"]');
        if (!el) return;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, value);
        el.dispatchEvent(new Event('input',{bubbles:true}));
      };
      set('email','seeker@hireloop.dev');
      set('password','supersecret123');
      if (form.querySelector('[name="name"]')) set('name','Abdur Rashid');
      const cb = form.querySelector('[name="rememberMe"], [name="terms"]');
      if (cb) cb.click();
      form.requestSubmit();
    })()`)
    await sleep(900)
  }

  const { data } = await call("Page.captureScreenshot", { format: "png" })
  writeFileSync(join(OUT, file), Buffer.from(data, "base64"))
  console.log("wrote", join(OUT, file))
}

await shoot("/sign-in", "sign-in.png", { width: 1440, height: 900 })
await shoot("/sign-in", "sign-in-filled.png", {
  width: 1440,
  height: 900,
  fill: true,
})
await shoot("/sign-up", "sign-up.png", { width: 1440, height: 900 })
await shoot("/sign-up", "sign-up-filled.png", {
  width: 1440,
  height: 900,
  fill: true,
})
await shoot("/sign-in", "sign-in-mobile.png", { width: 390, height: 844 })

ws.close()
chrome.kill()
