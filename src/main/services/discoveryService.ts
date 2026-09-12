import * as fs from 'fs'
import * as path from 'path'
import { DiscoveredEnvFile } from '../../shared/types'

/**
 * Scans a folder to discover all .env files and returns metadata
 * for the user's selective import checklist.
 */
export function discoverEnvFiles(projectDir: string): DiscoveredEnvFile[] {
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    throw new Error(`Invalid project directory: ${projectDir}`)
  }

  const results: DiscoveredEnvFile[] = []

  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true })

    for (const entry of entries) {
      // Look for files starting with .env
      if (entry.isFile() && entry.name.startsWith('.env')) {
        const fullPath = path.join(projectDir, entry.name)
        try {
          const stats = fs.statSync(fullPath)
          const content = fs.readFileSync(fullPath, 'utf8')
          const lineCount = content.split(/\r?\n/).filter((l) => l.trim().length > 0).length

          const lowerName = entry.name.toLowerCase()
          const isExample = lowerName.includes('example') || lowerName.includes('sample') || lowerName.includes('template')

          results.push({
            relativePath: entry.name,
            fullPath,
            sizeBytes: stats.size,
            lineCount,
            isDefaultChecked: !isExample
          })
        } catch (_) {
          // File might be unreadable or locked, skip
        }
      }
    }
  } catch (err) {
    throw new Error(`Failed to scan directory for .env files: ${(err as Error).message}`)
  }

  // Sort: .env first, then alphabetical
  return results.sort((a, b) => {
    if (a.relativePath === '.env') return -1
    if (b.relativePath === '.env') return 1
    return a.relativePath.localeCompare(b.relativePath)
  })
}
