import { describe, it, expect } from 'vitest'
import { computeEnvDiff } from '../../src/main/services/diffService'

describe('diffService', () => {
  it('correctly calculates added, removed, modified, and unchanged variables', () => {
    const versionA = `
API_KEY=old_secret_key
DATABASE_URL=postgres://localhost:5432/app
PORT=3000
REMOVED_VAR=goodbye
`
    const versionB = `
API_KEY=new_secret_key
DATABASE_URL=postgres://localhost:5432/app
PORT=3000
NEWLY_ADDED=welcome
`

    const diff = computeEnvDiff('v1', versionA, 'v2', versionB)

    expect(diff.summary.added).toBe(1)
    expect(diff.summary.removed).toBe(1)
    expect(diff.summary.modified).toBe(1)
    expect(diff.summary.unchanged).toBe(2)

    const addedEntry = diff.entries.find((e) => e.key === 'NEWLY_ADDED')
    expect(addedEntry).toBeDefined()
    expect(addedEntry?.status).toBe('added')
    expect(addedEntry?.newValue).toBe('welcome')

    const removedEntry = diff.entries.find((e) => e.key === 'REMOVED_VAR')
    expect(removedEntry).toBeDefined()
    expect(removedEntry?.status).toBe('removed')
    expect(removedEntry?.oldValue).toBe('goodbye')

    const modifiedEntry = diff.entries.find((e) => e.key === 'API_KEY')
    expect(modifiedEntry).toBeDefined()
    expect(modifiedEntry?.status).toBe('modified')
    expect(modifiedEntry?.oldValue).toBe('old_secret_key')
    expect(modifiedEntry?.newValue).toBe('new_secret_key')
  })
})
