import { describe, it, expect } from 'vitest'
import { isTrustedSenderUrl, isSafeId, parseTheme, parseAddPayload, isInside } from '../../src/main/ipc/validate'

describe('isTrustedSenderUrl', () => {
  it('trusts the packaged file URL and the exact dev server origin only', () => {
    expect(isTrustedSenderUrl('file:///Applications/EnVault.app/Contents/Resources/app.asar/out/renderer/index.html', undefined)).toBe(true)
    expect(isTrustedSenderUrl('http://localhost:5173/', 'http://localhost:5173/')).toBe(true)
    expect(isTrustedSenderUrl('http://localhost:5173/#/x', 'http://localhost:5173/')).toBe(true)
  })

  it('rejects other origins, missing URLs, and dev origin when not in dev', () => {
    expect(isTrustedSenderUrl('https://evil.example/', undefined)).toBe(false)
    expect(isTrustedSenderUrl('http://localhost:5173/', undefined)).toBe(false)
    expect(isTrustedSenderUrl('http://localhost:5174/', 'http://localhost:5173/')).toBe(false)
    expect(isTrustedSenderUrl('http://localhost:5173.evil.com/', 'http://localhost:5173/')).toBe(false)
    expect(isTrustedSenderUrl(undefined, undefined)).toBe(false)
    expect(isTrustedSenderUrl('', undefined)).toBe(false)
  })
})

describe('isSafeId', () => {
  it('accepts uuid-like ids and rejects everything else', () => {
    expect(isSafeId('3f2b8c1e-9d4a-4b7e-8a1c-2d5e6f7a8b9c')).toBe(true)
    for (const v of ['', ' ', '../x', 'a b', 'x'.repeat(200), null, undefined, 5, {}, ['a']]) {
      expect(isSafeId(v)).toBe(false)
    }
  })
})

describe('parseTheme', () => {
  it('only allows the three themes', () => {
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('system')).toBe('system')
    expect(parseTheme('red')).toBeNull()
    expect(parseTheme(1)).toBeNull()
  })
})

describe('parseAddPayload', () => {
  const ok = { path: '/Users/me/app', name: 'App', selectedFiles: ['.env', '.env.local'] }

  it('accepts a valid payload', () => {
    expect(parseAddPayload(ok)).toEqual(ok)
    expect(parseAddPayload({ path: '/a', selectedFiles: [] })).toEqual({ path: '/a', name: undefined, selectedFiles: [] })
  })

  it('rejects malformed payloads and dangerous file names', () => {
    for (const bad of [
      null,
      'x',
      {},
      { path: '', selectedFiles: [] },
      { path: 'relative/dir', selectedFiles: [] },
      { path: '/a', selectedFiles: 'x' },
      { path: '/a', selectedFiles: ['../../.ssh/id_rsa'] },
      { path: '/a', selectedFiles: ['/etc/passwd'] },
      { path: '/a', selectedFiles: ['sub/.env'] },
      { path: '/a', name: 5, selectedFiles: [] },
      { path: '/a', name: 'x'.repeat(300), selectedFiles: [] },
      { path: '/a', selectedFiles: Array(500).fill('.env') }
    ]) {
      expect(parseAddPayload(bad)).toBeNull()
    }
  })
})

describe('isInside', () => {
  it('detects containment without prefix tricks', () => {
    expect(isInside('/a/b', '/a/b/c/.env')).toBe(true)
    expect(isInside('/a/b', '/a/b')).toBe(true)
    expect(isInside('/a/b', '/a/bc/.env')).toBe(false)
    expect(isInside('/a/b', '/a/b/../x')).toBe(false)
  })
})
