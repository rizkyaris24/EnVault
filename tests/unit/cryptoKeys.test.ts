import { describe, it, expect } from 'vitest'
import * as nodeCrypto from 'crypto'
import { VaultCrypto, MetaStore, KeyStore } from '../../src/main/services/crypto'

function memoryMeta(): MetaStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    delete: (k) => void data.delete(k)
  }
}

/** Fake OS keychain. `machine` simulates the per-machine secret; changing it simulates a keychain reset. */
function fakeKeyStore(opts: { available?: boolean; machine?: string } = {}): KeyStore & { machine: string; available: boolean } {
  const ks = {
    available: opts.available ?? true,
    machine: opts.machine ?? 'machine-a',
    isAvailable: () => ks.available,
    wrap: (hex: string) => Buffer.from(`${ks.machine}:${hex}`).toString('base64'),
    unwrap: (b64: string) => {
      const [m, hex] = Buffer.from(b64, 'base64').toString().split(':')
      if (m !== ks.machine) throw new Error('keychain cannot decrypt')
      return hex
    }
  }
  return ks
}

const PASS = 'correct horse battery'

describe('VaultCrypto key management', () => {
  it('first run with a keychain is ready, stores no plaintext pepper, and survives a restart', () => {
    const meta = memoryMeta()
    const ks = fakeKeyStore()
    const a = new VaultCrypto()
    expect(a.initialize(meta, ks)).toEqual({ state: 'ready', keySource: 'keychain' })
    expect(meta.get('vault_pepper')).toBeNull()
    expect(meta.get('vault_pepper_enc')).toBeTruthy()

    const payload = a.encrypt('A=1')
    const hash = a.hashSecretValue('a_sufficiently_long_secret')

    const b = new VaultCrypto()
    expect(b.initialize(meta, ks).state).toBe('ready')
    expect(b.decrypt(payload)).toBe('A=1')
    expect(b.hashSecretValue('a_sufficiently_long_secret')).toBe(hash)
  })

  it('migrates a legacy plaintext pepper without changing existing hashes', () => {
    const meta = memoryMeta()
    const ks = fakeKeyStore()
    meta.set('vault_pepper', 'legacy-pepper-value')
    const legacy = new VaultCrypto()
    legacy.setTestKey(Buffer.alloc(32, 1), 'legacy-pepper-value')
    const expected = legacy.hashSecretValue('a_sufficiently_long_secret')

    const a = new VaultCrypto()
    a.initialize(meta, ks)
    expect(a.hashSecretValue('a_sufficiently_long_secret')).toBe(expected)
    expect(meta.get('vault_pepper')).toBeNull()

    const b = new VaultCrypto()
    b.initialize(meta, ks)
    expect(b.hashSecretValue('a_sufficiently_long_secret')).toBe(expected)
  })

  it('without a keychain, first run requires a passphrase and cannot encrypt until it is set', () => {
    const meta = memoryMeta()
    const ks = fakeKeyStore({ available: false })
    const a = new VaultCrypto()
    expect(a.initialize(meta, ks)).toEqual({ state: 'needs-passphrase-setup', keySource: 'passphrase' })
    expect(() => a.encrypt('x')).toThrow()
    expect(() => a.setPassphrase('short')).toThrow(/at least/i)

    a.setPassphrase(PASS)
    expect(a.getState()).toBe('ready')
    const payload = a.encrypt('SECRET=1')

    const b = new VaultCrypto()
    expect(b.initialize(meta, ks)).toEqual({ state: 'locked', keySource: 'passphrase' })
    expect(() => b.decrypt(payload)).toThrow()
    expect(() => b.unlock('wrong passphrase!')).toThrow(/incorrect/i)
    b.unlock(PASS)
    expect(b.getState()).toBe('ready')
    expect(b.decrypt(payload)).toBe('SECRET=1')
  })

  it('never writes the DEK to the database in plaintext', () => {
    const meta = memoryMeta()
    const a = new VaultCrypto()
    a.initialize(meta, fakeKeyStore({ available: false }))
    a.setPassphrase(PASS)
    const dump = JSON.stringify([...meta.data.entries()])
    expect(meta.get('encrypted_dek')).toBeNull()
    expect(dump).not.toMatch(/"[0-9a-f]{64}"/)
  })

  it('recovers a vault after a keychain reset using the recovery passphrase, then re-wraps the key', () => {
    const meta = memoryMeta()
    const ks = fakeKeyStore()
    const a = new VaultCrypto()
    a.initialize(meta, ks)
    a.setPassphrase(PASS)
    const payload = a.encrypt('KEEP=me')

    ks.machine = 'machine-b' // new Mac or reset keychain
    const b = new VaultCrypto()
    expect(b.initialize(meta, ks)).toEqual({ state: 'locked', keySource: 'passphrase' })
    b.unlock(PASS)
    expect(b.decrypt(payload)).toBe('KEEP=me')
    expect(b.getKeySource()).toBe('keychain')

    const c = new VaultCrypto()
    expect(c.initialize(meta, ks).state).toBe('ready') // keychain works again, no prompt
    expect(c.decrypt(payload)).toBe('KEEP=me')
  })

  it('fails loudly when the keychain cannot decrypt and no recovery passphrase exists', () => {
    const meta = memoryMeta()
    const ks = fakeKeyStore()
    new VaultCrypto().initialize(meta, ks)
    ks.machine = 'machine-b'
    expect(() => new VaultCrypto().initialize(meta, ks)).toThrow(/recovery/i)
  })

  it('fails loudly when a keychain vault is opened where no keychain exists and no recovery is set', () => {
    const meta = memoryMeta()
    new VaultCrypto().initialize(meta, fakeKeyStore())
    expect(() => new VaultCrypto().initialize(meta, fakeKeyStore({ available: false }))).toThrow(/recovery/i)
  })

  it('reports whether a recovery passphrase exists', () => {
    const meta = memoryMeta()
    const a = new VaultCrypto()
    a.initialize(meta, fakeKeyStore())
    expect(a.hasRecovery()).toBe(false)
    a.setPassphrase(PASS)
    expect(a.hasRecovery()).toBe(true)
  })
})

