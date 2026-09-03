import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  hideBack?: boolean
  action?: ReactNode
}

/** Header for the /admin/* dashboard — deliberately separate from PageHeader/BottomNav:
 * the admin shell has no student bottom navigation (spec: "Admin dashboard does NOT need
 * the normal Garden/student bottom navigation"), just Back (where relevant) and Logout. */
export function AdminHeader({ title, subtitle, onBack, hideBack = false, action }: AdminHeaderProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 shadow-sm">
      <div className="flex items-center gap-3">
        {!hideBack ? (
          <button
            type="button"
            onClick={onBack ?? (() => navigate('/admin/counselor'))}
            aria-label="ย้อนกลับ"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream shadow-card text-ink-soft active:scale-95 transition"
          >
            ←
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-ink">{title}</h1>
          {subtitle ? <p className="mt-0.5 truncate text-sm text-ink-soft">{subtitle}</p> : null}
        </div>
        {action}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="shrink-0 rounded-full bg-cream px-3 py-2 text-xs font-semibold text-ink-soft shadow-card active:scale-95 transition"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>
  )
}
