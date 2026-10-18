import * as crypto from 'crypto'
import { safeStorage } from 'electron'

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  authTag: string
}

export interface MetaStore {
  get(key: string): string | null
  set(key: string, value: string): void
  delete(key: string): void
}

/** The OS keychain, abstracted so key handling is testable without Electron. */
export interface KeyStore {
  isAvailable(): boolean
  wrap(hex: string): string
  unwrap(base64: string): string
}

export type VaultState = 'ready' | 'locked' | 'needs-passphrase-setup'
export type KeySource = 'keychain' | 'passphrase'

const MIN_PASSPHRASE_LENGTH = 10
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

/** Electron safeStorage as a KeyStore. On Linux, `basic_text` is not real encryption, so it counts as unavailable. */
export function electronKeyStore(): KeyStore {
  return {
    isAvailable: () => {
      if (typeof safeStorage === 'undefined' || !safeStorage.isEncryptionAvailable()) return false
      if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend?.() === 'basic_text') return false
      return true
    },
    wrap: (hex) => safeStorage.encryptString(hex).toString('base64'),
    unwrap: (b64) => safeStorage.decryptString(Buffer.from(b64, 'base64'))
  }
}

export class VaultCrypto {
  private dek: Buffer | null = null
  private pendingDek: Buffer | null = null
  private pepper: string = ''
  private meta: MetaStore | null = null
  private keystore: KeyStore | null = null
  private state: VaultState = 'locked'
  private keySource: KeySource = 'keychain'

  /**
   * Loads or creates the vault key (DEK).
   * The DEK is wrapped by the OS keychain; an optional passphrase wrapping is the recovery and fallback path.
   * Throws when the key cannot be recovered (keychain unusable and no recovery passphrase was ever set).
   */
  public initialize(meta: MetaStore, keystore: KeyStore): { state: VaultState; keySource: KeySource } {
    this.meta = meta
    this.keystore = keystore
    this.dek = null
    this.pendingDek = null

    const keychainBlob = meta.get('encrypted_dek')
    const hasPassphraseWrap = meta.get('dek_wrap_pass') !== null
    const keychainOk = keystore.isAvailable()

    if (!keychainBlob && !hasPassphraseWrap) {
      // First run: generate a new 256-bit DEK.
      const dek = crypto.randomBytes(32)
      if (keychainOk) {
        meta.set('encrypted_dek', keystore.wrap(dek.toString('hex')))
        this.dek = dek
        this.keySource = 'keychain'
        this.finalize()
        return { state: this.state, keySource: this.keySource }
      }
      this.pendingDek = dek
      this.state = 'needs-passphrase-setup'
      this.keySource = 'passphrase'
      return { state: this.state, keySource: this.keySource }
    }

    if (keychainBlob && keychainOk) {
      try {
        this.dek = Buffer.from(keystore.unwrap(keychainBlob), 'hex')
        this.keySource = 'keychain'
        this.finalize()
        return { state: this.state, keySource: this.keySource }
      } catch (err) {
        if (!hasPassphraseWrap) {
          throw new Error(
            `Cannot decrypt the vault key from the OS keychain and no recovery passphrase was set: ${(err as Error).message}`
          )
        }
      }
    } else if (!hasPassphraseWrap) {
      throw new Error('The OS keychain is unavailable and no recovery passphrase was set for this vault.')
    }

    this.state = 'locked'
    this.keySource = 'passphrase'
    return { state: this.state, keySource: this.keySource }
  }

  public getState(): VaultState {
    return this.state
  }

  public getKeySource(): KeySource {
    return this.keySource
  }

  public isReady(): boolean {
    return this.state === 'ready'
  }

  public hasRecovery(): boolean {
    return this.meta?.get('dek_wrap_pass') != null
  }

  /**
   * Sets the user passphrase: the master password when no keychain exists, or the recovery passphrase otherwise.
   * Allowed when the vault is waiting for its first passphrase or is already unlocked.
   */
  public setPassphrase(passphrase: string): void {
    this.assertPassphrase(passphrase)
    const dek = this.dek ?? this.pendingDek
    if (!this.meta || !dek || (this.state !== 'ready' && this.state !== 'needs-passphrase-setup')) {
      throw new Error('Vault is not ready to set a passphrase')
    }
    this.meta.set('dek_wrap_pass', this.wrapWithPassphrase(dek, passphrase))
    if (this.state === 'needs-passphrase-setup') {
      this.dek = dek
      this.pendingDek = null
      this.keySource = 'passphrase'
      this.finalize()
    }
  }

  /** Unlocks a locked vault with the passphrase, and re-wraps the key into the keychain when one is available. */
  public unlock(passphrase: string): void {
    if (!this.meta || !this.keystore || this.state !== 'locked') {
      throw new Error('Vault is not locked')
    }
    const wrapped = this.meta.get('dek_wrap_pass')
    if (!wrapped) throw new Error('No recovery passphrase is set for this vault')

    let dek: Buffer
    try {
      dek = this.unwrapWithPassphrase(wrapped, passphrase)
    } catch {
      throw new Error('Incorrect passphrase')
    }

    this.dek = dek
    if (this.keystore.isAvailable()) {
      this.meta.set('encrypted_dek', this.keystore.wrap(dek.toString('hex')))
      this.keySource = 'keychain'
    }
    this.finalize()
  }

