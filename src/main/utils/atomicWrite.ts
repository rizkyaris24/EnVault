import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Atomically writes content to a file by writing to a temporary file,
 * syncing to disk, and renaming over the target destination.
 */
export function atomicWriteFileSync(targetPath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
  const dir = path.dirname(targetPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const randomSuffix = crypto.randomBytes(6).toString('hex')
  const tempPath = path.join(dir, `.${path.basename(targetPath)}.tmp.${randomSuffix}`)

  let fd: number | null = null
  try {
    fd = fs.openSync(tempPath, 'w', 0o600)
    fs.writeFileSync(fd, content, encoding)
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    fd = null

    fs.renameSync(tempPath, targetPath)
  } catch (err) {
    if (fd !== null) {
      try {
        fs.closeSync(fd)
      } catch (_) {}
    }
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath)
      } catch (_) {}
    }
    throw err
  }
}
