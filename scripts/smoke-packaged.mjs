#!/usr/bin/env node
// Launches the packaged .app on a throwaway profile and checks it actually works (native module, preload, IPC).
// usage: node scripts/smoke-packaged.mjs [path/to/EnVault.app]
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const candidates = [process.argv[2], join(root, 'release/mac-arm64/EnVault.app'), join(root, 'release/mac/EnVault.app')].filter(Boolean)
const app = candidates.find((p) => existsSync(p))
if (!app) {
  console.error('No packaged app found. Run `npm run pack` first.')
  process.exit(2)
}

const profile = mkdtempSync(join(tmpdir(), 'envault-smoke-'))
const port = 9400 + Math.floor(Math.random() * 400)
const child = spawn(join(app, 'Contents/MacOS/EnVault'), [`--user-data-dir=${profile}`, `--remote-debugging-port=${port}`], { stdio: 'ignore' })
let failed = false
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`)
  if (!ok) failed = true
}

async function waitForPage() {
  for (let i = 0; i < 60; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      const page = pages.find((p) => p.type === 'page' && p.url.startsWith('file://'))
      if (page) return page
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

async function evaluate(wsUrl, expression) {
  const ws = new WebSocket(wsUrl)
  await new Promise((r) => (ws.onopen = r))
  const result = await new Promise((resolve) => {
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data)
      if (d.id === 1) resolve(d.result?.result?.value)
    }
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
  })
  ws.close()
  return result
}

try {
  const page = await waitForPage()
  check(!!page, 'window loaded from the packaged app')
  if (page) {
    // The window can appear a moment before the preload bridge and IPC answer, so retry until the app responds.
    const probe = `(async () => {
      if (!window.envaultApi) return null
      const s = await window.envaultApi.security.getStatus()
      if (!s.success) return null
      const i = await window.envaultApi.app.getInfo()
      return { state: s.data?.state, keySource: s.data?.keySource, version: i.data?.version,
               noNode: typeof require === 'undefined' && typeof process === 'undefined' }
    })()`
    let r = null
    for (let i = 0; i < 30 && !r; i++) {
      r = await evaluate(page.webSocketDebuggerUrl, probe).catch(() => null)
      if (!r) await new Promise((res) => setTimeout(res, 1000))
    }
    check(r?.state === 'ready', `vault opens (state: ${r?.state}, key: ${r?.keySource})`)
    check(r?.version === pkg.version, `version matches package.json (${r?.version})`)
    check(r?.noNode === true, 'renderer has no Node access')
  }
} finally {
  child.kill('SIGTERM')
  await new Promise((r) => setTimeout(r, 1500))
  rmSync(profile, { recursive: true, force: true })
}
process.exit(failed ? 1 : 0)
