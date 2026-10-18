import React, { useState } from 'react'
import { Button, Kbd } from '../ui'
import { PassphraseForm } from '../Vault/PassphraseForm'

interface OnboardingProps {
  hasRecovery: boolean
  onFinish: (next: 'add' | 'scan' | 'later') => void
}

export const Onboarding: React.FC<OnboardingProps> = ({ hasRecovery, onFinish }) => {
  const steps = hasRecovery ? (['welcome', 'add'] as const) : (['welcome', 'recovery', 'add'] as const)
  const [index, setIndex] = useState(0)
  const [skipWarning, setSkipWarning] = useState(false)
  const step = steps[index]
  const next = (): void => setIndex((i) => Math.min(i + 1, steps.length - 1))

  return (
    <div className="flex flex-col h-screen w-screen bg-canvas text-fg font-sans">
      <div className="titlebar-drag-region h-12 shrink-0" />
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20 max-w-md mx-auto w-full text-center">
        <p className="text-meta text-fg-subtle">
          {index + 1} of {steps.length}
        </p>

        {step === 'welcome' && (
          <>
            <h1 className="text-display font-semibold mt-3">Your .env files, backed up quietly.</h1>
            <ul className="text-ui text-fg-muted mt-6 space-y-3 text-left">
              <li>Everything is encrypted on this Mac. Nothing is sent anywhere.</li>
              <li>EnVault watches your project folders and saves a version each time a .env file changes.</li>
              <li>It keeps watching after you close the window. Quit EnVault from the menu to stop.</li>
            </ul>
            <Button variant="primary" className="mt-8" onClick={next}>
              Continue
            </Button>
          </>
        )}

        {step === 'recovery' && (
          <>
            <h1 className="text-display font-semibold mt-3">Set a recovery passphrase</h1>
            <p className="text-ui text-fg-muted mt-3">
              Your backups are locked with a key kept in this Mac&apos;s keychain. If the keychain is ever reset, or you
              move to a new Mac, this passphrase is the only way back in. Store it somewhere safe.
            </p>
            <div className="w-full mt-6 text-left">
              <PassphraseForm
                label="Recovery passphrase"
                actionLabel="Save passphrase"
                confirm
                centered
                onSubmit={async (p) => {
                  const res = await window.envaultApi.security.setPassphrase(p)
                  if (res.success) next()
                  return res.success ? null : (res.error ?? 'Something went wrong.')
                }}
              />
            </div>
            {skipWarning ? (
              <p className="text-meta text-warn mt-4">
                Without it, a keychain reset means your backups cannot be recovered.{' '}
                <button type="button" onClick={next} className="underline underline-offset-2 hover:text-fg">
                  Skip anyway
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setSkipWarning(true)}
                className="text-ui text-fg-muted hover:text-fg mt-4 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                Skip for now
              </button>
            )}
          </>
        )}

        {step === 'add' && (
          <>
            <h1 className="text-display font-semibold mt-3">Add your projects</h1>
            <p className="text-ui text-fg-muted mt-3">
              Pick a folder, or let EnVault look through your usual development folders.
            </p>
            <div className="flex flex-col items-center gap-3 mt-8">
              <Button variant="primary" onClick={() => onFinish('add')} rightIcon={<Kbd shortcut="⌘N" />}>
                Add folder
              </Button>
              <Button variant="secondary" onClick={() => onFinish('scan')}>
                Scan this computer
              </Button>
              <button
                type="button"
                onClick={() => onFinish('later')}
                className="text-ui text-fg-muted hover:text-fg mt-1 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                Do this later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
