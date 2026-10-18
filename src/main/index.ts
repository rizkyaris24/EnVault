import { app, shell, dialog, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'path'
import { vaultDB, VaultCorruptError } from './services/db'
import { vaultCrypto, electronKeyStore } from './services/crypto'
import { fileWatcherService } from './services/watcher'
import { registerIpcHandlers } from './ipc/handlers'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 760,
    minWidth: 860,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0B0B0C' : '#FFFFFF',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
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
    vaultDB.pruneAllVersions()
  } catch (err) {
    console.error('Version retention failed:', err)
  }
  fileWatcherService.initAllWatchers()
}

app.whenReady().then(() => {
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
    const hint =
      err instanceof VaultCorruptError
        ? ''
        : '\n\nYour data has not been changed. If you set a recovery passphrase, restore your keychain access and try again.'
    dialog.showErrorBox('EnVault cannot open your vault', `${(err as Error).message}${hint}`)
    app.quit()
    return
  }

  registerIpcHandlers({
    getWindow: () => mainWindow,
    onVaultReady: startVaultServices
  })

  createWindow()
  if (vaultCrypto.isReady()) startVaultServices()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // The DB and watchers stay open on macOS so reopening the window works; before-quit does the cleanup.
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  fileWatcherService.closeAll()
  vaultDB.close()
})
