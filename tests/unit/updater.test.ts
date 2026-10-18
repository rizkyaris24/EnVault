import { describe, it, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import { createUpdater, UpdateStatus } from '../../src/main/updater'

function fake() {
  const u: any = new EventEmitter()
  u.autoDownload = false
  u.autoInstallOnAppQuit = false
  u.checkForUpdates = vi.fn().mockResolvedValue(null)
  u.quitAndInstall = vi.fn()
  return u
}

describe('createUpdater', () => {
  afterEach(() => vi.useRealTimers())

  function setup(opts: { isPackaged?: boolean; enabled?: boolean } = {}) {
    const updater = fake()
    const seen: UpdateStatus[] = []
    const u = createUpdater({
      updater,
      isPackaged: opts.isPackaged ?? true,
      enabled: () => opts.enabled ?? true,
      onStatus: (s) => seen.push(s)
    })
    return { updater, seen, u }
  }

  it('never touches the network in a development build', async () => {
    const { updater, u } = setup({ isPackaged: false })
    await u.checkNow()
    u.startAutoChecks()
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
    expect(u.getStatus().state).toBe('disabled')
  })

  it('downloads automatically, installs on quit, and reports each stage', async () => {
    const { updater, seen, u } = setup()
    expect(updater.autoDownload).toBe(true)
    expect(updater.autoInstallOnAppQuit).toBe(true)

    await u.checkNow()
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    updater.emit('update-available', { version: '1.2.0' })
    updater.emit('update-downloaded', { version: '1.2.0' })

    expect(seen.map((s) => s.state)).toEqual(['checking', 'downloading', 'ready'])
    expect(u.getStatus()).toEqual({ state: 'ready', version: '1.2.0' })
  })

  it('reports up to date', async () => {
    const { updater, u } = setup()
    await u.checkNow()
    updater.emit('update-not-available', { version: '1.0.0' })
    expect(u.getStatus().state).toBe('none')
  })

  it('turns failures into a short one-line message', async () => {
    const { updater, u } = setup()
    updater.checkForUpdates.mockRejectedValueOnce(new Error('net::ERR_INTERNET_DISCONNECTED\nstack...'))
    await u.checkNow()
    const s = u.getStatus()
    expect(s.state).toBe('error')
    expect(s.message).toBe('net::ERR_INTERNET_DISCONNECTED stack...')
    updater.emit('error', new Error('boom'))
    expect(u.getStatus().message).toBe('boom')
  })

  it('reports an error once when electron-updater both emits it and rejects', async () => {
    const { updater, seen, u } = setup()
    updater.checkForUpdates.mockImplementationOnce(async () => {
      const err = new Error('feed unreachable')
      updater.emit('error', err)
      throw err
    })
    await u.checkNow()
    expect(seen.filter((s) => s.state === 'error')).toHaveLength(1)
  })

  it('only installs when an update is ready', async () => {
    const { updater, u } = setup()
    u.install()
    expect(updater.quitAndInstall).not.toHaveBeenCalled()
    updater.emit('update-downloaded', { version: '2.0.0' })
    u.install()
    expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('checks shortly after launch and every 6 hours, but only while automatic checks are on', async () => {
    vi.useFakeTimers()
    let enabled = true
    const updater = fake()
    const u = createUpdater({ updater, isPackaged: true, enabled: () => enabled, onStatus: () => {} })
    u.startAutoChecks()
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    enabled = false
    await vi.advanceTimersByTimeAsync(6 * 3600_000)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    enabled = true
    await vi.advanceTimersByTimeAsync(6 * 3600_000)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
    u.stop()
    await vi.advanceTimersByTimeAsync(12 * 3600_000)
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2)
  })

  it('manual checks work even when automatic checks are off', async () => {
    const { updater, u } = setup({ enabled: false })
    await u.checkNow()
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
  })
})
