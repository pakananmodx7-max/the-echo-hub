import type { MouseEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { confirmLeavingActiveChat } from '../features/chat/activeChatNavGuard'

const TABS = [
  { to: '/hub', label: 'Home', icon: '🏠', end: true },
  { to: '/hub/space', label: 'Space', icon: '💫', end: false },
  { to: '/hub/activities', label: 'Activities', icon: '🤍', end: false },
  { to: '/hub/friends', label: 'Friends', icon: '🫶', end: false },
  { to: '/hub/me', label: 'Me', icon: '👤', end: false },
]

export function BottomNav() {
  const navigate = useNavigate()

  // Normally a no-op (resolves immediately) — only asks anything while an active private
  // chat page is currently mounted, and never blocks leaving, just offers the choice.
  async function handleClick(e: MouseEvent<HTMLAnchorElement>, to: string) {
    e.preventDefault()
    const ok = await confirmLeavingActiveChat()
    if (ok) navigate(to)
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-t border-lavender-100 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-1.5">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              onClick={(e) => handleClick(e, tab.to)}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-2xl py-1.5 mx-1 text-[11px] font-medium transition ${
                  isActive ? 'text-lavender-600 bg-lavender-50' : 'text-ink-faint'
                }`
              }
            >
              <span className="text-xl leading-none" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
