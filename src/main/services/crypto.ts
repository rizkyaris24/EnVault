import * as crypto from 'crypto'
import { safeStorage } from 'electron'

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  authTag: string
}

export class VaultCrypto {
  private dek: Buffer | null = null
  private pepper: string = ''

  /**
   * Initializes the crypto service.
   * Retrieves or creates the Data Encryption Key (DEK) and HMAC pepper.
   */
  public initialize(
    storedEncryptedDek: string | null,
    storedPepper: string | null,
    saveMetaCallback: (key: string, value: string) => void
  ): { keySource: 'keychain' | 'password' } {
    let keySource: 'keychain' | 'password' = 'keychain'

    // 1. Initialize or load pepper
    if (storedPepper) {
      this.pepper = storedPepper
    } else {
      this.pepper = crypto.randomBytes(32).toString('hex')
      saveMetaCallback('vault_pepper', this.pepper)
    }

    // 2. Check safeStorage availability
    const isSafeStorageAvailable = typeof safeStorage !== 'undefined' && safeStorage.isEncryptionAvailable()

    if (storedEncryptedDek) {
      if (isSafeStorageAvailable) {
        try {
          const decryptedHex = safeStorage.decryptString(Buffer.from(storedEncryptedDek, 'base64'))
          this.dek = Buffer.from(decryptedHex, 'hex')
          keySource = 'keychain'
        } catch (err) {
          // If safeStorage fails to decrypt (e.g. moved machine or headless), throw
          throw new Error(`Failed to decrypt master vault key from OS keychain: ${(err as Error).message}`)
        }
      } else {
        // Fallback for headless environments
        this.dek = crypto.scryptSync(storedEncryptedDek, 'envault_salt', 32)
        keySource = 'password'
      }
    } else {
      // First run: generate new 256-bit DEK
      const newDek = crypto.randomBytes(32)
      this.dek = newDek

      if (isSafeStorageAvailable) {
        const encrypted = safeStorage.encryptString(newDek.toString('hex'))
        saveMetaCallback('encrypted_dek', encrypted.toString('base64'))
        keySource = 'keychain'
      } else {
        // Fallback placeholder
        const fallbackSeed = crypto.randomBytes(32).toString('hex')
        saveMetaCallback('encrypted_dek', fallbackSeed)
        this.dek = crypto.scryptSync(fallbackSeed, 'envault_salt', 32)
        keySource = 'password'
      }
    }

    return { keySource }
  }

  /**
   * Manually sets DEK for testing or password derivation
   */
  public setTestKey(keyBuffer: Buffer, pepper: string = 'test-pepper'): void {
    this.dek = keyBuffer
    this.pepper = pepper
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

    const iv = Buffer.from(payload.iv, 'base64')
    const authTag = Buffer.from(payload.authTag, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.dek, iv)
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
