import React, { useState } from 'react'
import { Button } from '../ui'

export const MIN_PASSPHRASE = 10

interface PassphraseFormProps {
  label: string
  actionLabel: string
  /** Ask the user to type it twice (when they are choosing a new passphrase). */
  confirm?: boolean
  danger?: boolean
  /** Center the buttons (for centered full-screen layouts). */
  centered?: boolean
  /** Return an error message, or null on success. */
  onSubmit: (passphrase: string) => Promise<string | null>
  onCancel?: () => void
}

const inputClass =
  'w-full h-10 bg-raised rounded-control px-3.5 text-ui text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-accent'

export const PassphraseForm: React.FC<PassphraseFormProps> = ({
  label,
  actionLabel,
  confirm = false,
  danger = false,
  centered = false,
  onSubmit,
  onCancel
}) => {
  const [value, setValue] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    if (value.length < MIN_PASSPHRASE) return setError(`Use at least ${MIN_PASSPHRASE} characters.`)
    if (confirm && value !== repeat) return setError('The two passphrases do not match.')
    setBusy(true)
    const err = await onSubmit(value)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="password"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={label}
        aria-label={label}
        className={inputClass}
      />
      {confirm && (
        <input
          type="password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          placeholder="Repeat passphrase"
          aria-label="Repeat passphrase"
          className={inputClass}
        />
      )}
      <p role="alert" className="text-meta text-danger min-h-4">
        {error}
      </p>
      <div className={`flex items-center gap-2 ${centered ? 'justify-center' : ''}`}>
        <Button type="submit" variant={danger ? 'danger' : 'primary'} isLoading={busy} disabled={!value}>
          {actionLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
