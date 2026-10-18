import * as fs from 'fs'
import * as path from 'path'

const ENV_NAME = /^\.env[A-Za-z0-9._-]*$/

/** Env files are tracked by plain basename (".env", ".env.local"); anything with a separator or traversal is rejected. */
export function isEnvFileName(name: string): boolean {
  return typeof name === 'string' && ENV_NAME.test(name) && !name.includes('..')
}

/**
 * Joins `relative` onto `root` and guarantees the result stays inside the real root.
 * Rejects absolute paths, traversal, null bytes, and a target that is itself a symlink.
 */
export function resolveInside(root: string, relative: string): string {
  if (typeof relative !== 'string' || relative.length === 0 || relative.includes('\0')) {
    throw new Error('Invalid file path')
  }
  if (path.isAbsolute(relative)) {
    throw new Error('Absolute paths are not allowed')
  }

  const realRoot = fs.realpathSync(root)
  const target = path.resolve(realRoot, relative)
  const rel = path.relative(realRoot, target)
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes the project directory')
  }

  try {
    if (fs.lstatSync(target).isSymbolicLink()) {
      throw new Error('Refusing to follow a symlink')
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  return target
}
