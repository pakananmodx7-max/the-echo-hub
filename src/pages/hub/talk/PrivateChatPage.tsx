import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../../components/Avatar'
import { MessageSafetyNotice } from '../../../components/MessageSafetyNotice'
import { confirmLeavingActiveChat, registerActiveChatGuard } from '../../../features/chat/activeChatNavGuard'
import { evaluateMessageSafety } from '../../../features/messageSafety/evaluateMessageSafety'
import { useAuth } from '../../../hooks/useAuth'
import { useChatRoomMessages } from '../../../hooks/useChatRoomMessages'
import { useNotifications } from '../../../hooks/useNotifications'

const DARK_MODE_KEY = 'echo-hub:chat-dark-mode'
const INTRO_ACK_PREFIX = 'echo-hub:chat-intro-ack:'

function readStoredDarkMode(): boolean {
  try {
    return localStorage.getItem(DARK_MODE_KEY) === '1'
  } catch {
    return false
  }
}

// Per-session, per-device acknowledgement — deliberately local-only (no Firestore field),
// so A and B each see the intro exactly once per NEW room id and acknowledge
// independently; a brand new room id (created after a conversation ends, see
// acceptRequest in privateChatBridge.ts) always reads as un-acknowledged again.
function readIntroAck(roomId: string | undefined): boolean {
  if (!roomId) return false
  try {
    return localStorage.getItem(`${INTRO_ACK_PREFIX}${roomId}`) === '1'
  } catch {
    return false
  }
}

/**
 * The private 1:1 chat thread opened once a chat request is accepted. Only the two
 * room participants can ever reach real messages here — enforced by firestore.rules,
 * not just this UI. No voice/video/file upload and no AI analysis of messages, by design.
 * Visually scoped under `.chat-scope`/`.chat-dark` (see index.css) so the dark mode
 * toggle here never affects the rest of THE ECHO HUB.
 */
