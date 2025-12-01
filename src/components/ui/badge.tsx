import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'secondary' | 'outline' | 'default'
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const styles: Record<string, string> = {
    default: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    outline: 'bg-transparent text-gray-800 border-gray-300'
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        styles[variant] || styles.default
      } ${className}`}
      {...props}
    />
  )
}
