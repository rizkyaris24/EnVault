import { describe, it, expect, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createLogger } from '../../src/main/utils/logger'
import { createClipboardGuard } from '../../src/main/utils/clipboardGuard'
import { isSameAppPage } from '../../src/main/ipc/validate'

describe('logger', () => {
  let dir: string
  afterEach(() => dir && fs.rmSync(dir, { recursive: true, force: true }))

  it('appends one sanitized line per entry with only the error message', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-log-'))
    const log = createLogger(dir)
    const err = new Error('disk full\nSECOND LINE')
    err.stack = 'Error: disk full\n    at /Users/me/secret-path/file.ts:1:1'
    log.error('backup failed\ninjected', err)
    const text = fs.readFileSync(log.path, 'utf8')
    expect(text.trim().split('\n')).toHaveLength(1)
    expect(text).toMatch(/ERROR backup failed injected \| disk full SECOND LINE$/m)
    expect(text).not.toContain('secret-path')
  })

  it('rotates when the file grows past the limit and keeps a bounded number of files', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-log-'))
    const log = createLogger(dir, { maxBytes: 200, keep: 2 })
    for (let i = 0; i < 40; i++) log.info(`line number ${i} with some padding to grow the file`)
    const files = fs.readdirSync(dir).sort()
    expect(files).toEqual(['envault.log', 'envault.log.1', 'envault.log.2'])
    expect(log.readTail(1_000_000)).toContain('line number 39')
  })

  it('truncates very long messages', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-log-'))
    const log = createLogger(dir)
    log.warn('x'.repeat(5000))
    expect(fs.readFileSync(log.path, 'utf8').length).toBeLessThan(700)
  })
})

describe('clipboard guard', () => {
  afterEach(() => vi.useRealTimers())

  /** Sync clipboard (as older Electron) or Promise-based (Electron 44+). */
  function fakeClipboard(asyncApi = false) {
    let value = ''
    const wrap = <T,>(v: T): T | Promise<T> => (asyncApi ? Promise.resolve(v) : v)
    return {
      readText: () => wrap(value),
      writeText: (t: string) => {
        value = t
        return wrap(undefined as void)
      },
      get value() {
        return value
      }
    }
  }

  for (const asyncApi of [false, true]) {
    describe(asyncApi ? 'with the Promise-based Electron 44 API' : 'with a synchronous API', () => {
      it('clears a copied secret after the timeout if it is still on the clipboard', async () => {
        vi.useFakeTimers()
        const cb = fakeClipboard(asyncApi)
        const guard = createClipboardGuard(cb, 30_000)
        await guard.copySecret('s3cret')
        expect(cb.value).toBe('s3cret')
        await vi.advanceTimersByTimeAsync(29_999)
        expect(cb.value).toBe('s3cret')
        await vi.advanceTimersByTimeAsync(2)
        expect(cb.value).toBe('')
      })

      it('does not clear something the user copied afterwards', async () => {
        vi.useFakeTimers()
        const cb = fakeClipboard(asyncApi)
        const guard = createClipboardGuard(cb, 30_000)
        await guard.copySecret('s3cret')
        await cb.writeText('something else')
        await vi.advanceTimersByTimeAsync(31_000)
        expect(cb.value).toBe('something else')
      })

      it('flush clears a pending secret immediately but leaves other content alone', async () => {
        vi.useFakeTimers()
        const cb = fakeClipboard(asyncApi)
        const guard = createClipboardGuard(cb, 30_000)
        await guard.copySecret('s3cret')
        expect(guard.hasPending()).toBe(true)
        await guard.flush()
        expect(cb.value).toBe('')
        expect(guard.hasPending()).toBe(false)
        await cb.writeText('unrelated')
        await guard.flush()
        expect(cb.value).toBe('unrelated')
      })

      it('restarts the countdown on a new copy', async () => {
        vi.useFakeTimers()
        const cb = fakeClipboard(asyncApi)
        const guard = createClipboardGuard(cb, 30_000)
        await guard.copySecret('one')
        await vi.advanceTimersByTimeAsync(20_000)
        await guard.copySecret('two')
        await vi.advanceTimersByTimeAsync(20_000)
        expect(cb.value).toBe('two')
        await vi.advanceTimersByTimeAsync(11_000)
        expect(cb.value).toBe('')
      })
    })
  }
})

describe('isSameAppPage', () => {
  it('allows reloading the same page (hash/query changes) only', () => {
    const page = 'file:///App/out/renderer/index.html'
    expect(isSameAppPage(page, page)).toBe(true)
    expect(isSameAppPage(`${page}#/x`, page)).toBe(true)
    expect(isSameAppPage('file:///etc/passwd', page)).toBe(false)
    expect(isSameAppPage('https://evil.example/', page)).toBe(false)
    expect(isSameAppPage('http://localhost:5173/#a', 'http://localhost:5173/')).toBe(true)
    expect(isSameAppPage('http://localhost:5173/other', 'http://localhost:5173/')).toBe(false)
    expect(isSameAppPage('not a url', page)).toBe(false)
  })
})
