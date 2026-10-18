import React from 'react'
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
}) => (
  <Dialog
    isOpen={isOpen}
    onClose={onClose}
    title={isCurrentlyMissing ? 'Restore missing file' : `Restore snapshot v${versionNumber}`}
    maxWidth="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
          Write to disk
        </Button>
      </>
    }
  >
    <p className="text-ui text-fg-muted">
      {isCurrentlyMissing
        ? `EnVault will recreate ${fileName} from snapshot v${versionNumber}.`
        : `EnVault will overwrite ${fileName} with snapshot v${versionNumber}. The current file is saved as a snapshot first.`}
    </p>
    <p className="mt-3 text-meta font-mono text-fg-subtle break-all select-text">{targetPath}</p>
  </Dialog>
)
