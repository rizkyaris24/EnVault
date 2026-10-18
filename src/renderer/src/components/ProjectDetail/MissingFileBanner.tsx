import React from 'react'
import { Button } from '../ui'

interface MissingFileBannerProps {
  fileName: string
  latestVersionNumber?: number
  onRestore: () => void
}

export const MissingFileBanner: React.FC<MissingFileBannerProps> = ({
  fileName,
  latestVersionNumber,
  onRestore
}) => (
  <div
    role="alert"
    className="max-w-[720px] w-full mx-auto px-8 pt-4 flex items-center justify-between gap-4 select-none"
  >
    <p className="text-ui text-fg-muted min-w-0">
      <span className="font-mono text-danger">{fileName}</span> is missing from disk. Snapshot v
      {latestVersionNumber ?? 1} has your secrets.
    </p>
    <Button size="sm" variant="secondary" onClick={onRestore} className="shrink-0">
      Restore file
    </Button>
  </div>
)
