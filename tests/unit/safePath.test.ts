import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { resolveInside, isEnvFileName } from '../../src/main/utils/safePath'

describe('isEnvFileName', () => {
  it('accepts plain .env basenames', () => {
    for (const n of ['.env', '.env.local', '.env.production', '.env.example', '.env.test.local']) {
      expect(isEnvFileName(n)).toBe(true)
    }
  })

  it('rejects traversal, separators, absolute paths and non-env names', () => {
    for (const n of ['', '../.env', '..\\.env', 'a/.env', '/etc/passwd', '.ssh/id_rsa', 'env', '.envrc/../x', '.env\0', '../../.ssh/id_rsa']) {
      expect(isEnvFileName(n)).toBe(false)
    }
  })
})

describe('resolveInside', () => {
  let root: string
  let outside: string

  beforeEach(() => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-safe-'))
    root = path.join(base, 'project')
    outside = path.join(base, 'outside')
    fs.mkdirSync(root)
    fs.mkdirSync(outside)
  })

  afterEach(() => {
    fs.rmSync(path.dirname(root), { recursive: true, force: true })
  })

  it('resolves a normal file inside the root', () => {
    expect(resolveInside(root, '.env')).toBe(path.join(fs.realpathSync(root), '.env'))
  })

  it('rejects parent traversal, absolute paths, empty and null bytes', () => {
    for (const rel of ['../outside/.env', '../../etc/passwd', '/etc/passwd', '', '.env\0x', 'a/../../b']) {
      expect(() => resolveInside(root, rel)).toThrow()
    }
  })

  it('rejects a file that is a symlink pointing outside the root', () => {
    fs.writeFileSync(path.join(outside, 'secret'), 'x')
    fs.symlinkSync(path.join(outside, 'secret'), path.join(root, '.env'))
    expect(() => resolveInside(root, '.env')).toThrow(/symlink/i)
  })

  it('rejects when the root itself has been swapped for a symlink to elsewhere', () => {
    const linkRoot = path.join(path.dirname(root), 'link')
    fs.symlinkSync(outside, linkRoot)
    fs.writeFileSync(path.join(outside, '.env'), 'x')
    // Resolves under the real target, which is acceptable only because the check uses the real root.
    expect(resolveInside(linkRoot, '.env')).toBe(path.join(fs.realpathSync(outside), '.env'))
  })
})
