import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { atomicWriteFileSync } from '../../src/main/utils/atomicWrite'

describe('atomicWriteFileSync', () => {
  const tmpDir = path.join(os.tmpdir(), `envault-test-${Date.now()}`)

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('writes content atomically to target destination', () => {
    const targetFile = path.join(tmpDir, 'project', '.env')
    const content = 'API_SECRET=atomic_content_12345\n'

    atomicWriteFileSync(targetFile, content)

    expect(fs.existsSync(targetFile)).toBe(true)
    expect(fs.readFileSync(targetFile, 'utf8')).toBe(content)

    // Check that no temp files remain in the folder
    const files = fs.readdirSync(path.dirname(targetFile))
    expect(files).toEqual(['.env'])
  })

  it('atomically overwrites existing file without corruption', () => {
    const targetFile = path.join(tmpDir, '.env')
    atomicWriteFileSync(targetFile, 'OLD_CONTENT=true')
    atomicWriteFileSync(targetFile, 'NEW_CONTENT=true')

    expect(fs.readFileSync(targetFile, 'utf8')).toBe('NEW_CONTENT=true')
  })
})
