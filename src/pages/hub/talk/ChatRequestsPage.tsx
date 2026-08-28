import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../../components/Avatar'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { MoodBadge } from '../../../components/MoodBadge'
import { PageHeader } from '../../../components/PageHeader'
import { privateChatBridge, type ChatRequestRecord } from '../../../features/chat/privateChatBridge'
import { getEffectiveRequestStatus, isPendingRequest, REQUEST_STATUS_LABEL } from '../../../features/chat/chatRequestState'
import { useAuth } from '../../../hooks/useAuth'
import { useIncomingChatRequests } from '../../../hooks/useIncomingChatRequests'

/**
 * Reachable from the "คำขอคุยที่ค้างอยู่" card on the Talk page — the place to review
 * incoming and outgoing chat requests if the realtime popup was missed or dismissed.
 */
export function ChatRequestsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { requests: incoming, accept, decline } = useIncomingChatRequests()
  const [sent, setSent] = useState<ChatRequestRecord[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.publicId) {
      setSent([])
      return
    }
    return privateChatBridge.subscribeSentRequests(user.publicId, setSent)
  }, [user?.publicId])

  async function handleAccept(requestId: string) {
    setBusyId(requestId)
    setErrorId(null)
    setErrorText(null)
    try {
      const roomId = await accept(requestId)
      navigate(`/hub/talk/chat/${roomId}`)
    } catch (err) {
      setErrorId(requestId)
      setErrorText(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ ลองใหม่')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(requestId: string) {
    setBusyId(requestId)
    setErrorId(null)
    setErrorText(null)
    try {
      await decline(requestId)
    } catch (err) {
      setErrorId(requestId)
      setErrorText(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ ลองใหม่')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(requestId: string) {
    setBusyId(requestId)
    setErrorId(null)
    setErrorText(null)
    try {
      await privateChatBridge.cancelRequest(requestId)
    } catch (err) {
      setErrorId(requestId)
      setErrorText(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ ลองใหม่')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title="คำขอคุยที่ค้างอยู่" subtitle="ทบทวนคำขอที่คุณอาจพลาดไป" />

      <div className="px-5 pb-6">
        <p className="text-sm font-medium text-ink">คำขอที่ส่งมาหาคุณ</p>
        {incoming.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">ยังไม่มีคำขอใหม่</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {incoming.map((r) => (
              <Card key={r.id} className="flex items-center gap-3 py-4">
                <Avatar avatarId={r.fromAvatarId} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{r.fromCodename}</p>
                  {r.fromMood ? (
                    <div className="mt-1">
                      <MoodBadge mood={r.fromMood} />
                    </div>
                  ) : null}
                  {errorId === r.id ? <p className="mt-1 text-xs text-pink-text">{errorText}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Button
                    className="!px-3 !py-2 text-xs"
                    onClick={() => handleAccept(r.id)}
                    disabled={busyId === r.id}
                  >
                    รับคำขอ
                  </Button>
                  <Button
                    variant="soft-pink"
                    className="!px-3 !py-2 text-xs"
                    onClick={() => handleDecline(r.id)}
                    disabled={busyId === r.id}
                  >
                    ปฏิเสธ
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="mt-6 text-sm font-medium text-ink">คำขอที่คุณส่งไป</p>
        {sent.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">คุณยังไม่ได้ส่งคำขอถึงใคร</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {sent.map((r) => {
              const effectiveStatus = getEffectiveRequestStatus(r)
              return (
                <Card key={r.id} className="flex items-center gap-3 py-4">
                  <Avatar avatarId={r.toAvatarId} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{r.toCodename}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{REQUEST_STATUS_LABEL[effectiveStatus]}</p>
                    {errorId === r.id ? <p className="mt-1 text-xs text-pink-text">{errorText}</p> : null}
                  </div>
                  {effectiveStatus === 'accepted' && r.roomId ? (
                    <Button className="shrink-0 !px-3 !py-2 text-xs" onClick={() => navigate(`/hub/talk/chat/${r.roomId}`)}>
                      เปิดแชท
                    </Button>
                  ) : isPendingRequest(r) ? (
                    <Button
                      variant="ghost"
                      className="shrink-0 !px-3 !py-2 text-xs"
                      onClick={() => handleCancel(r.id)}
                      disabled={busyId === r.id}
                    >
                      ยกเลิก
                    </Button>
                  ) : null}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
