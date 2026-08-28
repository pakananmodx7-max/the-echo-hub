import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { ActiveChatReminderBanner } from '../../components/ActiveChatReminderBanner'
import { BottomNav } from '../../components/BottomNav'
import { IncomingChatRequestModal } from '../../components/IncomingChatRequestModal'
import { NewMessageToast } from '../../components/NewMessageToast'
import { SentRequestWatcher } from '../../components/SentRequestWatcher'
import { useAuth } from '../../hooks/useAuth'
import { usePresenceSession } from '../../features/presence/usePresenceSession'

/** Page-to-page navigation inside the hub is lazy-loaded (see App.tsx) — this keeps the
 * bottom nav / modals / toasts mounted and visible during that brief load instead of the
 * whole layout flashing to a spinner, so switching pages still feels instant. */
function PageFallback() {
  return <div className="px-5 pt-10 text-center text-sm text-ink-soft">กำลังโหลด...</div>
}

export function HubLayout() {
  const { user } = useAuth()
  usePresenceSession(user)

  return (
    <div className="min-h-svh bg-cream">
      <div className="mx-auto max-w-md pb-24">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </div>
      <BottomNav />
      <IncomingChatRequestModal />
      <SentRequestWatcher />
      <ActiveChatReminderBanner />
      <NewMessageToast />
    </div>
  )
}
