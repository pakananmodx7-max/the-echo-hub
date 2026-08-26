import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-3xl bg-white shadow-card p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
