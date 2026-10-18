import React, { useState } from 'react'
import { VaultStatus } from '@shared/types'
import { Button } from '../ui'

interface UnlockScreenProps {
  status: VaultStatus
  onDone: () => void
}

const MIN_LENGTH = 10

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ status, onDone }) => {
  const isSetup = status.state === 'needs-passphrase-setup'
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    if (isSetup) {
      if (passphrase.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
      if (passphrase !== confirm) return setError('The two passphrases do not match.')
    }
    setBusy(true)
    const res = isSetup
      ? await window.envaultApi.security.setPassphrase(passphrase)
      : await window.envaultApi.security.unlock(passphrase)
    setBusy(false)
    if (res.success) onDone()
    else setError(res.error ?? 'Something went wrong.')
  }

  const inputClass =
    'w-full h-10 bg-raised rounded-control px-3.5 text-ui text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-accent'

  return (
    <div className="flex flex-col h-screen w-screen bg-canvas text-fg font-sans">
      <div className="titlebar-drag-region h-12 shrink-0" />
      <form onSubmit={submit} className="flex-1 flex flex-col items-center justify-center px-8 pb-24 max-w-md mx-auto w-full">
        <h1 className="text-display font-semibold text-center">
          {isSetup ? 'Set a master password' : 'Unlock EnVault'}
        </h1>
        <p className="text-ui text-fg-muted mt-3 text-center">
          {isSetup
            ? 'This Mac has no secure keychain available, so EnVault protects your vault with a password. If you forget it, your backups cannot be recovered.'
            : "EnVault could not open your vault key from this Mac's keychain. Enter your recovery passphrase to unlock it."}
        </p>

        <div className="w-full mt-8 space-y-3">
          <input
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder={isSetup ? 'Master password' : 'Recovery passphrase'}
            aria-label={isSetup ? 'Master password' : 'Recovery passphrase'}
            className={inputClass}
          />
          {isSetup && (
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              aria-label="Repeat password"
              className={inputClass}
            />
          )}
          <p role="alert" className="text-meta text-danger min-h-4">
            {error}
          </p>
        </div>

        <Button type="submit" variant="primary" isLoading={busy} disabled={!passphrase} className="mt-2">
          {isSetup ? 'Save and continue' : 'Unlock'}
        </Button>
      </form>
    </div>
  )
}
