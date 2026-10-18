import * as path from 'path'
import { isEnvFileName } from '../utils/safePath'

const isStr = (v: unknown, max = 4096): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && !v.includes('\0')
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isInt = (v: unknown): v is number => Number.isInteger(v)

/** A tracked file is a plain .env name, optionally inside folders, never absolute and never leaving its project. */
function isSafeTrackedPath(rel: unknown): rel is string {
  if (!isStr(rel) || path.isAbsolute(rel)) return false
  const parts = rel.split(/[/\\]/)
  if (parts.some((p) => p === '' || p === '.' || p === '..')) return false
  return isEnvFileName(parts[parts.length - 1])
}

type Rows = Array<Record<string, unknown>>

/**
 * Rows in an import file are untrusted: a crafted file must not be able to point a restore at ~/.zshrc or a
 * LaunchAgent. Anything outside the shapes EnVault itself writes is rejected before the vault is touched.
 */
export function validateImportTables(tables: Record<string, Rows>): void {
  const bad = (): never => {
    throw new Error('This backup file contains invalid data and was not imported')
  }
  const MAX_ROWS = 1_000_000
  for (const t of ['projects', 'env_files', 'env_versions', 'secret_hashes']) {
    if (!Array.isArray(tables[t]) || tables[t].length > MAX_ROWS) bad()
    if (!tables[t].every((r) => r && typeof r === 'object' && !Array.isArray(r))) bad()
  }

  for (const r of tables.projects) {
    if (!(isStr(r.id, 200) && isStr(r.name, 500) && isStr(r.path) && path.isAbsolute(r.path as string) && isNum(r.created_at) && isNum(r.updated_at))) bad()
  }
  for (const r of tables.env_files) {
    if (!(isStr(r.id, 200) && isStr(r.project_id, 200) && isSafeTrackedPath(r.relative_path) && (r.is_active === 0 || r.is_active === 1) && isNum(r.created_at) && isNum(r.updated_at))) bad()
  }
  for (const r of tables.env_versions) {
    if (
      !(
        isStr(r.id, 200) && isStr(r.env_file_id, 200) && isInt(r.version_number) && isStr(r.ciphertext, 50_000_000) &&
        isStr(r.iv, 100) && isStr(r.auth_tag, 100) && isStr(r.content_hash, 200) && isInt(r.var_count) &&
        ['watch', 'manual', 'restore'].includes(r.source as string) && (r.note === null || r.note === undefined || isStr(r.note, 2000)) && isNum(r.created_at)
      )
    ) bad()
  }
  for (const r of tables.secret_hashes) {
    if (!(isStr(r.id, 400) && isStr(r.env_version_id, 200) && isStr(r.project_id, 200) && isStr(r.env_file_id, 200) && isStr(r.key_name, 500) && isStr(r.value_hash, 200) && isNum(r.created_at))) bad()
  }
}
