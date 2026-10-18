export const IPC_CHANNELS = {
  // Dialogs
  DIALOG_SELECT_DIRECTORY: 'dialog:selectDirectory',

  // Projects
  PROJECTS_LIST: 'projects:list',
  PROJECTS_SCAN: 'projects:scan',
  PROJECTS_SCAN_COMPUTER: 'projects:scanComputer',
  PROJECTS_ADD: 'projects:add',
  PROJECTS_REMOVE: 'projects:remove',
  PROJECTS_RENAME: 'projects:rename',
  PROJECTS_REVEAL: 'projects:reveal',

  // Env Files & Versions
  FILES_GET_BY_PROJECT: 'files:getByProject',
  FILES_GET_VERSIONS: 'files:getVersions',
  FILES_GET_DECRYPTED: 'files:getDecrypted',
  FILES_GET_DIFF: 'files:getDiff',
  FILES_RESTORE: 'files:restore',
  FILES_BACKUP_NOW: 'files:backupNow',

  // Security & Vault
  SECURITY_GET_STATUS: 'security:getStatus',
  SECURITY_GET_REUSE: 'security:getReuse',
  VAULT_UNLOCK: 'vault:unlock',
  VAULT_SET_PASSPHRASE: 'vault:setPassphrase',

  // App, settings and vault transfer
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  APP_GET_INFO: 'app:getInfo',
  APP_REVEAL: 'app:reveal',
  APP_DIAGNOSTICS: 'app:diagnostics',
  VAULT_EXPORT: 'vault:export',
  VAULT_IMPORT: 'vault:import',

  // Updates
  UPDATE_GET_STATUS: 'update:getStatus',
  UPDATE_CHECK: 'update:check',
  UPDATE_INSTALL: 'update:install',

  // Clipboard
  CLIPBOARD_COPY_SECRET: 'clipboard:copySecret',

  // System & Theme
  THEME_SET: 'theme:set',

  // Events (Main -> Renderer)
  EVENT_BACKUP_UPDATED: 'event:backupUpdated',
  EVENT_FILE_STATUS_CHANGED: 'event:fileStatusChanged',
  EVENT_SCAN_PROGRESS: 'event:scanProgress',
  EVENT_OPEN_SETTINGS: 'event:openSettings',
  EVENT_UPDATE_STATUS: 'event:updateStatus'
} as const
