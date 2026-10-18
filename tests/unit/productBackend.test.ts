import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { parseSetting } from '../../src/main/ipc/validate'
import { VaultDB } from '../../src/main/services/db'
import { loadWindowState, saveWindowState, fitToDisplays } from '../../src/main/utils/windowState'

describe('parseSetting', () => {
  it('accepts only known keys with valid values', () => {
    expect(parseSetting('onboarding_done', '1')).toEqual({ key: 'onboarding_done', value: '1' })
    expect(parseSetting('retention_days', '365')).toEqual({ key: 'retention_days', value: '365' })
    expect(parseSetting('quit_on_close', '0')).toEqual({ key: 'quit_on_close', value: '0' })
    expect(parseSetting('auto_update', '1')).toEqual({ key: 'auto_update', value: '1' })
    expect(parseSetting('auto_update', 'maybe')).toBeNull()
  })

  it('rejects unknown keys and bad values, including key material', () => {
    expect(parseSetting('encrypted_dek', 'x')).toBeNull()
    expect(parseSetting('dek_wrap_pass', '{}')).toBeNull()
    expect(parseSetting('retention_days', '7')).toBeNull()
    expect(parseSetting('quit_on_close', 'yes')).toBeNull()
    expect(parseSetting('onboarding_done', '0')).toBeNull()
    expect(parseSetting(5 as any, '1')).toBeNull()
  })
})

describe('retention setting', () => {
  let dir: string
  let db: VaultDB
  const DAY = 86_400_000
  afterEach(() => {
    db?.close()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  function setup(ageDays = 400): void {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-set-'))
    db = new VaultDB()
    db.init(path.join(dir, 'v.db'))
    db.createProject('p', 'P', '/tmp/p')
    db.createEnvFile('f', 'p', '.env')
    for (let i = 1; i <= 60; i++) {
      db.createVersion({
        id: `v${i}`, envFileId: 'f', versionNumber: i, ciphertext: 'c', iv: 'i', authTag: 't',
        contentHash: `h${i}`, varCount: 1, source: 'watch', createdAt: Date.now() - ageDays * DAY + i
      })
    }
  }

  it('defaults to 90 days and keeps the newest 50', () => {
    setup()
    expect(db.getRetention()).toEqual({ maxAgeMs: 90 * DAY, keepNewest: 50 })
    db.applyRetention()
    expect(db.getVersions('f')).toHaveLength(50)
  })

  it('"0" means keep forever: nothing is pruned', () => {
    setup()
    db.setMeta('retention_days', '0')
    expect(db.getRetention()).toBeNull()
    expect(db.applyRetention()).toBe(0)
    expect(db.getVersions('f')).toHaveLength(60)
  })

  it('a longer window keeps versions beyond the newest 50 while they are inside it', () => {
    setup(200)
    db.setMeta('retention_days', '365')
    expect(db.applyRetention('f')).toBe(0)
    expect(db.getVersions('f')).toHaveLength(60)
  })
})

describe('window state', () => {
  let dir: string
  afterEach(() => dir && fs.rmSync(dir, { recursive: true, force: true }))

  it('round-trips and falls back to defaults on missing or corrupt files', () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-ws-'))
    const file = path.join(dir, 'window-state.json')
    expect(loadWindowState(file)).toBeNull()
    saveWindowState(file, { x: 10, y: 20, width: 1000, height: 700 })
    expect(loadWindowState(file)).toEqual({ x: 10, y: 20, width: 1000, height: 700 })
    fs.writeFileSync(file, '{not json')
    expect(loadWindowState(file)).toBeNull()
    fs.writeFileSync(file, JSON.stringify({ x: 'a', y: 1, width: 5, height: 5 }))
    expect(loadWindowState(file)).toBeNull()
  })

  it('moves a window that is off every display back on screen', () => {
    const displays = [{ x: 0, y: 0, width: 1440, height: 900 }]
    expect(fitToDisplays({ x: 100, y: 100, width: 1000, height: 700 }, displays)).toEqual({ x: 100, y: 100, width: 1000, height: 700 })
    const moved = fitToDisplays({ x: 5000, y: 3000, width: 1000, height: 700 }, displays)
    expect(moved.x).toBeUndefined()
    expect(moved.width).toBe(1000)
    expect(fitToDisplays({ width: 900, height: 600 }, displays)).toEqual({ width: 900, height: 600 })
  })

  it('never restores a window smaller than the minimum size', () => {
    const displays = [{ x: 0, y: 0, width: 1440, height: 900 }]
    const fit = fitToDisplays({ x: 0, y: 0, width: 100, height: 100 }, displays)
    expect(fit.width).toBeGreaterThanOrEqual(860)
    expect(fit.height).toBeGreaterThanOrEqual(560)
  })
})

import { buildDiagnostics } from '../../src/main/services/diagnostics'

describe('buildDiagnostics', () => {
  const base = {
    appVersion: '1.0.0', electron: '34', chrome: '132', platform: 'darwin', arch: 'arm64', osRelease: '24.0.0',
    vaultState: 'ready', keySource: 'keychain', hasRecovery: true, schemaVersion: 2,
    stats: { totalProjects: 3, totalFiles: 5, totalVersions: 9 }, retentionDays: '90', quitOnClose: '0',
    logTail: ''
  }

  it('summarizes the vault with counts and settings only', () => {
    const text = buildDiagnostics(base)
    expect(text).toContain('EnVault 1.0.0')
    expect(text).toContain('key source keychain, recovery passphrase set')
    expect(text).toContain('Projects 3, files 5, versions 9')
    expect(text).toContain('Retention 90 days')
    expect(text).toContain('keep running after window closes: yes')
    expect(text).toContain('(empty)')
  })

  it('includes only the last 60 log lines and reports keep-all retention', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n')
    const text = buildDiagnostics({ ...base, retentionDays: '0', logTail: lines })
    expect(text).toContain('line 99')
    expect(text).toContain('line 40')
    expect(text).not.toContain('line 39\n')
    expect(text).toContain('Retention keep all')
  })
})

