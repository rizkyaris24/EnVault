export interface Project {
  id: string
  name: string
  path: string
  createdAt: number
  updatedAt: number
  fileCount?: number
  hasMissingFiles?: boolean
  reuseWarningCount?: number
}

export interface EnvFile {
  id: string
  projectId: string
  relativePath: string
  isActive: boolean
  createdAt: number
  updatedAt: number
  latestVersion?: EnvVersionSummary
  existsOnDisk?: boolean
}

export interface EnvVersionSummary {
  id: string
  versionNumber: number
  contentHash: string
  varCount: number
  source: 'watch' | 'manual' | 'restore'
  note?: string
  createdAt: number
}

export interface EnvVersion extends EnvVersionSummary {
  envFileId: string
  ciphertext: string
  iv: string
  authTag: string
}

export interface DiscoveredEnvFile {
  relativePath: string
  fullPath: string
  sizeBytes: number
  lineCount: number
  isDefaultChecked: boolean
}

export interface SecretReuseReference {
  projectId: string
  projectName: string
  envFile: string
  keyName: string
}

export interface SecretEntry {
  key: string
  value: string
  rawLine?: string
  isComment?: boolean
  reusedIn?: SecretReuseReference[]
}

export interface DiffEntry {
  key: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  oldValue?: string
  newValue?: string
}

export interface DiffResult {
  versionAId: string
  versionBId: string
  entries: DiffEntry[]
  summary: {
    added: number
    removed: number
    modified: number
    unchanged: number
  }
}

export interface VaultStatus {
  isEncrypted: boolean
  keySource: 'keychain' | 'password'
  totalProjects: number
  totalFiles: number
  totalVersions: number
  reusedSecretCount: number
}

export interface DiscoveredScanProject {
  projectName: string
  projectPath: string
  files: string[]
  isNew: boolean
}

export interface ComputerScanSummary {
  scannedDirectories: number
  discoveredProjects: number
  discoveredFiles: number
  newlyRegisteredProjects: number
  newlyBackedUpFiles: number
  projects: DiscoveredScanProject[]
}

export interface ScanProgressPayload {
  currentDir: string
  projectsFound: number
  filesFound: number
}

export interface IPCResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

