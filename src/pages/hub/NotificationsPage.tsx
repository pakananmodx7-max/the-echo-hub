import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { privateChatBridge, type ChatNotification } from '../../features/chat/privateChatBridge'
import { useNotifications } from '../../hooks/useNotifications'
import { formatRelativeTime } from '../../lib/relativeTime'
import { notificationText } from '../../lib/notificationText'

/**
 * Opened from the bell icon (see NotificationBell.tsx, added to the Home page header —
 * THE ECHO HUB had no notification entry point before this). Same three notification
 * types the realtime popup already covers; accept/decline here call the exact same
 * bridge actions, so acting from either place is equivalent.
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  function openCard(n: ChatNotification) {
    if (!n.read) void markRead(n.id)
  }

  async function handleAccept(n: ChatNotification, e: React.MouseEvent) {
    e.stopPropagation()
    setBusyId(n.id)
    setErrorId(null)
    try {
      const roomId = await privateChatBridge.acceptRequest(n.requestId)
      void markRead(n.id)
      navigate(`/hub/talk/chat/${roomId}`)
    } catch {
      setErrorId(n.id)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(n: ChatNotification, e: React.MouseEvent) {
    e.stopPropagation()
    setBusyId(n.id)
    setErrorId(null)
    try {
      await privateChatBridge.declineRequest(n.requestId)
      void markRead(n.id)
    } catch {
      setErrorId(n.id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="🔔 การแจ้งเตือน"
        action={
          unreadCount > 0 ? (
            <button type="button" onClick={() => void markAllRead()} className="shrink-0 text-xs font-semibold text-lavender-600">
              อ่านทั้งหมดแล้ว
            </button>
          ) : undefined
        }
      />

      <div className="px-5 pb-6">
        {notifications.length === 0 ? (
          <p className="mt-10 text-center text-sm text-ink-faint">ยังไม่มีการแจ้งเตือน</p>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                onClick={() => openCard(n)}
                className={`cursor-pointer py-4 transition ${n.read ? 'bg-white/90' : 'border-2 border-lavender-200 bg-lavender-50'}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar avatarId={n.fromAvatarId} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-relaxed text-ink">{notificationText(n)}</p>
                      {!n.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden /> : null}
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(n.createdAtMs)}</p>

                    {errorId === n.id ? <p className="mt-2 text-xs text-pink-text">ทำรายการไม่สำเร็จ คำขอนี้อาจถูกตอบไปแล้ว</p> : null}

                    {n.type === 'incoming_chat_request' ? (
                      <div className="mt-3 flex gap-2">
                        <Button className="!px-4 !py-2 text-xs" onClick={(e) => handleAccept(n, e)} disabled={busyId === n.id}>
                          รับคำขอ
                        </Button>
                        <Button
                          variant="soft-pink"
                          className="!px-4 !py-2 text-xs"
                          onClick={(e) => handleDecline(n, e)}
                          disabled={busyId === n.id}
                        >
                          ปฏิเสธ
                        </Button>
                      </div>
                    ) : n.type === 'chat_request_accepted' && n.roomId ? (
                      <div className="mt-3">
                        <Button
                          className="!px-4 !py-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/hub/talk/chat/${n.roomId}`)
                          }}
                        >
                          เข้าแชท
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
