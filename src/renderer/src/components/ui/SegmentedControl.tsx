import React from 'react'
import { cn } from './cn'

export interface SegmentOption<T extends string = string> {
  value: T
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'sm',
  className
}: SegmentedControlProps<T>): React.ReactElement {
  const sizeStyles = {
    sm: 'h-8 p-0.5 text-meta',
    md: 'h-9 p-1 text-ui'
  }

  const itemSizeStyles = {
    sm: 'px-2.5 py-1 gap-1.5',
    md: 'px-3 py-1.5 gap-2'
  }

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center bg-raised border border-line rounded-control select-none',
        sizeStyles[size],
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center font-medium rounded-[4px] transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1',
              itemSizeStyles[size],
              isSelected
                ? 'bg-surface text-fg shadow-sm font-semibold'
                : 'text-fg-muted hover:text-fg hover:bg-surface/50'
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.5 rounded-chip text-meta font-mono',
                  isSelected ? 'bg-line-subtle text-fg' : 'bg-line/40 text-fg-muted'
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
