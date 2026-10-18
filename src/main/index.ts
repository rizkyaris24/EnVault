import { app, shell, dialog, session, screen, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'path'
import { vaultDB, VaultCorruptError } from './services/db'
import { vaultCrypto, electronKeyStore } from './services/crypto'
import { fileWatcherService } from './services/watcher'
import { registerIpcHandlers, secretClipboard } from './ipc/handlers'
import { isSameAppPage } from './ipc/validate'
import { getLogger } from './utils/logger'
import { installAppMenu } from './menu'
import { autoUpdater } from 'electron-updater'
import { createUpdater, UpdaterLike } from './updater'
import { IPC_CHANNELS } from '../shared/ipcChannels'
import { loadWindowState, saveWindowState, fitToDisplays, MIN_WIDTH, MIN_HEIGHT } from './utils/windowState'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const stateFile = join(app.getPath('userData'), 'window-state.json')
  const saved = loadWindowState(stateFile)
  const bounds = saved
    ? fitToDisplays(saved, screen.getAllDisplays().map((d) => d.workArea))
    : { width: 1160, height: 760 }

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0B0B0C' : '#FFFFFF',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('https://')) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  let saveTimer: NodeJS.Timeout | null = null
  const persistBounds = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
        saveWindowState(stateFile, mainWindow.getNormalBounds())
      }
    }, 500)
  }
  mainWindow.on('resize', persistBounds)
  mainWindow.on('move', persistBounds)

  mainWindow.on('closed', () => {
    mainWindow = null
    fileWatcherService.setMainWindow(null)
  })
  fileWatcherService.setMainWindow(mainWindow)

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

nativeTheme.on('updated', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#0B0B0C' : '#FFFFFF')
  }
})

/** Runs once the vault key is available: apply retention, then start passive watching. */
function startVaultServices(): void {
  try {
    vaultDB.applyRetention()
  } catch (err) {
    getLogger().error('Version retention failed', err)
  }
  fileWatcherService.initAllWatchers()
}

const updates = createUpdater({
  updater: autoUpdater as unknown as UpdaterLike,
  isPackaged: app.isPackaged,
  // Automatic checks are the only background network use; users can turn them off in Settings.
  enabled: () => vaultDB.getMeta('auto_update') !== '0',
  onStatus: (status) => {
    if (status.state === 'ready' || status.state === 'error') {
      getLogger().info(`Update ${status.state}${status.version ? ' ' + status.version : ''}${status.message ? ': ' + status.message : ''}`)
    }
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.EVENT_UPDATE_STATUS, status)
  }
})

function focusMainWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

process.on('uncaughtException', (err) => getLogger().error('Uncaught exception', err))
process.on('unhandledRejection', (reason) => getLogger().error('Unhandled rejection', reason))

app.on('web-contents-created', (_event, contents) => {
  // The window only ever shows our own page; block any other navigation and all webviews.
  contents.on('will-navigate', (event, url) => {
    if (!isSameAppPage(url, contents.getURL())) event.preventDefault()
  })
  contents.on('will-attach-webview', (event) => event.preventDefault())
})

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', focusMainWindow)
}

if (gotSingleInstanceLock) app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  try {
    vaultDB.init()
    vaultCrypto.initialize(
      {
        get: (k) => vaultDB.getMeta(k),
        set: (k, v) => vaultDB.setMeta(k, v),
        delete: (k) => vaultDB.deleteMeta(k)
      },
      electronKeyStore()
    )
  } catch (err) {
    getLogger().error('Vault failed to open', err)
    const hint =
      err instanceof VaultCorruptError
        ? ''
        : '\n\nYour data has not been changed. If you set a recovery passphrase, restore your keychain access and try again.'
    dialog.showErrorBox('EnVault cannot open your vault', `${(err as Error).message}${hint}`)
    app.quit()
    return
  }

  installAppMenu({
    openSettings: () => {
      if (!mainWindow) createWindow()
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_OPEN_SETTINGS)
    },
    revealLogs: () => {
      const p = getLogger().path
      if (p) shell.showItemInFolder(p)
    },
    isDev: !app.isPackaged
  })

  registerIpcHandlers({
    getWindow: () => mainWindow,
    updates,
    onVaultReady: startVaultServices
  })

  createWindow()
  if (vaultCrypto.isReady()) startVaultServices()
  getLogger().info(`EnVault ${app.getVersion()} started, vault ${vaultCrypto.getState()}`)
  updates.startAutoChecks()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // The DB and watchers stay open on macOS so reopening the window works; before-quit does the cleanup.
  if (process.platform !== 'darwin' || vaultDB.getMeta('quit_on_close') === '1') app.quit()
})

app.on('before-quit', () => {
  updates.stop()
  secretClipboard.flush()
  fileWatcherService.closeAll()
  vaultDB.close()
})
