import { parseEnv } from './envParser'
import { DiffEntry, DiffResult } from '../../shared/types'

/**
 * Computes difference between two .env file contents.
 */
export function computeEnvDiff(
  versionAId: string,
  contentA: string,
  versionBId: string,
  contentB: string
): DiffResult {
  const parsedA = parseEnv(contentA)
  const parsedB = parseEnv(contentB)

  const allKeys = new Set([...Object.keys(parsedA.entries), ...Object.keys(parsedB.entries)])
  const entries: DiffEntry[] = []

  let added = 0
  let removed = 0
  let modified = 0
  let unchanged = 0

  for (const key of Array.from(allKeys).sort()) {
    const hasA = Object.prototype.hasOwnProperty.call(parsedA.entries, key)
    const hasB = Object.prototype.hasOwnProperty.call(parsedB.entries, key)

    if (!hasA && hasB) {
      added++
      entries.push({
        key,
        status: 'added',
        newValue: parsedB.entries[key]
      })
    } else if (hasA && !hasB) {
      removed++
      entries.push({
        key,
        status: 'removed',
        oldValue: parsedA.entries[key]
      })
    } else {
      const valA = parsedA.entries[key]
      const valB = parsedB.entries[key]
      if (valA !== valB) {
        modified++
        entries.push({
          key,
          status: 'modified',
          oldValue: valA,
          newValue: valB
        })
      } else {
        unchanged++
        entries.push({
          key,
          status: 'unchanged',
          oldValue: valA,
          newValue: valB
        })
      }
    }
  }

  return {
    versionAId,
    versionBId,
    entries,
    summary: {
      added,
      removed,
      modified,
      unchanged
    }
  }
}
