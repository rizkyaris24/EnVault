#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const rendererDir = path.join(rootDir, 'src', 'renderer', 'src')

const BANNED_PATTERNS = [
  {
    name: 'Pulsing or pinging animation',
    regex: /\b(animate-ping|animate-pulse)\b/g,
    reason: 'Continuous animations violate restrained design and draw unwanted visual attention.'
  },
  {
    name: 'Bounce-style active scale',
    regex: /\bactive:scale-[0-9]+\b/g,
    reason: 'Elastic bounce scaling is an AI slop tell; use subtle opacity/color changes instead.'
  },
  {
    name: 'Sub-12px font size',
    regex: /\btext-\[(10px|11px|9px|8px)\]\b/g,
    reason: 'Hard 12px font floor is required for legibility and accessibility.'
  },
  {
    name: 'Gradient fill on controls',
    regex: /\b(bg-gradient-to-[a-z]+|from-[a-z0-9/-]+|to-[a-z0-9/-]+)\b/g,
    reason: 'Gradient button/card surfaces violate flat, restrained design system principles.'
  },
  {
    name: 'Glowing or colored shadows',
    regex: /\bshadow-(mint|teal|palette|rose|cyan|emerald|blue|purple|2xl)\b/g,
    reason: 'Colored or intense neon drop shadows violate the quiet ledger aesthetic.'
  },
  {
    name: 'Invalid padding utility',
    regex: /\b(py-0\.2|px-0\.2|p-0\.2)\b/g,
    reason: 'Invalid Tailwind padding class; use py-0.5 or px-1 instead.'
  },
  {
    name: 'Legacy palette token',
    regex: /\bpalette-[a-z]+\b/g,
    reason: 'Legacy palette-* tokens are deprecated; use semantic CSS tokens (canvas, surface, raised, line, fg, accent, danger, success, warn).'
  },
  {
    name: 'Emoji in source or UI copy',
    regex: /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u,
    reason: 'Emojis are prohibited across all code, UI copy, and documentation.'
  }
]

let violationsCount = 0

function scanFile(filePath) {
  const relPath = path.relative(rootDir, filePath)
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    for (const rule of BANNED_PATTERNS) {
      if (rule.regex.test(line)) {
        console.error(
          `[FAIL] ${relPath}:${index + 1} - ${rule.name}`
        )
        console.error(`       Line: "${line.trim()}"`)
        console.error(`       Rule: ${rule.reason}\n`)
        violationsCount++
      }
      // Reset stateful regexes
      rule.regex.lastIndex = 0
    }
  })
}

function walkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDirectory(fullPath)
    } else if (/\.(tsx|ts|jsx|js|css|html)$/.test(entry.name)) {
      scanFile(fullPath)
    }
  }
}

console.log('Running EnVault Anti-Slop Design Linter on src/renderer/src...')
walkDirectory(rendererDir)

if (violationsCount > 0) {
  console.error(
    `Design linting failed with ${violationsCount} violation(s). Please fix the issues above.\n`
  )
  process.exit(1)
} else {
  console.log(
    'All design system checks passed: 0 banned patterns, 0 emojis, 100% compliant with Anti-AI Slop guidelines.\n'
  )
  process.exit(0)
}
