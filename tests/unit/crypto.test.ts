import { describe, it, expect, beforeEach } from 'vitest'
import * as crypto from 'crypto'
import { VaultCrypto } from '../../src/main/services/crypto'

describe('VaultCrypto', () => {
  let vaultCrypto: VaultCrypto

  beforeEach(() => {
    vaultCrypto = new VaultCrypto()
    const testKey = crypto.randomBytes(32)
    vaultCrypto.setTestKey(testKey, 'test-pepper-12345')
  })

  it('encrypts and decrypts content accurately using AES-256-GCM', () => {
    const original = 'DATABASE_URL=postgres://user:supersecretpass@db.internal:5432/production\nAPI_KEY=sk_live_999'
    const encrypted = vaultCrypto.encrypt(original)

    expect(encrypted.ciphertext).toBeDefined()
    expect(encrypted.iv).toBeDefined()
    expect(encrypted.authTag).toBeDefined()
    expect(encrypted.ciphertext).not.toEqual(original)

    const decrypted = vaultCrypto.decrypt(encrypted)
    expect(decrypted).toEqual(original)
  })

  it('throws an error if ciphertext is tampered with', () => {
    const original = 'SECRET_TOKEN=my_precious_token_here'
    const encrypted = vaultCrypto.encrypt(original)

    // Tamper with ciphertext
    const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64')
    tamperedCiphertext[0] ^= 0xff
    const tamperedPayload = {
      ...encrypted,
      ciphertext: tamperedCiphertext.toString('base64')
    }

    expect(() => vaultCrypto.decrypt(tamperedPayload)).toThrow()
  })

  it('throws an error if authentication tag is invalid', () => {
    const original = 'SECRET_TOKEN=my_precious_token_here'
    const encrypted = vaultCrypto.encrypt(original)

    const invalidAuthTag = crypto.randomBytes(16).toString('base64')
    const tamperedPayload = {
      ...encrypted,
      authTag: invalidAuthTag
    }

    expect(() => vaultCrypto.decrypt(tamperedPayload)).toThrow()
  })

  it('computes consistent SHA-256 content hashes', () => {
    const contentA = 'KEY=123'
    const contentB = 'KEY=123'
    const contentC = 'KEY=456'

    expect(vaultCrypto.hashContent(contentA)).toEqual(vaultCrypto.hashContent(contentB))
    expect(vaultCrypto.hashContent(contentA)).not.toEqual(vaultCrypto.hashContent(contentC))
  })

  it('hashes real secret values while ignoring trivial defaults', () => {
    // Trivial values should return null
    expect(vaultCrypto.hashSecretValue('true')).toBeNull()
    expect(vaultCrypto.hashSecretValue('localhost')).toBeNull()
    expect(vaultCrypto.hashSecretValue('127.0.0.1')).toBeNull()
    expect(vaultCrypto.hashSecretValue('3000')).toBeNull()
    expect(vaultCrypto.hashSecretValue('postgres')).toBeNull()
    expect(vaultCrypto.hashSecretValue('short')).toBeNull()

    // Real secret values should produce a 64-char hex HMAC
    const secretHash1 = vaultCrypto.hashSecretValue('sk_live_51M0abcdef123456')
    const secretHash2 = vaultCrypto.hashSecretValue('sk_live_51M0abcdef123456')
    const secretHash3 = vaultCrypto.hashSecretValue('different_secret_value_here')

    expect(secretHash1).not.toBeNull()
    expect(secretHash1).toHaveLength(64)
    expect(secretHash1).toEqual(secretHash2)
    expect(secretHash1).not.toEqual(secretHash3)
  })
})
