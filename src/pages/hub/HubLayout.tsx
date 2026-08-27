import { Outlet } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav'
import { IncomingChatRequestModal } from '../../components/IncomingChatRequestModal'
import { useAuth } from '../../hooks/useAuth'
import { usePresenceSession } from '../../features/presence/usePresenceSession'

export function HubLayout() {
  const { user } = useAuth()
  usePresenceSession(user)

  return (
    <div className="min-h-svh bg-cream">
      <div className="mx-auto max-w-md pb-24">
        <Outlet />
      </div>
      <BottomNav />
      <IncomingChatRequestModal />
    </div>
  )
}
