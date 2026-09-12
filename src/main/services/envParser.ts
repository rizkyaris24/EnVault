export interface ParsedEnvLine {
  type: 'variable' | 'comment' | 'empty'
  key?: string
  value?: string
  rawLine: string
}

export interface ParsedEnvFile {
  entries: Record<string, string>
  lines: ParsedEnvLine[]
}

/**
 * Tolerant .env parser that handles:
 * - Empty lines & comments
 * - `export KEY=VALUE`
 * - Single and double quotes
 * - Multiline quoted values
 * - Escaped characters
 */
export function parseEnv(content: string): ParsedEnvFile {
  const entries: Record<string, string> = {}
  const lines: ParsedEnvLine[] = []

  // Normalize line breaks
  const rawLines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let i = 0
  while (i < rawLines.length) {
    const rawLine = rawLines[i]
    const trimmed = rawLine.trim()

    // 1. Empty lines
    if (trimmed === '') {
      lines.push({ type: 'empty', rawLine })
      i++
      continue
    }

    // 2. Full-line comment
    if (trimmed.startsWith('#')) {
      lines.push({ type: 'comment', rawLine })
      i++
      continue
    }

    // 3. Variable definition (optional 'export ')
    let lineToParse = rawLine
    const trimmedLine = lineToParse.trim()
    let isExport = false

    if (trimmedLine.startsWith('export ') || trimmedLine.startsWith('export\t')) {
      isExport = true
      lineToParse = trimmedLine.replace(/^export\s+/, '')
    }

    const equalIndex = lineToParse.indexOf('=')
    if (equalIndex === -1) {
      // Invalid or unrecognized line, treat as comment/raw
      lines.push({ type: 'comment', rawLine })
      i++
      continue
    }

    const key = lineToParse.slice(0, equalIndex).trim()
    let rest = lineToParse.slice(equalIndex + 1).trim()

    // Value parsing: check quotes or multiline
    let value = ''
    if (rest.startsWith('"')) {
      // Double-quoted value, might span multiple lines
      let quoteAccumulator = rest.slice(1)
      let foundClosing = false

      while (true) {
        // Look for closing unescaped quote
        let escaped = false
        let closingIdx = -1
        for (let c = 0; c < quoteAccumulator.length; c++) {
          if (escaped) {
            escaped = false
            continue
          }
          if (quoteAccumulator[c] === '\\') {
            escaped = true
            continue
          }
          if (quoteAccumulator[c] === '"') {
            closingIdx = c
            break
          }
        }

        if (closingIdx !== -1) {
          // Found closing quote
          const rawVal = quoteAccumulator.slice(0, closingIdx)
          value = unescapeDoubleQuotes(rawVal)
          foundClosing = true
          break
        } else {
          // Multiline quote continuation
          i++
          if (i >= rawLines.length) {
            // End of file without closing quote, unescape what we have
            value = unescapeDoubleQuotes(quoteAccumulator)
            break
          }
          quoteAccumulator += '\n' + rawLines[i]
        }
      }
    } else if (rest.startsWith("'")) {
      // Single-quoted value, might span multiple lines
      let quoteAccumulator = rest.slice(1)
      while (true) {
        const closingIdx = quoteAccumulator.indexOf("'")
        if (closingIdx !== -1) {
          value = quoteAccumulator.slice(0, closingIdx)
          break
        } else {
          i++
          if (i >= rawLines.length) {
            value = quoteAccumulator
            break
          }
          quoteAccumulator += '\n' + rawLines[i]
        }
      }
    } else {
      // Unquoted value: strip trailing inline comments starting with '#'
      const commentIdx = rest.indexOf(' #')
      if (commentIdx !== -1) {
        rest = rest.slice(0, commentIdx)
      }
      value = rest.trim()
    }

    entries[key] = value
    lines.push({
      type: 'variable',
      key,
      value,
      rawLine
    })

    i++
  }

  return { entries, lines }
}

function unescapeDoubleQuotes(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/**
 * Serializes key-value dictionary into formatted .env string.
 */
export function serializeEnv(entries: Record<string, string>): string {
  const result: string[] = []
  for (const [key, value] of Object.entries(entries)) {
    if (value.includes('\n') || value.includes('"') || value.includes(' ') || value.includes('#')) {
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
      result.push(`${key}="${escaped}"`)
    } else {
      result.push(`${key}=${value}`)
    }
  }
  return result.join('\n') + '\n'
}
