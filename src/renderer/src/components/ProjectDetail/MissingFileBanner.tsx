import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button, Badge } from '../ui'

interface MissingFileBannerProps {
  fileName: string
  latestVersionNumber?: number
  onRestore: () => void
}

export const MissingFileBanner: React.FC<MissingFileBannerProps> = ({
  fileName,
  latestVersionNumber,
  onRestore
}) => {
  return (
    <div className="m-6 p-4 rounded-panel bg-danger/5 border border-danger/30 flex flex-col sm:flex-row sm:items-center justify-between text-fg gap-4 select-none">
      <div className="flex items-start space-x-3 min-w-0">
        <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-title font-medium text-fg truncate">
              File Missing from Disk: <span className="font-mono text-danger">{fileName}</span>
            </h3>
            <Badge variant="danger">
              Recovery Available
            </Badge>
          </div>
          <p className="text-meta text-fg-muted leading-relaxed">
            This file was deleted or moved outside of EnVault. All secrets are preserved in snapshot{' '}
            <span className="font-mono font-medium text-fg px-1.5 py-0.5 rounded-chip bg-surface border border-line-subtle">
              v{latestVersionNumber ?? 1}
            </span>
            .
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="danger"
        onClick={onRestore}
        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        title="Restore file back to local workspace"
        className="shrink-0"
      >
        Restore File
      </Button>
    </div>
  )
}
