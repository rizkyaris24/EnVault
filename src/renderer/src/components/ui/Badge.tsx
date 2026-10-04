import React from 'react'
import { cn } from './cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'danger' | 'success' | 'warn'
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  dot = false,
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-raised text-fg-muted border-line',
    accent: 'bg-accent/10 text-accent border-accent/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
    success: 'bg-success/10 text-success border-success/30',
    warn: 'bg-warn/10 text-warn border-warn/30'
  }

  const dotStyles = {
    default: 'bg-fg-muted',
    accent: 'bg-accent',
    danger: 'bg-danger',
    success: 'bg-success',
    warn: 'bg-warn'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-meta font-medium rounded-chip border select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      {children}
    </span>
  )
}
