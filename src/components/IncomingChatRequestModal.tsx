import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Modal } from './Modal'
import { MoodBadge } from './MoodBadge'
import { useIncomingChatRequests } from '../hooks/useIncomingChatRequests'

/**
 * Mounted once in HubLayout so an incoming "ขอคุยด้วย" request pops up in real time
 * wherever the recipient currently is in the app, not just on Echo Space. Closing
 * without deciding just dismisses it for this session — it stays answerable from the
 * "คำขอที่ค้างอยู่" review page (see ChatRequestsPage) so a missed popup is never lost.
 */
export function IncomingChatRequestModal() {
  const navigate = useNavigate()
  const { requests, accept, decline } = useIncomingChatRequests()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const current = requests.find((r) => !dismissedIds.has(r.id)) ?? null

  function dismiss() {
    if (!current) return
    setDismissedIds((prev) => new Set(prev).add(current.id))
  }

  async function handleAccept() {
    if (!current) return
    setBusy(true)
    setActionError(null)
    try {
      const roomId = await accept(current.id)
      navigate(`/hub/talk/chat/${roomId}`)
    } catch (err) {
      // A stale request (already answered elsewhere, expired, etc.) needs no special
      // handling here beyond showing why — `requests` is the live subscribeIncomingRequests
      // listener, already filtered to genuinely-pending ones, so it drops this request (and
      // the modal moves to whatever's next) the moment the next snapshot confirms it's gone.
      setActionError(err instanceof Error ? err.message : 'รับคำขอไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline() {
    if (!current) return
    setBusy(true)
    setActionError(null)
    try {
      await decline(current.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ปฏิเสธคำขอไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!current} onClose={dismiss}>
      {current ? (
        <div>
          <div className="flex items-center gap-3">
            <Avatar avatarId={current.fromAvatarId} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{current.fromCodename} อยากคุยกับคุณ</p>
              {current.fromMood ? (
                <div className="mt-1.5">
                  <MoodBadge mood={current.fromMood} />
                </div>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            "คุณสามารถเลือกรับหรือปฏิเสธคำขอนี้ได้ อีกฝ่ายจะไม่เห็นตัวตนจริงของคุณ"
          </p>
          {actionError ? <p className="mt-3 text-sm text-pink-text">{actionError}</p> : null}
          <div className="mt-5 flex flex-col gap-2.5">
            <Button fullWidth onClick={handleAccept} disabled={busy}>
              รับคำขอ 🤍
            </Button>
            <Button fullWidth variant="soft-pink" onClick={handleDecline} disabled={busy}>
              ปฏิเสธ
            </Button>
            <Button fullWidth variant="ghost" onClick={dismiss} disabled={busy}>
              ไว้ทีหลัง
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
