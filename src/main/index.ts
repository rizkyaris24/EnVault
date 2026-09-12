import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { vaultDB } from './services/db'
import { vaultCrypto } from './services/crypto'
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
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#030607',
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
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Register IPC and Watcher listeners
  fileWatcherService.setMainWindow(mainWindow)
  registerIpcHandlers(mainWindow)

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  try {
    // 1. Initialize SQLite database
    vaultDB.init()

    // 2. Initialize Crypto with Envelope Encryption
    const storedDek = vaultDB.getMeta('encrypted_dek')
    const storedPepper = vaultDB.getMeta('vault_pepper')

    vaultCrypto.initialize(storedDek, storedPepper, (key, value) => {
      vaultDB.setMeta(key, value)
    })

    // 3. Create GUI window
    createWindow()

    // 4. Start background watchers for all registered projects
    fileWatcherService.initAllWatchers()
  } catch (err) {
    console.error('Failed to initialize EnVault core services:', err)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  fileWatcherService.closeAll()
  vaultDB.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  fileWatcherService.closeAll()
  vaultDB.close()
})
