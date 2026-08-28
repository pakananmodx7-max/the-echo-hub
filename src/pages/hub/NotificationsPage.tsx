import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import {
  privateChatBridge,
  type ChatNotification,
  type ChatRequestRecord,
  type ChatRequestStatus,
} from '../../features/chat/privateChatBridge'
import { getEffectiveRequestStatus, REQUEST_STATUS_LABEL } from '../../features/chat/chatRequestState'
import { useNotifications } from '../../hooks/useNotifications'
import { useReceivedChatRequests } from '../../hooks/useReceivedChatRequests'
import { useSentChatRequests } from '../../hooks/useSentChatRequests'
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
 *
 * A notification is written once, at send time, and never updated afterwards — so for an
 * `incoming_chat_request` card this page never trusts the notification's own type to mean
 * "still actionable". It resolves the real, current chatRequests doc via requestById
 * (built from useReceivedChatRequests + a sent-requests subscription) and renders off that
 * instead, so an already-answered/expired/cancelled request can never show live
 * Accept/Decline buttons here.
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const receivedRequests = useReceivedChatRequests()
  const sentRequests = useSentChatRequests()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  const requestById = useMemo(() => {
    const map = new Map<string, ChatRequestRecord>()
    for (const r of receivedRequests) map.set(r.id, r)
    for (const r of sentRequests) map.set(r.id, r)
    return map
  }, [receivedRequests, sentRequests])

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
    setErrorText(null)
    try {
      const roomId = await privateChatBridge.acceptRequest(n.requestId)
      void Promise.all(ids.map((id) => markRead(id)))
      navigate(`/hub/talk/chat/${roomId}`)
    } catch (err) {
      setErrorId(n.id)
      setErrorText(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ ลองใหม่')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(n: ChatNotification, ids: string[], e: React.MouseEvent) {
    e.stopPropagation()
    if (!n.requestId) return
    setBusyId(n.id)
    setErrorId(null)
    setErrorText(null)
    try {
      await privateChatBridge.declineRequest(n.requestId)
      void Promise.all(ids.map((id) => markRead(id)))
    } catch (err) {
      setErrorId(n.id)
      setErrorText(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ ลองใหม่')
    } finally {
      setBusyId(null)
    }
  }

  function openChat(roomId: string, ids: string[], e: React.MouseEvent) {
    e.stopPropagation()
    void Promise.all(ids.map((id) => markRead(id)))
    navigate(`/hub/talk/chat/${roomId}`)
  }

  /** Real, current state of an incoming_chat_request notification's linked request — null while the underlying subscriptions are still loading their first snapshot. */
  function resolveIncomingRequest(n: ChatNotification): { status: ChatRequestStatus; roomId: string | null } | null {
    if (!n.requestId) return null
    const resolved = requestById.get(n.requestId)
    if (!resolved) return null
    return { status: getEffectiveRequestStatus(resolved), roomId: resolved.roomId }
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
              const incoming = n.type === 'incoming_chat_request' ? resolveIncomingRequest(n) : null
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

                      {errorId === n.id ? <p className="mt-2 text-xs text-pink-text">{errorText}</p> : null}

                      {n.type === 'incoming_chat_request' ? (
                        incoming === null ? null : incoming.status === 'pending' ? (
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
                        ) : incoming.status === 'accepted' ? (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs font-medium text-mint-text">{REQUEST_STATUS_LABEL.accepted}</span>
                            {incoming.roomId ? (
                              <Button
                                className="!px-4 !py-2 text-xs"
                                onClick={(e) => openChat(incoming.roomId!, item.ids, e)}
                              >
                                เข้าแชท
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-ink-faint">{REQUEST_STATUS_LABEL[incoming.status]}</p>
                        )
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