  private assertPassphrase(passphrase: string): void {
    if (typeof passphrase !== 'string' || passphrase.length < MIN_PASSPHRASE_LENGTH) {
      throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`)
    }
  }

  private wrapWithPassphrase(dek: Buffer, passphrase: string): string {
    const salt = crypto.randomBytes(16)
    const iv = crypto.randomBytes(12)
    const key = crypto.scryptSync(passphrase, salt, 32, SCRYPT)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const ct = Buffer.concat([cipher.update(dek), cipher.final()])
    return JSON.stringify({
      v: 1,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ct: ct.toString('base64')
    })
  }

  private unwrapWithPassphrase(blob: string, passphrase: string): Buffer {
    const w = JSON.parse(blob) as { salt: string; iv: string; tag: string; ct: string }
    const key = crypto.scryptSync(passphrase, Buffer.from(w.salt, 'base64'), 32, SCRYPT)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(w.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(w.tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(w.ct, 'base64')), decipher.final()])
  }

  /** The vault key wrapped by `passphrase`, for the export file. Requires an unlocked vault. */
  public wrapKeyForExport(passphrase: string): string {
    this.assertPassphrase(passphrase)
    if (!this.dek || this.state !== 'ready') throw new Error('Vault is locked')
    return this.wrapWithPassphrase(this.dek, passphrase)
  }

  /** Checks an exported key against its passphrase and pepper without changing anything. */
  public verifyExportedKey(wrappedKey: string, passphrase: string, pepperEnc: string): void {
    let dek: Buffer
    try {
      dek = this.unwrapWithPassphrase(wrappedKey, passphrase)
    } catch {
      throw new Error('Incorrect passphrase')
    }
    this.decryptWith(dek, JSON.parse(pepperEnc))
  }

  /** Replaces this vault's key with the exported one (after the data was imported). The export passphrase becomes the recovery passphrase. */
  public adoptExportedKey(wrappedKey: string, passphrase: string, pepperEnc: string): void {
    if (!this.meta || !this.keystore) throw new Error('Vault is not initialized')
    this.verifyExportedKey(wrappedKey, passphrase, pepperEnc)
    this.dek = this.unwrapWithPassphrase(wrappedKey, passphrase)
    this.meta.set('vault_pepper_enc', pepperEnc)
    this.meta.set('dek_wrap_pass', wrappedKey)
    if (this.keystore.isAvailable()) {
      this.meta.set('encrypted_dek', this.keystore.wrap(this.dek.toString('hex')))
      this.keySource = 'keychain'
    } else {
      this.meta.delete('encrypted_dek')
      this.keySource = 'passphrase'
    }
    this.finalize()
  }

  /** Loads (or creates) the HMAC pepper, stored encrypted under the DEK. Migrates the old plaintext pepper. */
  private finalize(): void {
    const meta = this.meta!
    const enc = meta.get('vault_pepper_enc')
    if (enc) {
      this.pepper = this.decrypt(JSON.parse(enc))
    } else {
      const legacy = meta.get('vault_pepper')
      this.pepper = legacy ?? crypto.randomBytes(32).toString('hex')
      meta.set('vault_pepper_enc', JSON.stringify(this.encrypt(this.pepper)))
      if (legacy) meta.delete('vault_pepper')
    }
    this.state = 'ready'
  }

  /**
   * Manually sets DEK for testing or password derivation
   */
  public setTestKey(keyBuffer: Buffer, pepper: string = 'test-pepper'): void {
    this.dek = keyBuffer
    this.pepper = pepper
    this.state = 'ready'
  }

  /**
   * Encrypts plaintext using AES-256-GCM with the DEK
   */
  public encrypt(plaintext: string): EncryptedPayload {
    if (!this.dek) {
      throw new Error('VaultCrypto is not initialized: DEK is missing')
    }

    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.dek, iv)

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
    ciphertext += cipher.final('base64')
    const authTag = cipher.getAuthTag().toString('base64')

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag
    }
  }

  /**
   * Decrypts ciphertext using AES-256-GCM with the DEK
   */
  public decrypt(payload: EncryptedPayload): string {
    if (!this.dek) {
      throw new Error('VaultCrypto is not initialized: DEK is missing')
    }
    return this.decryptWith(this.dek, payload)
  }

  private decryptWith(key: Buffer, payload: EncryptedPayload): string {
    const iv = Buffer.from(payload.iv, 'base64')
    const authTag = Buffer.from(payload.authTag, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(payload.ciphertext, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Generates SHA-256 content hash for deduplication
   */
  public hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  }

  /**
   * Hashes a secret value for cross-project reuse detection.
   * Returns null if the value is deemed non-sensitive/trivial.
   */
  public hashSecretValue(value: string): string | null {
    const trimmed = value.trim()

    // Filter out trivial / non-secret values
    if (trimmed.length < 8) return null

    const lower = trimmed.toLowerCase()
    const trivialList = [
      'true', 'false', 'null', 'undefined', 'localhost', '127.0.0.1', '0.0.0.0',
      'development', 'production', 'staging', 'testing', 'test', 'local',
      'postgres', 'mysql', 'sqlite', 'mongodb', 'redis', 'default'
    ]
    if (trivialList.includes(lower)) return null

    // Simple numeric or boolean check
    if (/^\d+$/.test(trimmed)) return null
    if (/^(http:\/\/|https:\/\/)?localhost(:\d+)?$/.test(trimmed)) return null

    // HMAC-SHA256 with local pepper
    return crypto.createHmac('sha256', this.pepper).update(trimmed, 'utf8').digest('hex')
  }
}

export const vaultCrypto = new VaultCrypto()