import { createAttemptLimiter } from '../../src/main/utils/attemptLimiter'
import { isTrustedSenderUrl } from '../../src/main/ipc/validate'

describe('diagnostics path scrubbing', () => {
  it('removes filesystem paths from the log tail', () => {
    const text = buildDiagnostics({
      appVersion: '1.0.0', electron: '34', chrome: '132', platform: 'darwin', arch: 'arm64', osRelease: '24',
      vaultState: 'ready', keySource: 'keychain', hasRecovery: true, schemaVersion: 2,
      stats: { totalProjects: 1, totalFiles: 1, totalVersions: 1 }, retentionDays: '90', quitOnClose: '0',
      logTail: '2026-10-18T10:00:00Z ERROR File watcher error for project p1 | EMFILE: too many open files, watch /Users/jane/Clients/Acme/.env\n' +
        '2026-10-18T10:00:01Z INFO started'
    })
    expect(text).not.toContain('/Users/jane')
    expect(text).not.toContain('Acme')
    expect(text).toContain('<path>')
    expect(text).toContain('INFO started')
  })
})

describe('createAttemptLimiter', () => {
  it('allows a few free attempts, then backs off exponentially, and resets on success', () => {
    let now = 0
    const lim = createAttemptLimiter({ freeAttempts: 3, baseDelayMs: 1000, maxDelayMs: 8000, now: () => now })
    for (let i = 0; i < 3; i++) {
      expect(lim.waitMs()).toBe(0)
      lim.fail()
    }
    expect(lim.waitMs()).toBe(1000) // 4th failure state
    now += 1000
    expect(lim.waitMs()).toBe(0)
    lim.fail()
    expect(lim.waitMs()).toBe(2000)
    now += 2000
    lim.fail()
    now += 1
    expect(lim.waitMs()).toBe(3999)
    now += 4000
    lim.fail(); lim.fail(); lim.fail()
    expect(lim.waitMs()).toBeLessThanOrEqual(8000)
    lim.succeed()
    expect(lim.waitMs()).toBe(0)
  })
})

describe('isTrustedSenderUrl robustness', () => {
  it('does not throw on a malformed dev URL and then trusts nothing but file pages', () => {
    expect(isTrustedSenderUrl('http://localhost:5173/', 'not a url')).toBe(false)
    expect(isTrustedSenderUrl('file:///app/index.html', 'not a url')).toBe(true)
  })
})
