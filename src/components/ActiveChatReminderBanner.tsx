import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from './Avatar'
import { useActiveChatRooms } from '../hooks/useActiveChatRooms'
import { useAuth } from '../hooks/useAuth'

/**
 * Small persistent (not a popup, never repeats itself since it's just a steady bar tied
 * to live room state) reminder that an active conversation is still open elsewhere in
 * the app. Hidden while already viewing that exact room. Doubles as the "offer to
 * reconnect" surface after a browser close/reopen or a fresh login — it's driven by
 * Firestore room state, not local/session storage, so it survives either.
 */
export function ActiveChatReminderBanner() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const rooms = useActiveChatRooms()

  const room = rooms[0]
  if (!room) return null
  if (location.pathname === `/hub/talk/chat/${room.id}`) return null

  const partnerId = room.participants.find((id) => id !== user?.publicId)
  const partner = partnerId ? room.profiles[partnerId] : null

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
      <button
        type="button"
        onClick={() => navigate(`/hub/talk/chat/${room.id}`)}
        className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-lavender-500 px-4 py-3 text-left text-white shadow-soft active:scale-[0.98] transition"
      >
        <Avatar avatarId={partner?.avatarId ?? null} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          💬 คุณยังมีการสนทนากับ {partner?.codename ?? 'เพื่อน'} ที่ยังไม่จบ
        </span>
        <span className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">กลับไปคุยต่อ</span>
      </button>
    </div>
  )
}