describe('VaultCrypto hardening', () => {
  const PASS2 = 'a different recovery phrase 7'

  it('new passphrase wraps record their scrypt parameters (N >= 2^17)', () => {
    const meta = memoryMeta()
    const a = new VaultCrypto()
    a.initialize(meta, fakeKeyStore())
    a.setPassphrase(PASS)
    const blob = JSON.parse(meta.get('dek_wrap_pass')!)
    expect(blob.v).toBe(2)
    expect(blob.N).toBeGreaterThanOrEqual(131072)
    expect(blob.r).toBe(8)
    expect(blob.p).toBe(1)
  })

  it('still opens a legacy wrap that has no parameters (N = 2^15)', () => {
    const meta = memoryMeta()
    const ks = fakeKeyStore()
    const a = new VaultCrypto()
    a.initialize(meta, ks)
    const dek: Buffer = (a as any).dek
    const payload = a.encrypt('LEGACY=still_readable')
    // build a v1 blob exactly as older builds did
    const salt = nodeCrypto.randomBytes(16)
    const iv = nodeCrypto.randomBytes(12)
    const key = nodeCrypto.scryptSync(PASS, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
    const c = nodeCrypto.createCipheriv('aes-256-gcm', key, iv)
    const ct = Buffer.concat([c.update(dek), c.final()])
    meta.set('dek_wrap_pass', JSON.stringify({ v: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') }))

    ks.machine = 'machine-b'
    const b = new VaultCrypto()
    expect(b.initialize(meta, ks).state).toBe('locked')
    b.unlock(PASS)
    expect(b.decrypt(payload)).toBe('LEGACY=still_readable')
  })

  it('refuses a wrap whose scrypt parameters are outside the allowed set instead of burning memory', () => {
    const meta = memoryMeta()
    const ks = fakeKeyStore()
    const a = new VaultCrypto()
    a.initialize(meta, ks)
    a.setPassphrase(PASS)
    const blob = JSON.parse(meta.get('dek_wrap_pass')!)
    blob.N = 2 ** 25
    meta.set('dek_wrap_pass', JSON.stringify(blob))
    ks.machine = 'machine-b'
    const b = new VaultCrypto()
    b.initialize(meta, ks)
    const t0 = Date.now()
    expect(() => b.unlock(PASS)).toThrow()
    expect(Date.now() - t0).toBeLessThan(2000)
  })

  it('changing an existing recovery passphrase requires the current one', () => {
    const meta = memoryMeta()
    const a = new VaultCrypto()
    a.initialize(meta, fakeKeyStore())
    a.setPassphrase(PASS) // first time: nothing to prove
    expect(() => a.setPassphrase(PASS2)).toThrow(/current passphrase/i)
    expect(() => a.setPassphrase(PASS2, 'not the current one')).toThrow(/incorrect/i)
    a.setPassphrase(PASS2, PASS)
    const b = new VaultCrypto()
    const ks2 = fakeKeyStore({ machine: 'other' })
    b.initialize(meta, ks2)
    b.unlock(PASS2)
    expect(b.getState()).toBe('ready')
  })

  it('rejects ciphertext with a truncated auth tag or a wrong-length iv', () => {
    const a = new VaultCrypto()
    a.setTestKey(nodeCrypto.randomBytes(32), 'p')
    const good = a.encrypt('SECRET=1')
    const shortTag = { ...good, authTag: Buffer.from(good.authTag, 'base64').subarray(0, 4).toString('base64') }
    expect(() => a.decrypt(shortTag)).toThrow()
    const badIv = { ...good, iv: Buffer.alloc(16).toString('base64') }
    expect(() => a.decrypt(badIv)).toThrow()
    expect(a.decrypt(good)).toBe('SECRET=1')
  })
})
