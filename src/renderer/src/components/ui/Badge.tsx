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
    default: 'bg-raised text-fg-muted',
    accent: 'bg-accent/10 text-accent',
    danger: 'bg-danger/10 text-danger',
    success: 'bg-success/10 text-success',
    warn: 'bg-warn/10 text-warn'
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
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-meta font-medium rounded-full select-none',
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
