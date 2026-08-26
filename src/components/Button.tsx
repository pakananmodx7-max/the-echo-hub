import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft-pink' | 'soft-mint'
  fullWidth?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-lavender-500 text-white shadow-soft hover:bg-lavender-600 active:scale-[0.98]',
  secondary:
    'bg-white text-lavender-600 border-2 border-lavender-200 hover:bg-lavender-50 active:scale-[0.98]',
  ghost: 'bg-transparent text-ink-soft hover:bg-black/5 active:scale-[0.98]',
  'soft-pink': 'bg-pink-glow text-pink-text hover:brightness-95 active:scale-[0.98]',
  'soft-mint': 'bg-mint text-mint-text hover:brightness-95 active:scale-[0.98]',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${fullWidth ? 'w-full' : ''} rounded-2xl px-5 py-3.5 font-semibold text-[15px] transition duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
