import React from 'react'
import { cn } from './cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
  inputSize?: 'sm' | 'md'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightElement, inputSize = 'md', type = 'text', ...props }, ref) => {
    const sizeStyles = {
      sm: 'h-8 text-meta px-2.5',
      md: 'h-9 text-ui px-3'
    }

    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-2.5 flex items-center pointer-events-none text-fg-subtle">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full bg-raised text-fg placeholder:text-fg-subtle border border-line rounded-control transition-colors duration-150',
            'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            leftIcon && (inputSize === 'sm' ? 'pl-8' : 'pl-9'),
            rightElement && 'pr-8',
            sizeStyles[inputSize],
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2 flex items-center text-fg-subtle">
            {rightElement}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
