import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export interface Logger {
  path: string
  info(msg: string, err?: unknown): void
  warn(msg: string, err?: unknown): void
  error(msg: string, err?: unknown): void
  readTail(maxBytes: number): string
}

const MAX_MESSAGE = 500

const oneLine = (s: string): string => s.replace(/\s*[\r\n]+\s*/g, ' ').slice(0, MAX_MESSAGE)

/**
 * Small rotating file logger. Logs messages only: no stacks and no data, so a secret
 * can never reach the log through an error object.
 */
export function createLogger(dir: string, opts = { maxBytes: 512 * 1024, keep: 3 }): Logger {
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'envault.log')

  const rotate = (): void => {
    try {
      if (fs.statSync(file).size < opts.maxBytes) return
    } catch {
      return
    }
    for (let i = opts.keep; i >= 1; i--) {
      const from = i === 1 ? file : `${file}.${i - 1}`
      if (!fs.existsSync(from)) continue
      if (i === opts.keep) fs.rmSync(`${file}.${i}`, { force: true })
      fs.renameSync(from, `${file}.${i}`)
    }
  }

  const write = (level: string, msg: string, err?: unknown): void => {
    try {
      rotate()
      const detail = err === undefined ? '' : ` | ${oneLine(err instanceof Error ? err.message : String(err))}`
      fs.appendFileSync(file, `${new Date().toISOString()} ${level} ${oneLine(msg)}${detail}\n`)
    } catch {
      // Logging must never take the app down.
    }
  }

  return {
    path: file,
    info: (m, e) => write('INFO', m, e),
    warn: (m, e) => write('WARN', m, e),
    error: (m, e) => write('ERROR', m, e),
    readTail: (maxBytes) => {
      try {
        const buf = fs.readFileSync(file)
        return buf.subarray(Math.max(0, buf.length - maxBytes)).toString('utf8')
      } catch {
        return ''
      }
    }
  }
}

let shared: Logger | null = null

/** App-wide logger in Electron's logs folder; falls back to the console where Electron is unavailable (tests). */
export function getLogger(): Logger {
  if (shared) return shared
  try {
    shared = createLogger(app.getPath('logs'))
  } catch {
    shared = {
      path: '',
      info: (m, e) => console.log(m, e ?? ''),
      warn: (m, e) => console.warn(m, e ?? ''),
      error: (m, e) => console.error(m, e ?? ''),
      readTail: () => ''
    }
  }
  return shared
}