export function PrivateChatPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { room, messages, send, sending, end } = useChatRoomMessages(roomId)
  const { notifications, markRead } = useNotifications()
  const [text, setText] = useState('')
  const [darkMode, setDarkMode] = useState(readStoredDarkMode)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  // Synchronous guard against a second invocation landing before the setEnding(true)
  // re-render has actually disabled the button (state updates aren't synchronous).
  const endingRef = useRef(false)
  const [navConfirmOpen, setNavConfirmOpen] = useState(false)
  const navResolveRef = useRef<((leave: boolean) => void) | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [introAcked, setIntroAcked] = useState(() => readIntroAck(roomId))
  const [safetyNotice, setSafetyNotice] = useState<{ severity: 'blocked' | 'critical'; suggestion?: string } | null>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  // Re-derives on every roomId change, not just on mount — the route can hand this same
  // component instance a different room id (e.g. navigating straight from an ended room
  // into a freshly-accepted one) without a full remount.
  useEffect(() => {
    setIntroAcked(readIntroAck(roomId))
  }, [roomId])

  function handleAcknowledgeIntro() {
    if (roomId) {
      try {
        localStorage.setItem(`${INTRO_ACK_PREFIX}${roomId}`, '1')
      } catch {
        // Best-effort persistence only — a private/blocked storage context just means the
        // intro reappears next visit, which is harmless (never blocks chatting this time).
      }
    }
    setIntroAcked(true)
  }

  function toggleDarkMode() {
    setDarkMode((prev) => {
      const next = !prev
      try {
        localStorage.setItem(DARK_MODE_KEY, next ? '1' : '0')
      } catch {
        // Best-effort persistence only — a private/blocked storage context just means the
        // toggle resets next visit, which is harmless.
      }
      return next
    })
  }

  const myPublicId = user?.publicId ?? null
  const partnerId = room?.participants.find((id) => id !== myPublicId) ?? null
  const partner = partnerId ? room?.profiles[partnerId] : null
  const isActive = room?.status === 'active'
  const isEnded = room?.status === 'ended'
  // Shown once per NEW room id, independently for each participant — never for an already-
  // ended room (nothing left to introduce), and not until the room has actually loaded.
  const showIntro = !!room && isActive && !introAcked
  const canChat = isActive && introAcked

  // Marks this room's incoming "new message" bell entries as read while it's open — the
  // user is already looking at the messages, so surfacing a separate unread badge for the
  // same room would be a duplicate notification (see requirement to avoid that).
  useEffect(() => {
    if (!roomId) return
    const unreadForThisRoom = notifications.filter((n) => n.type === 'new_message' && n.roomId === roomId && !n.read)
    for (const n of unreadForThisRoom) void markRead(n.id)
  }, [roomId, notifications, markRead])

  // Registers with BottomNav so pressing a nav tab while this active chat is open can
  // offer a gentle "you can come back later" choice instead of silently vanishing — never
  // forces the user to stay, and only applies while the room is genuinely still active.
  useEffect(() => {
    if (!isActive) return
    return registerActiveChatGuard(
      () =>
        new Promise<boolean>((resolve) => {
          navResolveRef.current = resolve
          setNavConfirmOpen(true)
        }),
    )
  }, [isActive])

  function resolveNavConfirm(leave: boolean) {
    setNavConfirmOpen(false)
    navResolveRef.current?.(leave)
    navResolveRef.current = null
  }

  // The chat's own back arrow is the actual reachable "leave" affordance while the chat's
  // full-screen overlay is open (it covers BottomNav, same as Garden's full-screen pages)
  // — routes through the same guard BottomNav would use elsewhere, so it asks exactly
  // once, never blocks, and reuses the very same confirm dialog.
  async function handleBack() {
    const ok = await confirmLeavingActiveChat()
    if (ok) navigate('/hub/talk')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || !canChat) return
    // Evaluated locally, before anything ever reaches Firestore — an unsafe draft never
    // gets written, and the original text stays right here in the composer so the
    // student can edit and resend (see evaluateMessageSafety.ts).
    const result = evaluateMessageSafety(text)
    if (!result.allowed) {
      setSafetyNotice({ severity: result.severity as 'blocked' | 'critical', suggestion: result.suggestion })
      return
    }
    setSafetyNotice(null)
    const toSend = text
    setText('')
    await send(toSend)
  }

  async function handleConfirmEnd() {
    if (endingRef.current) return
    endingRef.current = true
    console.log('[endConversation] clicked', { roomId })
    setEndError(null)
    setEnding(true)
    try {
      await end()
      // Only the success path closes the modal — a failure must leave it open, with the
      // button re-enabled and an error shown, per the "never silently fail" requirement.
      setEndConfirmOpen(false)
    } catch (err) {
      console.error('[endConversation] confirm_failed', err instanceof Error ? err.message : String(err))
      setEndError('จบการสนทนาไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally {
      setEnding(false)
      endingRef.current = false
    }
  }

  return (
    <div
      className={`chat-scope ${darkMode ? 'chat-dark' : ''} fixed inset-0 z-50 flex flex-col`}
      style={{ background: 'var(--chat-bg)', color: 'var(--chat-text)' }}
    >
      <div
        className="flex items-center gap-3 border-b px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)]"
        style={{ background: 'var(--chat-header-bg)', borderColor: 'var(--chat-border)' }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="ย้อนกลับ"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm active:scale-95 transition"
          style={{ background: 'var(--chat-bubble-in-bg)', color: 'var(--chat-text-soft)' }}
        >
          ←
        </button>
        <Avatar avatarId={partner?.avatarId ?? null} size="sm" />
        <p className="min-w-0 flex-1 truncate font-semibold" style={{ color: 'var(--chat-text)' }}>
          {partner?.codename ?? 'แชทส่วนตัว'}
        </p>
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base active:scale-95 transition"
          style={{ background: 'var(--chat-bubble-in-bg)' }}
        >
          <span aria-hidden>{darkMode ? '☀️' : '🌙'}</span>
        </button>
        {isActive ? (
          <button
            type="button"
            onClick={() => {
              setEndError(null)
              setEndConfirmOpen(true)
            }}
            className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold active:scale-95 transition"
            style={{ background: 'var(--chat-danger-bg)', color: 'var(--chat-danger-text)' }}
          >
            จบการสนทนา
          </button>
        ) : null}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isEnded ? (
          <div
            className="mb-4 whitespace-pre-line rounded-2xl px-4 py-3 text-center text-sm"
            style={{ background: 'var(--chat-system-bg)', color: 'var(--chat-system-text)' }}
          >
            {room?.endedBy === myPublicId
              ? 'คุณได้จบการสนทนานี้แล้ว\nขอบคุณที่รับฟังกันนะ 💜'
              : 'อีกฝ่ายได้จบการสนทนานี้แล้ว\nขอบคุณที่รับฟังกันนะ 💜'}
          </div>
        ) : null}

        {canChat ? (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-sm leading-relaxed"
            style={{ background: 'var(--chat-system-bg)', color: 'var(--chat-system-text)' }}
          >
            <p>💜 คุยกันให้เต็มที่ก่อนจบบทสนทนา</p>
            <p className="mt-1">ออกไปหน้าอื่นได้และกลับมาคุยต่อได้</p>
            <p className="mt-1">
              แต่เมื่อกด &lsquo;จบการสนทนา&rsquo; ห้องนี้จะสิ้นสุด —{' '}
              <span className="font-semibold" style={{ color: 'var(--chat-danger-text)' }}>
                จบการสนทนา = ปิดบทสนทนาครั้งนี้
              </span>
            </p>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--chat-text-faint)' }}>
            เริ่มบทสนทนาได้เลย 🤍
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const mine = m.senderPublicId === myPublicId
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={{
                      background: mine ? 'var(--chat-bubble-out-bg)' : 'var(--chat-bubble-in-bg)',
                      color: mine ? 'var(--chat-bubble-out-text)' : 'var(--chat-bubble-in-text)',
                      boxShadow: mine ? 'none' : 'var(--chat-bubble-in-shadow)',
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isEnded ? (
        <div
          className="flex flex-col gap-2.5 border-t px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          style={{ borderColor: 'var(--chat-border)' }}
        >
          <button
            type="button"
            onClick={() => navigate('/hub/space')}
            className="w-full rounded-2xl px-5 py-3 text-sm font-semibold transition active:scale-95"
            style={{ background: 'var(--chat-accent)', color: 'var(--chat-accent-text)' }}
          >
            กลับ ECHO SPACE
          </button>
        </div>
      ) : canChat ? (
        <div className="border-t px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3" style={{ borderColor: 'var(--chat-border)' }}>
          {safetyNotice ? (
            <div className="mb-2.5">
              <MessageSafetyNotice
                severity={safetyNotice.severity}
                suggestion={safetyNotice.suggestion}
                onUseSuggestion={
                  safetyNotice.suggestion
                    ? () => {
                        setText(safetyNotice.suggestion ?? '')
                        setSafetyNotice(null)
                      }
                    : undefined
                }
                variant="chat"
              />
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (safetyNotice) setSafetyNotice(null)
              }}
              placeholder="พิมพ์ข้อความ..."
              className="min-w-0 flex-1 rounded-2xl border px-4 py-2.5 text-[16px] outline-none disabled:opacity-50"
              style={{ background: 'var(--chat-composer-bg)', borderColor: 'var(--chat-composer-border)', color: 'var(--chat-text)' }}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--chat-accent)', color: 'var(--chat-accent-text)' }}
            >
              ส่ง
            </button>
          </form>
        </div>
      ) : null}

      {endConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          style={{ background: 'var(--chat-modal-overlay)' }}
          onClick={() => !ending && setEndConfirmOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-3xl p-6 shadow-soft animate-modal-in"
            style={{ background: 'var(--chat-modal-bg)', color: 'var(--chat-text)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">ต้องการจบการสนทนานี้หรือไม่?</h2>
            {endError ? (
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--chat-danger-text)' }}>
                {endError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirmEnd}
                disabled={ending}
                className="w-full rounded-2xl px-5 py-3.5 font-semibold text-[15px] transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'var(--chat-danger-bg)', color: 'var(--chat-danger-text)' }}
              >
                {ending ? 'กำลังจบการสนทนา...' : 'จบการสนทนา'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEndError(null)
                  setEndConfirmOpen(false)
                }}
                disabled={ending}
                className="w-full rounded-2xl px-5 py-3.5 font-semibold text-[15px] transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'transparent', color: 'var(--chat-text-soft)' }}
              >
                คุยต่อ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showIntro ? (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          style={{ background: 'var(--chat-modal-overlay)' }}
        >
          <div
            className="w-full sm:max-w-sm rounded-3xl p-6 shadow-soft animate-modal-in"
            style={{ background: 'var(--chat-modal-bg)', color: 'var(--chat-text)' }}
          >
            <h2 className="text-lg font-bold">💜 ก่อนเริ่มบทสนทนา</h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--chat-text-soft)' }}>
              {`พื้นที่นี้เป็นบทสนทนาสำหรับการพูดคุยครั้งนี้

คุณสามารถออกไปหน้าอื่นและกลับมาคุยต่อได้ ตราบใดที่ยังไม่ได้กด 'จบการสนทนา'

แต่เมื่อกด 'จบการสนทนา' ห้องสนทนาครั้งนี้จะสิ้นสุด และจะไม่สามารถส่งข้อความต่อในห้องเดิมได้

เพราะฉะนั้น ลองให้เวลากับบทสนทนานี้
ฟังกันให้จบ พูดกันด้วยความเข้าใจ
และค่อยจบบทสนทนาเมื่อทั้งสองฝ่ายพร้อม 💜`}
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={handleAcknowledgeIntro}
                className="w-full rounded-2xl px-5 py-3.5 font-semibold text-[15px] transition active:scale-[0.98]"
                style={{ background: 'var(--chat-accent)', color: 'var(--chat-accent-text)' }}
              >
                เข้าใจแล้ว — เริ่มคุยกัน
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {navConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4"
          style={{ background: 'var(--chat-modal-overlay)' }}
          onClick={() => resolveNavConfirm(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-3xl p-6 shadow-soft animate-modal-in"
            style={{ background: 'var(--chat-modal-bg)', color: 'var(--chat-text)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm leading-relaxed">การสนทนายังไม่จบ คุณสามารถกลับมาคุยต่อได้ภายหลัง</p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => resolveNavConfirm(true)}
                className="w-full rounded-2xl px-5 py-3.5 font-semibold text-[15px] transition active:scale-[0.98]"
                style={{ background: 'var(--chat-accent)', color: 'var(--chat-accent-text)' }}
              >
                ออกไปก่อน
              </button>
              <button
                type="button"
                onClick={() => resolveNavConfirm(false)}
                className="w-full rounded-2xl px-5 py-3.5 font-semibold text-[15px] transition active:scale-[0.98]"
                style={{ background: 'transparent', color: 'var(--chat-text-soft)' }}
              >
                อยู่ต่อ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
