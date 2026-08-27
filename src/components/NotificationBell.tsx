import { Link } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'

/**
 * THE ECHO HUB previously had no notification entry point at all — this is a new,
 * single addition (Home page header) rather than a redesign of any existing element.
 * Opens the Notification Center; the red badge shows the live unread count.
 */
export function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <Link
      to="/hub/notifications"
      aria-label="การแจ้งเตือน"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-card text-lg active:scale-95 transition"
    >
      <span aria-hidden>🔔</span>
      {unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Link>
  )
}
