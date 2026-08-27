import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { privateChatBridge, type ChatNotification } from '../../features/chat/privateChatBridge'
import { useNotifications } from '../../hooks/useNotifications'
import { formatRelativeTime } from '../../lib/relativeTime'
import { notificationText } from '../../lib/notificationText'

interface DisplayItem {
  key: string
  ids: string[]
  read: boolean
  latest: ChatNotification
  messageCount: number
}

/**
 * Opened from the bell icon (see NotificationBell.tsx, added to the Home page header —
 * THE ECHO HUB had no notification entry point before this). Covers all four notification
 * types; accept/decline/open-chat here call the exact same bridge actions as elsewhere
 * (the realtime popup, the chat itself), so acting from any place is equivalent.
 * Consecutive `new_message` notifications for the same room are grouped into one card so
 * an active back-and-forth conversation doesn't spam the list with one row per message.
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  const items = useMemo<DisplayItem[]>(() => {
    const result: DisplayItem[] = []
    const messageGroups = new Map<string, DisplayItem>()
    for (const n of notifications) {
      if (n.type === 'new_message' && n.roomId) {
        const existing = messageGroups.get(n.roomId)
        if (existing) {
          existing.ids.push(n.id)
          existing.read = existing.read && n.read
          existing.messageCount += 1
          continue
        }
        const item: DisplayItem = { key: `room:${n.roomId}`, ids: [n.id], read: n.read, latest: n, messageCount: 1 }
        messageGroups.set(n.roomId, item)
        result.push(item)
        continue
      }
      result.push({ key: n.id, ids: [n.id], read: n.read, latest: n, messageCount: 1 })
    }
    return result
  }, [notifications])

  function openItem(item: DisplayItem) {
    if (!item.read) void Promise.all(item.ids.map((id) => markRead(id)))
  }

  async function handleAccept(n: ChatNotification, ids: string[], e: React.MouseEvent) {
    e.stopPropagation()
    if (!n.requestId) return
    setBusyId(n.id)
    setErrorId(null)
    try {
      const roomId = await privateChatBridge.acceptRequest(n.requestId)
      void Promise.all(ids.map((id) => markRead(id)))
      navigate(`/hub/talk/chat/${roomId}`)
    } catch {
      setErrorId(n.id)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(n: ChatNotification, ids: string[], e: React.MouseEvent) {
    e.stopPropagation()
    if (!n.requestId) return
    setBusyId(n.id)
    setErrorId(null)
    try {
      await privateChatBridge.declineRequest(n.requestId)
      void Promise.all(ids.map((id) => markRead(id)))
    } catch {
      setErrorId(n.id)
    } finally {
      setBusyId(null)
    }
  }

  function openChat(roomId: string, ids: string[], e: React.MouseEvent) {
    e.stopPropagation()
    void Promise.all(ids.map((id) => markRead(id)))
    navigate(`/hub/talk/chat/${roomId}`)
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
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-ink-faint">ยังไม่มีการแจ้งเตือน</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const n = item.latest
              return (
                <Card
                  key={item.key}
                  onClick={() => openItem(item)}
                  className={`cursor-pointer py-4 transition ${item.read ? 'bg-white/90' : 'border-2 border-lavender-200 bg-lavender-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar avatarId={n.fromAvatarId} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-relaxed text-ink">
                          {n.type === 'new_message' && item.messageCount > 1
                            ? `💬 ${n.fromCodename} ส่งข้อความใหม่ ${item.messageCount} ข้อความ`
                            : notificationText(n)}
                        </p>
                        {!item.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden /> : null}
                      </div>
                      {n.type === 'new_message' && n.preview ? (
                        <p className="mt-0.5 truncate text-xs text-ink-soft">{n.preview}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(n.createdAtMs)}</p>

                      {errorId === n.id ? <p className="mt-2 text-xs text-pink-text">ทำรายการไม่สำเร็จ คำขอนี้อาจถูกตอบไปแล้ว</p> : null}

                      {n.type === 'incoming_chat_request' ? (
                        <div className="mt-3 flex gap-2">
                          <Button
                            className="!px-4 !py-2 text-xs"
                            onClick={(e) => handleAccept(n, item.ids, e)}
                            disabled={busyId === n.id}
                          >
                            รับคำขอ
                          </Button>
                          <Button
                            variant="soft-pink"
                            className="!px-4 !py-2 text-xs"
                            onClick={(e) => handleDecline(n, item.ids, e)}
                            disabled={busyId === n.id}
                          >
                            ปฏิเสธ
                          </Button>
                        </div>
                      ) : (n.type === 'chat_request_accepted' || n.type === 'new_message') && n.roomId ? (
                        <div className="mt-3">
                          <Button className="!px-4 !py-2 text-xs" onClick={(e) => openChat(n.roomId!, item.ids, e)}>
                            เข้าแชท
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
