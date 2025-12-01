import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return <div className={`rounded-lg border bg-white shadow-sm ${className}`} {...props} />
}

export function CardHeader({ className = '', ...props }: CardProps) {
  return <div className={`p-4 border-b ${className}`} {...props} />
}

export function CardTitle({ className = '', ...props }: CardProps) {
  return <h3 className={`text-xl font-semibold leading-none tracking-tight ${className}`} {...props} />
}

export function CardContent({ className = '', ...props }: CardProps) {
  return <div className={`p-4 pt-0 ${className}`} {...props} />
}
