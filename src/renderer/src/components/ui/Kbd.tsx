import React from 'react'
import { cn } from './cn'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  shortcut?: string
}

export const Kbd: React.FC<KbdProps> = ({ className, shortcut, children, ...props }) => {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center font-mono text-meta px-1.5 py-0.5 min-w-[20px] h-5 rounded-chip bg-surface text-fg-subtle border border-line select-none leading-none box-border',
        className
      )}
      {...props}
    >
      {shortcut || children}
    </kbd>
  )
}
