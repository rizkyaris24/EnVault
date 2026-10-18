import React from 'react'
import { cn } from './cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none rounded-full focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1'

    const sizeStyles = {
      sm: 'h-8 px-3.5 text-meta gap-1.5',
      md: 'h-10 px-5 text-ui gap-2'
    }

    const variantStyles = {
      primary:
        'bg-fg text-canvas hover:opacity-85 active:opacity-75',
      secondary:
        'bg-raised hover:bg-line text-fg active:bg-line',
      ghost:
        'bg-transparent hover:bg-raised text-fg-muted hover:text-fg active:bg-line-subtle',
      danger:
        'bg-danger text-on-accent hover:opacity-90 active:opacity-80'
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
