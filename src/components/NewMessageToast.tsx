import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from './Avatar'
import { useNotifications } from '../hooks/useNotifications'

/**
 * Transient realtime toast for a new message arriving in a room the user isn't currently
 * viewing — e.g. while on Home or Echo Space. Dismissing it only hides this toast locally;
 * it does not mark the notification read, so the bell/Notification Center still reflects
 * it truthfully until the user actually opens that room (see PrivateChatPage, which marks
 * a room's new_message notifications read as soon as it's viewed).
 */
export function NewMessageToast() {
  const location = useLocation()
  const navigate = useNavigate()
  const { notifications } = useNotifications()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const candidate = notifications.find(
    (n) => n.type === 'new_message' && !n.read && n.roomId && location.pathname !== `/hub/talk/chat/${n.roomId}`,
  )

  if (!candidate || dismissedIds.has(candidate.id)) return null

  return (
    <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-40 flex justify-center px-4">
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft border border-lavender-100 animate-fade-in-up">
        <Avatar avatarId={candidate.fromAvatarId} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">💬 {candidate.fromCodename} ส่งข้อความใหม่ถึงคุณ</p>
          {candidate.preview ? <p className="mt-0.5 truncate text-xs text-ink-soft">{candidate.preview}</p> : null}
          <button
            type="button"
            onClick={() => navigate(`/hub/talk/chat/${candidate.roomId}`)}
            className="mt-2 rounded-full bg-lavender-500 px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition"
          >
            กลับไปที่แชท
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDismissedIds((prev) => new Set(prev).add(candidate.id))}
          aria-label="ปิด"
          className="shrink-0 text-ink-faint"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
