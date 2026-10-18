import { VaultDB } from './db'
import { VaultCrypto } from './crypto'
import { validateImportTables } from './importValidation'

const FORMAT = 'envault-export'
const VERSION = 1

interface ExportFile {
  format: typeof FORMAT
  v: number
  createdAt: number
  keyWrap: string
  pepperEnc: string
  tables: Record<string, Array<Record<string, unknown>>>
}

/**
 * One portable file: snapshots stay encrypted under the vault key, and the key itself is wrapped by the
 * export passphrase. Without the passphrase the file reveals nothing.
 */
export function exportVault(db: VaultDB, crypto: VaultCrypto, passphrase: string): string {
  const keyWrap = crypto.wrapKeyForExport(passphrase)
  const pepperEnc = db.getMeta('vault_pepper_enc')
  if (!pepperEnc) throw new Error('Vault is not ready to export')
  const file: ExportFile = { format: FORMAT, v: VERSION, createdAt: Date.now(), keyWrap, pepperEnc, tables: db.exportRows() }
  return JSON.stringify(file)
}

/** Replaces this vault's contents and key with the export. Everything is verified before anything is changed. */
export function importVault(
  db: VaultDB,
  crypto: VaultCrypto,
  contents: string,
  passphrase: string
): { projects: number; files: number; versions: number } {
  let file: ExportFile
  try {
    file = JSON.parse(contents)
  } catch {
    throw new Error('This is not an EnVault export file')
  }
  if (
    !file ||
    file.format !== FORMAT ||
    file.v !== VERSION ||
    typeof file.keyWrap !== 'string' ||
    typeof file.pepperEnc !== 'string' ||
    !file.tables ||
    !Array.isArray(file.tables.projects) ||
    !Array.isArray(file.tables.env_files) ||
    !Array.isArray(file.tables.env_versions) ||
    !Array.isArray(file.tables.secret_hashes)
  ) {
    throw new Error('This is not a supported EnVault export file')
  }

  validateImportTables(file.tables)
  crypto.verifyExportedKey(file.keyWrap, passphrase, file.pepperEnc)
  // Rows and key change together or not at all.
  db.runInTransaction(() => {
    db.replaceAllRows(file.tables)
    crypto.adoptExportedKey(file.keyWrap, passphrase, file.pepperEnc)
  })

  return { projects: file.tables.projects.length, files: file.tables.env_files.length, versions: file.tables.env_versions.length }
}
