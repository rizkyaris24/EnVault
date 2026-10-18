import React, { useCallback, useEffect, useState } from 'react'
import { AppInfo, UpdateStatus, VaultStatus } from '@shared/types'
import { Dialog, Button } from '../ui'
import { PassphraseForm } from '../Vault/PassphraseForm'
import { useTheme, ThemePreference } from '../../theme/useTheme'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  status: VaultStatus
  onVaultChanged: () => void
  notify: (type: 'success' | 'info' | 'error', title: string, message?: string) => void
}

const RETENTION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: '0', label: 'Forever' }
]

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="py-5 first:pt-0">
    <h3 className="text-title font-semibold text-fg mb-3">{title}</h3>
    <div className="space-y-4">{children}</div>
  </section>
)

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-6">
    <div className="min-w-0">
      <div className="text-ui text-fg">{label}</div>
      {hint && <div className="text-meta text-fg-subtle mt-0.5">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent ${
      checked ? 'bg-fg' : 'bg-line'
    }`}
  >
    <span
      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
        checked ? 'translate-x-4 bg-canvas' : 'bg-fg-subtle'
      }`}
    />
  </button>
)

type Panel = null | 'recovery' | 'export' | 'import'

function updateLabel(u: UpdateStatus): string {
  switch (u.state) {
    case 'checking':
      return 'Checking for updates...'
    case 'downloading':
      return `Downloading version ${u.version}...`
    case 'ready':
      return `Version ${u.version} is ready`
    case 'none':
      return 'EnVault is up to date'
    case 'error':
      return `Could not check: ${u.message ?? 'unknown error'}`
    case 'disabled':
      return u.message ?? 'Updates are off'
    default:
      return 'Check for updates'
  }
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, status, onVaultChanged, notify }) => {
  const { theme, setTheme } = useTheme()
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [retention, setRetention] = useState('90')
  const [quitOnClose, setQuitOnClose] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [update, setUpdate] = useState<UpdateStatus>({ state: 'idle' })

  const load = useCallback(async () => {
    const [i, r, q, a, u] = await Promise.all([
      window.envaultApi.app.getInfo(),
      window.envaultApi.settings.get('retention_days'),
      window.envaultApi.settings.get('quit_on_close'),
      window.envaultApi.settings.get('auto_update'),
      window.envaultApi.updates.getStatus()
    ])
    if (i.success && i.data) setInfo(i.data)
    setRetention(r.data ?? '90')
    setQuitOnClose(q.data === '1')
    setAutoUpdate(a.data !== '0')
    if (u.success && u.data) setUpdate(u.data)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setPanel(null)
      load()
    }
  }, [isOpen, load])

  useEffect(() => (isOpen ? window.envaultApi.onUpdateStatus(setUpdate) : undefined), [isOpen])

  if (!isOpen) return null

  const isMac = info?.platform === 'darwin'
  const protectedBy = status.keySource === 'keychain' ? "This Mac's keychain" : 'Your master password'

  const save = async (key: string, value: string): Promise<void> => {
    const res = await window.envaultApi.settings.set(key, value)
    if (!res.success) notify('error', 'Could not save setting', res.error)
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      maxWidth="lg"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="divide-y divide-line-subtle">
        <Section title="Vault">
          <Row label="Protected by" hint={status.hasRecovery ? 'Recovery passphrase is set.' : 'No recovery passphrase yet.'}>
            <span className="text-ui text-fg-muted">{protectedBy}</span>
          </Row>

          <Row label="Recovery passphrase" hint="The way back in if the keychain is reset or you move Macs.">
            <Button size="sm" variant="secondary" onClick={() => setPanel(panel === 'recovery' ? null : 'recovery')}>
              {status.hasRecovery ? 'Change' : 'Set up'}
            </Button>
          </Row>
          {panel === 'recovery' && (
            <PassphraseForm
              label="New recovery passphrase"
              actionLabel="Save passphrase"
              confirm
              onCancel={() => setPanel(null)}
              onSubmit={async (p) => {
                const res = await window.envaultApi.security.setPassphrase(p)
                if (!res.success) return res.error ?? 'Something went wrong.'
                setPanel(null)
                onVaultChanged()
                notify('success', 'Recovery passphrase saved')
                return null
              }}
            />
          )}

          <Row label="Back up your vault" hint="One passphrase-protected file you can move to another Mac.">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPanel(panel === 'export' ? null : 'export')}>
                Export
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPanel(panel === 'import' ? null : 'import')}>
                Import
              </Button>
            </div>
          </Row>
          {panel === 'export' && (
            <PassphraseForm
              label="Passphrase for the backup file"
              actionLabel="Choose location and export"
              confirm
              onCancel={() => setPanel(null)}
              onSubmit={async (p) => {
                const res = await window.envaultApi.vault.exportTo(p)
                if (!res.success) return res.error ?? 'Export failed.'
                if (res.data) {
                  setPanel(null)
                  notify('success', 'Backup exported', 'Keep the passphrase safe. The file is useless without it.')
                }
                return null
              }}
            />
          )}
          {panel === 'import' && (
            <div className="space-y-3">
              <p className="text-ui text-warn">
                Importing replaces everything in this vault with the backup, including its recovery passphrase.
              </p>
              <PassphraseForm
                label="Passphrase of the backup file"
                actionLabel="Choose file and replace vault"
                danger
                onCancel={() => setPanel(null)}
                onSubmit={async (p) => {
                  const res = await window.envaultApi.vault.importFrom(p)
                  if (!res.success) return res.error ?? 'Import failed.'
                  if (res.data) {
                    setPanel(null)
                    onVaultChanged()
                    notify('success', 'Vault imported', `${res.data.projects} projects, ${res.data.versions} versions.`)
                  }
                  return null
                }}
              />
            </div>
          )}

          <Row label="Location" hint={info?.vaultPath}>
            <Button size="sm" variant="ghost" onClick={() => window.envaultApi.app.reveal('vault')}>
              Show in Finder
            </Button>
          </Row>
        </Section>

        <Section title="Backups">
          <Row label="Keep history for" hint="The newest 50 versions of each file are always kept.">
            <select
              value={retention}
              aria-label="Keep history for"
              onChange={(e) => {
                setRetention(e.target.value)
                save('retention_days', e.target.value)
              }}
              className="h-9 bg-raised rounded-control px-3 text-ui text-fg outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {RETENTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Row>
          {isMac && (
            <Row label="Keep watching after the window closes" hint="Backups continue in the background. Quit EnVault from the menu to stop.">
              <Switch
                label="Keep watching after the window closes"
                checked={!quitOnClose}
                onChange={(on) => {
                  setQuitOnClose(!on)
                  save('quit_on_close', on ? '0' : '1')
                }}
              />
            </Row>
          )}
        </Section>

        <Section title="Updates">
          <Row label={updateLabel(update)} hint="EnVault contacts the update server only to look for new versions.">
            {update.state === 'ready' ? (
              <Button size="sm" variant="primary" onClick={() => window.envaultApi.updates.install()}>
                Restart to update
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={update.state === 'checking' || update.state === 'downloading' || update.state === 'disabled'}
                onClick={async () => {
                  const res = await window.envaultApi.updates.check()
                  if (res.success && res.data) setUpdate(res.data)
                }}
              >
                Check now
              </Button>
            )}
          </Row>
          <Row label="Check automatically" hint="Looks a few seconds after launch and every 6 hours.">
            <Switch
              label="Check for updates automatically"
              checked={autoUpdate}
              onChange={(on) => {
                setAutoUpdate(on)
                save('auto_update', on ? '1' : '0')
              }}
            />
          </Row>
        </Section>

        <Section title="Appearance">
          <Row label="Theme">
            <div className="flex gap-1">
              {THEMES.map((t) => (
                <Button
                  key={t.value}
                  size="sm"
                  variant={theme === t.value ? 'secondary' : 'ghost'}
                  aria-pressed={theme === t.value}
                  onClick={() => setTheme(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </Row>
        </Section>

        <Section title="About">
          <Row label="EnVault" hint="Local, encrypted, offline. MIT license.">
            <span className="text-ui text-fg-muted">{info ? `Version ${info.version}` : ''}</span>
          </Row>
          <Row label="Diagnostics" hint="Copies settings and recent log lines. No project names, paths or secrets.">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const res = await window.envaultApi.app.getDiagnostics()
                  if (res.success && res.data) {
                    await navigator.clipboard.writeText(res.data)
                    notify('success', 'Diagnostics copied')
                  } else notify('error', 'Could not collect diagnostics', res.error)
                }}
              >
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.envaultApi.app.reveal('logs')}>
                Show log
              </Button>
            </div>
          </Row>
        </Section>
      </div>
    </Dialog>
  )
}
