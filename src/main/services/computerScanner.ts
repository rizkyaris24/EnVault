import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { vaultDB } from './db'
import { backupService } from './backupService'
import { fileWatcherService } from './watcher'
import { ComputerScanSummary, DiscoveredScanProject, ScanProgressPayload } from '../../shared/types'

const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.npm',
  '.yarn',
  '.pnpm-store',
  'library',
  'appdata',
  'local settings',
  'application data',
  '.trash',
  'trash',
  'tmp',
  'temp',
  '.cache',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'target',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  'vendor',
  'venv',
  '.venv',
  'env',
  '__pycache__',
  '.cargo',
  '.rustup',
  '.gradle',
  '.m2',
  '.local',
  '.docker'
])

export interface ScanOptions {
  customRootDirs?: string[]
  maxDepth?: number
  onProgress?: (progress: ScanProgressPayload) => void
}

/**
 * Traverses upwards from a .env file to identify the true project root
 * (e.g. looking for package.json, .git, Cargo.toml, go.mod, etc.)
 */
export function identifyProjectRoot(envFilePath: string): { projectDir: string; projectName: string } {
  const dir = path.dirname(envFilePath)
  const rootMarkers = [
    'package.json',
    '.git',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'composer.json',
    'pom.xml',
    'build.gradle'
  ]

  // Check dir itself
  for (const marker of rootMarkers) {
    if (fs.existsSync(path.join(dir, marker))) {
      return {
        projectDir: dir,
        projectName: extractProjectName(dir)
      }
    }
  }

  // Check parent directory
  const parentDir = path.dirname(dir)
  if (parentDir && parentDir !== dir && parentDir !== path.dirname(parentDir)) {
    for (const marker of rootMarkers) {
      if (fs.existsSync(path.join(parentDir, marker))) {
        return {
          projectDir: parentDir,
          projectName: extractProjectName(parentDir)
        }
      }
    }
  }

  return {
    projectDir: dir,
    projectName: extractProjectName(dir)
  }
}

function extractProjectName(dir: string): string {
  const pkgJsonPath = path.join(dir, 'package.json')
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      if (data.name && typeof data.name === 'string') {
        return data.name
      }
    } catch (_) {}
  }
  return path.basename(dir) || 'Untitled Project'
}

/**
 * Recursively scans directory for .env files, respecting ignored folders and max depth.
 */
export function scanDirectoryForEnvFiles(
  rootDir: string,
  maxDepth: number = 6,
  onProgress?: (dir: string) => void
): string[] {
  const foundEnvFiles: string[] = []

  function walk(currentDir: string, currentDepth: number): void {
    if (currentDepth > maxDepth) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch (_) {
      // Permission denied or locked directory
      return
    }

    if (onProgress) {
      onProgress(currentDir)
    }

    for (const entry of entries) {
      const lowerName = entry.name.toLowerCase()

      if (entry.isDirectory()) {
        // Skip ignored directories & hidden folders (except if it's the root being scanned)
        if (IGNORED_DIR_NAMES.has(lowerName)) continue
        if (entry.name.startsWith('.') && currentDepth > 0) continue

        const nextDir = path.join(currentDir, entry.name)
        walk(nextDir, currentDepth + 1)
      } else if (entry.isFile()) {
        if (entry.name.startsWith('.env')) {
          foundEnvFiles.push(path.join(currentDir, entry.name))
        }
      }
    }
  }

  walk(rootDir, 0)
  return foundEnvFiles
}

/**
 * Full Computer / User Home Scan that detects all .env files and
 * immediately registers and backs them up to the vault automatically.
 */
export async function scanComputerAndAutoSave(options?: ScanOptions): Promise<ComputerScanSummary> {
  const homeDir = os.homedir()
  const candidateRoots: string[] = options?.customRootDirs || [
    path.join(homeDir, 'Projects'),
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Developer'),
    path.join(homeDir, 'Code'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'workspace'),
    path.join(homeDir, 'src'),
    path.join(homeDir, 'git'),
    path.join(homeDir, 'github'),
    path.join(homeDir, 'repos'),
    path.join(homeDir, 'dev')
  ]

  // Filter candidate roots that actually exist
  const existingRoots = candidateRoots.filter((r) => fs.existsSync(r))

  // If none of the subfolders exist, fall back to homeDir
  if (existingRoots.length === 0) {
    existingRoots.push(homeDir)
  }

  let scannedDirCount = 0
  const allDiscoveredEnvPaths = new Set<string>()

  const projectMap = new Map<string, { projectName: string; files: Set<string> }>()

  // Perform discovery across candidate roots
  for (const root of existingRoots) {
    const discovered = scanDirectoryForEnvFiles(root, options?.maxDepth ?? 5, (dir) => {
      scannedDirCount++
      if (options?.onProgress && scannedDirCount % 15 === 0) {
        options.onProgress({
          currentDir: dir,
          projectsFound: projectMap.size,
          filesFound: allDiscoveredEnvPaths.size
        })
      }
    })

    for (const envPath of discovered) {
      allDiscoveredEnvPaths.add(envPath)
      const { projectDir, projectName } = identifyProjectRoot(envPath)
      const relPath = path.relative(projectDir, envPath)

      if (!projectMap.has(projectDir)) {
        projectMap.set(projectDir, {
          projectName,
          files: new Set([relPath])
        })
      } else {
        projectMap.get(projectDir)!.files.add(relPath)
      }

      if (options?.onProgress) {
        options.onProgress({
          currentDir: path.dirname(envPath),
          projectsFound: projectMap.size,
          filesFound: allDiscoveredEnvPaths.size
        })
      }
    }
  }

  // Auto-Save: Register projects and create encrypted snapshots in vault
  let newlyRegisteredProjects = 0
  let newlyBackedUpFiles = 0
  const summaryProjects: DiscoveredScanProject[] = []

  for (const [projectDir, info] of projectMap.entries()) {
    let project = vaultDB.getProjectByPath(projectDir)
    let isNewProject = false

    if (!project) {
      const projectId = crypto.randomUUID()
      project = vaultDB.createProject(projectId, info.projectName, projectDir)
      newlyRegisteredProjects++
      isNewProject = true
    }

    const fileList = Array.from(info.files)

    for (const relPath of fileList) {
      let envFile = vaultDB.getEnvFileByPath(project.id, relPath)
      if (!envFile) {
        const fileId = crypto.randomUUID()
        envFile = vaultDB.createEnvFile(fileId, project.id, relPath)
      }

      const backupRes = backupService.backupFile(
        envFile,
        projectDir,
        'manual',
        'Auto-scanned computer backup'
      )
      if (backupRes && !backupRes.skippedDuplicate) {
        newlyBackedUpFiles++
      }
    }

    // Start watching project directory
    fileWatcherService.watchProject(project.id, projectDir)

    summaryProjects.push({
      projectName: info.projectName,
      projectPath: projectDir,
      files: fileList,
      isNew: isNewProject
    })
  }

  return {
    scannedDirectories: scannedDirCount,
    discoveredProjects: projectMap.size,
    discoveredFiles: allDiscoveredEnvPaths.size,
    newlyRegisteredProjects,
    newlyBackedUpFiles,
    projects: summaryProjects
  }
}
