// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { UnlockScreen } from '../../src/renderer/src/components/Vault/UnlockScreen'
import { PassphraseForm } from '../../src/renderer/src/components/Vault/PassphraseForm'
import { Onboarding } from '../../src/renderer/src/components/Onboarding/Onboarding'
import { installApi } from './setup'

const status = (state: 'locked' | 'needs-passphrase-setup') => ({
  isEncrypted: true,
  state,
  keySource: 'passphrase' as const,
  hasRecovery: state === 'locked',
  totalProjects: 0,
  totalFiles: 0,
  totalVersions: 0,
  reusedSecretCount: 0
})

const type = (label: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('UnlockScreen', () => {
  let api: ReturnType<typeof installApi>
  beforeEach(() => {
    api = installApi()
  })
  afterEach(cleanup)

  it('unlocks with the recovery passphrase and reports done', async () => {
    const onDone = vi.fn()
    render(<UnlockScreen status={status('locked')} onDone={onDone} />)
    expect(screen.getByRole('heading', { name: 'Unlock EnVault' })).toBeTruthy()
    type('Recovery passphrase', 'my recovery phrase 42')
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(api.security.unlock).toHaveBeenCalledWith('my recovery phrase 42')
  })

  it('shows the error and stays put on a wrong passphrase', async () => {
    api.security.unlock.mockResolvedValue({ success: false, error: 'Incorrect passphrase' })
    const onDone = vi.fn()
    render(<UnlockScreen status={status('locked')} onDone={onDone} />)
    type('Recovery passphrase', 'wrong wrong wrong')
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Incorrect passphrase'))
    expect(onDone).not.toHaveBeenCalled()
  })

  it('first-run master password: rejects short and mismatched entries before calling the API', async () => {
    render(<UnlockScreen status={status('needs-passphrase-setup')} onDone={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Set a master password' })).toBeTruthy()
    const save = screen.getByRole('button', { name: 'Save and continue' })

    type('Master password', 'short')
    fireEvent.click(save)
    expect(screen.getByRole('alert').textContent).toMatch(/at least 10/)

    type('Master password', 'a long enough password')
    type('Repeat password', 'something different here')
    fireEvent.click(save)
    expect(screen.getByRole('alert').textContent).toMatch(/do not match/)
    expect(api.security.setPassphrase).not.toHaveBeenCalled()

    type('Repeat password', 'a long enough password')
    fireEvent.click(save)
    await waitFor(() => expect(api.security.setPassphrase).toHaveBeenCalledWith('a long enough password'))
  })
})

describe('Onboarding', () => {
  let api: ReturnType<typeof installApi>
  beforeEach(() => {
    api = installApi()
  })
  afterEach(cleanup)

  it('walks welcome, recovery passphrase, then add, and reports the choice', async () => {
    const onFinish = vi.fn()
    render(<Onboarding hasRecovery={false} onFinish={onFinish} />)
    expect(screen.getByText('1 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('heading', { name: 'Set a recovery passphrase' })).toBeTruthy()
    type('Recovery passphrase', 'my recovery phrase 42')
    type('Repeat passphrase', 'my recovery phrase 42')
    fireEvent.click(screen.getByRole('button', { name: 'Save passphrase' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Add your projects' })).toBeTruthy())
    expect(api.security.setPassphrase).toHaveBeenCalledWith('my recovery phrase 42')

    fireEvent.click(screen.getByRole('button', { name: /Scan this computer/ }))
    expect(onFinish).toHaveBeenCalledWith('scan')
  })

  it('warns before letting the user skip the recovery passphrase', () => {
    const onFinish = vi.fn()
    render(<Onboarding hasRecovery={false} onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(screen.getByText(/backups cannot be recovered/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip anyway' }))
    expect(screen.getByRole('heading', { name: 'Add your projects' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Do this later' }))
    expect(onFinish).toHaveBeenCalledWith('later')
  })

  it('skips the recovery step when one already exists', () => {
    render(<Onboarding hasRecovery={true} onFinish={vi.fn()} />)
    expect(screen.getByText('1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Add your projects' })).toBeTruthy()
  })
})

describe('PassphraseForm with a current passphrase', () => {
  afterEach(cleanup)

  it('will not submit without the current passphrase and passes it along when given', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render(<PassphraseForm label="New passphrase" actionLabel="Save" confirm askCurrent onSubmit={onSubmit} />)
    type('New passphrase', 'a brand new passphrase')
    type('Repeat passphrase', 'a brand new passphrase')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert').textContent).toMatch(/current passphrase/i)
    expect(onSubmit).not.toHaveBeenCalled()

    type('Current passphrase', 'the old one 12345')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('a brand new passphrase', 'the old one 12345'))
  })
})
