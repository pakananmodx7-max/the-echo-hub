import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  hideBack?: boolean
  action?: ReactNode
}

export function PageHeader({ title, subtitle, onBack, hideBack = false, action }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
      <div className="flex items-center gap-3">
        {!hideBack ? (
          <button
            type="button"
            onClick={onBack ?? (() => navigate(-1))}
            aria-label="ย้อนกลับ"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-card text-ink-soft active:scale-95 transition"
          >
            ←
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-ink">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  )
}
