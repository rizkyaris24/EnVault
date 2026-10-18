import * as path from 'path'
import { isEnvFileName } from '../utils/safePath'

/** Renderer pages we trust: the packaged file URL, or exactly the dev server origin while developing. */
export function isTrustedSenderUrl(url: string | undefined, devUrl: string | undefined): boolean {
  if (!url) return false
  if (url.startsWith('file://')) return true
  if (!devUrl) return false
  const origin = new URL(devUrl).origin
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}

export function isSafeId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v)
}

export function parseTheme(v: unknown): 'system' | 'light' | 'dark' | null {
  return v === 'system' || v === 'light' || v === 'dark' ? v : null
}

export interface AddPayload {
  path: string
  name: string | undefined
  selectedFiles: string[]
}

export function parseAddPayload(v: unknown): AddPayload | null {
  if (!v || typeof v !== 'object') return null
  const { path: p, name, selectedFiles } = v as Record<string, unknown>
  if (typeof p !== 'string' || !path.isAbsolute(p)) return null
  if (name !== undefined && (typeof name !== 'string' || name.length > 200)) return null
  if (!Array.isArray(selectedFiles) || selectedFiles.length > 100) return null
  if (!selectedFiles.every((f) => typeof f === 'string' && isEnvFileName(f))) return null
  return { path: p, name, selectedFiles }
}

/** True when `child` is `parent` or lies beneath it (separator-aware, resolves `..`). */
export function isInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Navigation is only allowed to the page the window already loaded (ignoring hash and query). */
export function isSameAppPage(url: string, loadedUrl: string): boolean {
  try {
    const a = new URL(url)
    const b = new URL(loadedUrl)
    return a.protocol === b.protocol && a.host === b.host && a.pathname === b.pathname
  } catch {
    return false
  }
}
