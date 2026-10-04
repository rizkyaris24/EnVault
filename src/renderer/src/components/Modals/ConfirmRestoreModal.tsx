import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Dialog, Button } from '../ui'

interface ConfirmRestoreModalProps {
  isOpen: boolean
  fileName: string
  versionNumber: number
  targetPath: string
  isCurrentlyMissing: boolean
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmRestoreModal: React.FC<ConfirmRestoreModalProps> = ({
  isOpen,
  fileName,
  versionNumber,
  targetPath,
  isCurrentlyMissing,
  isLoading,
  onClose,
  onConfirm
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isCurrentlyMissing ? 'Restore Missing File' : 'Rollback File Version'}
      description="Write encrypted snapshot directly to your local filesystem"
      maxWidth="sm"
      footer={
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isLoading}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Write to Disk
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="flex items-start space-x-3 p-3.5 rounded-control bg-raised border border-line text-ui">
          <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <div className="space-y-1 text-meta leading-relaxed">
            <p className="font-medium text-fg">
              {isCurrentlyMissing ? 'File Recreation' : 'File Overwrite Confirmation'}
            </p>
            <p className="text-fg-muted">
              {isCurrentlyMissing
                ? `EnVault will recreate ${fileName} on disk using snapshot v${versionNumber}.`
                : `EnVault will overwrite ${fileName} on disk with snapshot v${versionNumber}. Current disk state will be preserved as a backup snapshot.`}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-meta">
          <div>
            <span className="text-fg-subtle font-medium">Target File Path</span>
            <div className="font-mono text-fg mt-1 px-3 py-2 bg-canvas rounded-control border border-line-subtle break-all select-text">
              {targetPath}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-control bg-canvas border border-line-subtle">
            <span className="text-fg-subtle">Restoring Snapshot</span>
            <span className="font-mono font-medium text-accent">
              Version {versionNumber}
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
