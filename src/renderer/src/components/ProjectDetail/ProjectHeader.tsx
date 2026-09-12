import React from 'react'
import { Project, EnvFile } from '@shared/types'
import {
  ExternalLink,
  Save,
  Code,
  ListFilter,
  History,
  FileText
} from 'lucide-react'

interface ProjectHeaderProps {
  project: Project
  files: EnvFile[]
  selectedFileId: string | null
  activeView: 'table' | 'raw' | 'history'
  versionCount: number
  isBackingUp: boolean
  onSelectFile: (fileId: string) => void
  onChangeView: (view: 'table' | 'raw' | 'history') => void
  onRevealFolder: () => void
  onBackupNow: () => void
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  files,
  selectedFileId,
  activeView,
  versionCount,
  isBackingUp,
  onSelectFile,
  onChangeView,
  onRevealFolder,
  onBackupNow
}) => {
  return (
    <div className="border-b border-palette-slate/60 bg-palette-navy/90 text-palette-white select-none">
      {/* Top breadcrumb & action row */}
      <div className="titlebar-drag-region pt-7 px-6 pb-3 flex items-center justify-between">
        <div className="titlebar-no-drag flex items-center space-x-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-palette-white tracking-tight truncate">
                {project.name}
              </h1>
              <button
                onClick={onRevealFolder}
                className="p-1 rounded-md text-palette-moss hover:text-palette-mint hover:bg-palette-charcoal transition"
                title="Reveal project directory in Finder / Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[11px] font-mono text-palette-stone mt-0.5 truncate max-w-xl">
              {project.path}
            </div>
          </div>
        </div>

        {/* Top Right: Watcher Status & Snapshot Action */}
        <div className="titlebar-no-drag flex items-center space-x-3 shrink-0">
          <div
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-palette-charcoal/80 border border-palette-slate/50 text-[11px] text-palette-stone"
            title="Chokidar background file watcher is monitoring local .env changes"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-palette-mint opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-palette-mint"></span>
            </span>
            <span className="font-medium">Live Watcher</span>
          </div>

          <button
            onClick={onBackupNow}
            disabled={isBackingUp}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-palette-mint hover:bg-palette-teal text-palette-void rounded-lg text-xs font-semibold shadow-md shadow-palette-mint/15 transition active:scale-[0.98] disabled:opacity-50"
            title="Immediately create a new encrypted snapshot of this project"
          >
            <Save className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
            <span>{isBackingUp ? 'Backing up...' : 'Snapshot Now'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Subbar: File Tabs (Left) + View Mode Switcher (Right) */}
      <div className="px-6 flex items-center justify-between border-t border-palette-slate/40 bg-palette-void/40">
        {/* Horizontal scrollable file tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 pr-4 scrollbar-none">
          {files.map((file) => {
            const isSelected = file.id === selectedFileId
            return (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                  isSelected
                    ? 'bg-palette-charcoal text-palette-mint border border-palette-mint/40 font-medium shadow-sm'
                    : 'text-palette-stone hover:text-palette-white hover:bg-palette-surface/80 border border-transparent'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-palette-mint' : 'text-palette-moss'}`} />
                <span>{file.relativePath}</span>
                {!file.existsOnDisk && (
                  <span
                    className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"
                    title="Missing on disk"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* View Mode Segmented Control (Secrets / Raw / History) */}
        <div className="flex items-center space-x-0.5 bg-palette-charcoal p-1 rounded-lg border border-palette-slate/60 shrink-0 my-1.5">
          <button
            onClick={() => onChangeView('table')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeView === 'table'
                ? 'bg-palette-navy text-palette-mint border border-palette-mint/30 shadow-sm'
                : 'text-palette-stone hover:text-palette-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Secrets</span>
          </button>

          <button
            onClick={() => onChangeView('raw')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeView === 'raw'
                ? 'bg-palette-navy text-palette-mint border border-palette-mint/30 shadow-sm'
                : 'text-palette-stone hover:text-palette-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw</span>
          </button>

          <button
            onClick={() => onChangeView('history')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeView === 'history'
                ? 'bg-palette-navy text-palette-mint border border-palette-mint/30 shadow-sm'
                : 'text-palette-stone hover:text-palette-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeView === 'history'
                  ? 'bg-palette-mint/20 text-palette-mint font-semibold'
                  : 'bg-palette-slate text-palette-stone'
              }`}
            >
              {versionCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
