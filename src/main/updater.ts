import type { EventEmitter } from 'events'
import type { UpdateStatus } from '../shared/types'

export type { UpdateStatus }

/** The slice of electron-updater's autoUpdater we use (so it can be faked in tests). */
export interface UpdaterLike extends EventEmitter {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  checkForUpdates(): Promise<unknown>
  quitAndInstall(): void
}

interface Deps {
  updater: UpdaterLike
  isPackaged: boolean
  /** Whether automatic background checks are on (the only background network use in the app). */
  enabled: () => boolean
  onStatus: (status: UpdateStatus) => void
}

const FIRST_CHECK_DELAY_MS = 10_000
const CHECK_INTERVAL_MS = 6 * 3600_000

const oneLine = (err: unknown): string =>
  (err instanceof Error ? err.message : String(err)).replace(/\s*[\r\n]+\s*/g, ' ').slice(0, 200)

export function createUpdater({ updater, isPackaged, enabled, onStatus }: Deps) {
  let status: UpdateStatus = isPackaged
    ? { state: 'idle' }
    : { state: 'disabled', message: 'Updates are turned off in development builds.' }
  let first: ReturnType<typeof setTimeout> | null = null
  let every: ReturnType<typeof setInterval> | null = null

  const set = (next: UpdateStatus): void => {
    status = next
    onStatus(status)
  }

  if (isPackaged) {
    updater.autoDownload = true
    updater.autoInstallOnAppQuit = true
    updater.on('update-available', (info: { version: string }) => set({ state: 'downloading', version: info.version }))
    updater.on('update-not-available', () => set({ state: 'none' }))
    updater.on('update-downloaded', (info: { version: string }) => set({ state: 'ready', version: info.version }))
    updater.on('error', (err: unknown) => set({ state: 'error', message: oneLine(err) }))
  }

  const check = async (): Promise<void> => {
    if (!isPackaged) return
    set({ state: 'checking' })
    try {
      await updater.checkForUpdates()
    } catch (err) {
      // electron-updater usually emits 'error' as well as rejecting; report it once.
      if (status.state !== 'error') set({ state: 'error', message: oneLine(err) })
    }
  }

  return {
    getStatus: (): UpdateStatus => status,
    checkNow: check,
    install(): void {
      if (status.state === 'ready') updater.quitAndInstall()
    },
    startAutoChecks(): void {
      if (!isPackaged) return
      const tick = (): void => {
        if (enabled()) void check()
      }
      first = setTimeout(tick, FIRST_CHECK_DELAY_MS)
      every = setInterval(tick, CHECK_INTERVAL_MS)
      first.unref?.()
      every.unref?.()
    },
    stop(): void {
      if (first) clearTimeout(first)
      if (every) clearInterval(every)
      first = every = null
    }
  }
}
