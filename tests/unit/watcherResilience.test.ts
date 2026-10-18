import { describe, it, expect, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { FileWatcherService } from '../../src/main/services/watcher'

describe('FileWatcherService resilience', () => {
  let svc: FileWatcherService
  let base: string

  afterEach(() => {
    svc?.closeAll()
    vi.useRealTimers()
    if (base) fs.rmSync(base, { recursive: true, force: true })
  })

  it('retries a project folder that is missing at launch and starts watching once it appears', () => {
    vi.useFakeTimers()
    svc = new FileWatcherService()
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-watch-'))
    const dir = path.join(base, 'late-project')

    svc.watchProject('p1', dir)
    expect((svc as any).watchers.has('p1')).toBe(false)

    fs.mkdirSync(dir)
    vi.advanceTimersByTime(30_000)
    expect((svc as any).watchers.has('p1')).toBe(true)
    expect((svc as any).pendingProjects.size).toBe(0)
  })

  it('stops retrying a project once it is unwatched', () => {
    vi.useFakeTimers()
    svc = new FileWatcherService()
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-watch-'))
    const dir = path.join(base, 'gone')

    svc.watchProject('p2', dir)
    svc.unwatchProject('p2')
    fs.mkdirSync(dir)
    vi.advanceTimersByTime(60_000)
    expect((svc as any).watchers.has('p2')).toBe(false)
  })

  it('survives a watcher error without throwing and queues a retry', () => {
    svc = new FileWatcherService()
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-watch-'))
    svc.watchProject('p3', base)
    const watcher = (svc as any).watchers.get('p3')
    expect(() => watcher.emit('error', new Error('EMFILE'))).not.toThrow()
    expect((svc as any).watchers.has('p3')).toBe(false)
    expect((svc as any).pendingProjects.has('p3')).toBe(true)
  })
})
