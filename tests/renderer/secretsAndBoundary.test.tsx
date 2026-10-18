// @vitest-environment happy-dom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { SecretTable } from '../../src/renderer/src/components/ProjectDetail/SecretTable'
import { ErrorBoundary } from '../../src/renderer/src/components/Common/ErrorBoundary'

const secrets = [
  { key: 'API_TOKEN', value: 'sk_live_real_value_123', reusedIn: [] },
  { key: 'DB_URL', value: 'postgres://u:pw@h/db', reusedIn: [{ projectId: 'p2', projectName: 'Other app', envFile: '.env', keyName: 'DATABASE_URL' }] }
]

describe('SecretTable', () => {
  afterEach(cleanup)

  it('masks values by default and never renders them in the DOM', () => {
    render(<SecretTable secrets={secrets} onCopySecret={vi.fn()} />)
    expect(screen.getByText('API_TOKEN')).toBeTruthy()
    expect(document.body.textContent).not.toContain('sk_live_real_value_123')
    expect(document.body.textContent).not.toContain('postgres://u:pw@h/db')
  })

  it('reveals one value on request and hides it again', () => {
    render(<SecretTable secrets={secrets} onCopySecret={vi.fn()} />)
    const row = screen.getByText('API_TOKEN').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: 'Reveal secret' }))
    expect(row.textContent).toContain('sk_live_real_value_123')
    expect(document.body.textContent).not.toContain('postgres://u:pw@h/db')
    fireEvent.click(within(row).getByRole('button', { name: 'Hide secret' }))
    expect(row.textContent).not.toContain('sk_live_real_value_123')
  })

  it('copies the real value, not the mask', () => {
    const onCopy = vi.fn()
    render(<SecretTable secrets={secrets} onCopySecret={onCopy} />)
    const row = screen.getByText('API_TOKEN').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: 'Copy value' }))
    expect(onCopy).toHaveBeenCalledWith('sk_live_real_value_123', 'API_TOKEN')
  })

  it('"Reveal all" and "Mask all" toggle every row', () => {
    render(<SecretTable secrets={secrets} onCopySecret={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal all' }))
    expect(document.body.textContent).toContain('sk_live_real_value_123')
    expect(document.body.textContent).toContain('postgres://u:pw@h/db')
    fireEvent.click(screen.getByRole('button', { name: 'Mask all' }))
    expect(document.body.textContent).not.toContain('sk_live_real_value_123')
  })

  it('filters by key name and explains an empty result', () => {
    render(<SecretTable secrets={secrets} onCopySecret={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Filter keys'), { target: { value: 'db_' } })
    expect(screen.queryByText('API_TOKEN')).toBeNull()
    expect(screen.getByText('DB_URL')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Filter keys'), { target: { value: 'zzz' } })
    expect(screen.getByText('No matching keys')).toBeTruthy()
  })

  it('flags reused secrets and lists the other projects without values', () => {
    render(<SecretTable secrets={secrets} onCopySecret={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Shared with 1 other project/ }))
    expect(screen.getByText('Other app')).toBeTruthy()
    expect(screen.getByText(/No plaintext shared/)).toBeTruthy()
  })
})

describe('ErrorBoundary', () => {
  afterEach(cleanup)

  it('shows a calm reload screen instead of a blank window when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Boom = (): React.ReactElement => {
      throw new Error('render failure')
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
    spy.mockRestore()
  })

  it('renders children normally when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('all good')).toBeTruthy()
  })
})
