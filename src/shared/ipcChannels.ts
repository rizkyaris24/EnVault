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

  // Events (Main -> Renderer)
  EVENT_BACKUP_UPDATED: 'event:backupUpdated',
  EVENT_FILE_STATUS_CHANGED: 'event:fileStatusChanged',
  EVENT_SCAN_PROGRESS: 'event:scanProgress'
} as const
