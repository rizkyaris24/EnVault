export interface DiagnosticsInput {
  appVersion: string
  electron: string
  chrome: string
  platform: string
  arch: string
  osRelease: string
  vaultState: string
  keySource: string
  hasRecovery: boolean
  schemaVersion: number
  stats: { totalProjects: number; totalFiles: number; totalVersions: number }
  retentionDays: string
  quitOnClose: string
  logTail: string
}

/** A support bundle users can paste into an issue. Counts and settings only: no names, paths, or values. */
export function buildDiagnostics(d: DiagnosticsInput): string {
  const lastLines = d.logTail.split('\n').filter(Boolean).slice(-60).join('\n')
  return [
    `EnVault ${d.appVersion}`,
    `Electron ${d.electron}, Chrome ${d.chrome}`,
    `${d.platform} ${d.arch} (${d.osRelease})`,
    `Vault: ${d.vaultState}, key source ${d.keySource}, recovery passphrase ${d.hasRecovery ? 'set' : 'not set'}`,
    `Schema version ${d.schemaVersion}`,
    `Projects ${d.stats.totalProjects}, files ${d.stats.totalFiles}, versions ${d.stats.totalVersions}`,
    `Retention ${d.retentionDays === '0' ? 'keep all' : d.retentionDays + ' days'}, keep running after window closes: ${d.quitOnClose === '1' ? 'no' : 'yes'}`,
    '',
    'Recent log:',
    lastLines || '(empty)'
  ].join('\n')
}
