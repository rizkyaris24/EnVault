import { Menu, shell, MenuItemConstructorOptions } from 'electron'

interface MenuDeps {
  openSettings: () => void
  revealLogs: () => void
  isDev: boolean
}

/** Standard macOS-style menu: Edit shortcuts (copy/paste in inputs) and Settings on Cmd+, work everywhere. */
export function installAppMenu({ openSettings, revealLogs, isDev }: MenuDeps): void {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: 'EnVault',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { label: 'Settings...', accelerator: 'CmdOrCtrl+,', click: openSettings },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ] as MenuItemConstructorOptions[])
      : []),
    {
      label: 'File',
      submenu: [
        ...(isMac ? [] : ([{ label: 'Settings...', accelerator: 'CmdOrCtrl+,', click: openSettings }, { type: 'separator' }] as MenuItemConstructorOptions[])),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? ([{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }] as MenuItemConstructorOptions[]) : [])
      ]
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Show Log File', click: revealLogs },
        { label: 'Report an Issue', click: () => void shell.openExternal('https://github.com/rizkyaris24/EnVault/issues') }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
