import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as crypto from 'crypto'
import { vaultDB } from '../../src/main/services/db'
import { vaultCrypto } from '../../src/main/services/crypto'
import {
  identifyProjectRoot,
  scanDirectoryForEnvFiles,
  scanComputerAndAutoSave
} from '../../src/main/services/computerScanner'

describe('computerScanner', () => {
  let tmpRoot: string

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `envault-scan-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`)
    fs.mkdirSync(tmpRoot, { recursive: true })

    const dbPath = path.join(tmpRoot, 'vault.db')
    vaultDB.init(dbPath)
    vaultCrypto.setTestKey(crypto.randomBytes(32), 'test-scan-pepper')
  })

  afterEach(() => {
    vaultDB.close()
    if (fs.existsSync(tmpRoot)) {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true })
      } catch (_) {}
    }
  })

  it('identifies project root by package.json and .git', () => {
    const projectDir = path.join(tmpRoot, 'backend-api')
    fs.mkdirSync(projectDir, { recursive: true })
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify({ name: '@corp/backend-api' }),
      'utf8'
    )

    const envFile = path.join(projectDir, '.env')
    fs.writeFileSync(envFile, 'PORT=8000', 'utf8')

    const rootInfo = identifyProjectRoot(envFile)
    expect(rootInfo.projectDir).toBe(projectDir)
    expect(rootInfo.projectName).toBe('@corp/backend-api')
  })

  it('scans directory recursively while ignoring node_modules, .git, and build dirs', () => {
    const projectDir = path.join(tmpRoot, 'my-project')
    fs.mkdirSync(projectDir, { recursive: true })
    fs.writeFileSync(path.join(projectDir, '.env'), 'APP_ENV=development', 'utf8')
    fs.writeFileSync(path.join(projectDir, '.env.local'), 'LOCAL_SECRET=abc', 'utf8')

    // Inside node_modules (must be IGNORED)
    const nodeModulesDir = path.join(projectDir, 'node_modules', 'some-dep')
    fs.mkdirSync(nodeModulesDir, { recursive: true })
    fs.writeFileSync(path.join(nodeModulesDir, '.env'), 'IGNORED=true', 'utf8')

    // Inside .git (must be IGNORED)
    const gitDir = path.join(projectDir, '.git', 'hooks')
    fs.mkdirSync(gitDir, { recursive: true })
    fs.writeFileSync(path.join(gitDir, '.env'), 'IGNORED_GIT=true', 'utf8')

    const discovered = scanDirectoryForEnvFiles(tmpRoot)

    expect(discovered).toHaveLength(2)
    expect(discovered.some((p) => p.endsWith('.env'))).toBe(true)
    expect(discovered.some((p) => p.endsWith('.env.local'))).toBe(true)
    expect(discovered.some((p) => p.includes('node_modules'))).toBe(false)
    expect(discovered.some((p) => p.includes('.git'))).toBe(false)
  })

  it('performs full computer/folder scan and automatically saves discovered projects to vault', async () => {
    // Setup Project 1
    const proj1 = path.join(tmpRoot, 'dev', 'service-a')
    fs.mkdirSync(proj1, { recursive: true })
    fs.writeFileSync(
      path.join(proj1, 'package.json'),
      JSON.stringify({ name: 'service-a' }),
      'utf8'
    )
    fs.writeFileSync(path.join(proj1, '.env'), 'SERVICE_A_KEY=secret_key_a', 'utf8')

    // Setup Project 2
    const proj2 = path.join(tmpRoot, 'dev', 'service-b')
    fs.mkdirSync(proj2, { recursive: true })
    fs.writeFileSync(
      path.join(proj2, 'package.json'),
      JSON.stringify({ name: 'service-b' }),
      'utf8'
    )
    fs.writeFileSync(path.join(proj2, '.env'), 'SERVICE_B_KEY=secret_key_b', 'utf8')
    fs.writeFileSync(path.join(proj2, '.env.production'), 'SERVICE_B_KEY=prod_key_b', 'utf8')

    // Run computer scan pointing custom roots to tmpRoot
    const summary = await scanComputerAndAutoSave({
      customRootDirs: [path.join(tmpRoot, 'dev')]
    })

    expect(summary.discoveredProjects).toBe(2)
    expect(summary.discoveredFiles).toBe(3)
    expect(summary.newlyRegisteredProjects).toBe(2)
    expect(summary.newlyBackedUpFiles).toBe(3)

    // Verify projects exist in SQLite
    const projectsInDb = vaultDB.getProjects()
    expect(projectsInDb).toHaveLength(2)

    const projectA = projectsInDb.find((p) => p.name === 'service-a')
    expect(projectA).toBeDefined()
    const filesA = vaultDB.getEnvFiles(projectA!.id)
    expect(filesA).toHaveLength(1)
    expect(filesA[0].relativePath).toBe('.env')
    expect(filesA[0].latestVersion?.versionNumber).toBe(1)

    // Run scan a second time: should recognize existing projects and not duplicate them
    const secondSummary = await scanComputerAndAutoSave({
      customRootDirs: [path.join(tmpRoot, 'dev')]
    })
    expect(secondSummary.discoveredProjects).toBe(2)
    expect(secondSummary.newlyRegisteredProjects).toBe(0)
    expect(secondSummary.newlyBackedUpFiles).toBe(0) // unchanged content skipped
  })
})
