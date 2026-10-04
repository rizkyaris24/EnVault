import React from 'react'
import { cn } from './cn'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
  icon: React.ReactNode
  label: string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', icon, label, disabled, ...props }, ref) => {
    const sizeStyles = {
      sm: 'w-7 h-7 p-1',
      md: 'w-8 h-8 p-1.5'
    }

    const variantStyles = {
      ghost: 'bg-transparent text-fg-muted hover:text-fg hover:bg-raised active:bg-line-subtle',
      secondary: 'bg-surface text-fg border border-line hover:bg-raised active:bg-line-subtle',
      danger: 'bg-transparent text-danger hover:bg-danger/10 active:bg-danger/20'
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-control transition-colors duration-150 select-none disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1',
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
