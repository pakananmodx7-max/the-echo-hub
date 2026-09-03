import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCounselorThread } from '../../../hooks/useCounselorThread'
import { useTheme } from '../../../hooks/useTheme'

const MAX_MESSAGE_LENGTH = 3000

/**
 * The persistent, asynchronous ครูแนะแนว (Counselor) chat — deliberately NOT built on the
 * temporary Private Chat lifecycle (see PrivateChatPage.tsx): there is no "จบการสนทนา", no
 * active-room requirement, no intro-acknowledgement modal, and the admin need not be online.
 * One thread per student, created on their own first message and never deleted; visiting
 * this page again on any later login shows the exact same ongoing conversation. Reuses the
 * same `.chat-scope`/`.chat-dark` visual language as PrivateChatPage for consistency, with
 * everything conversation-lifecycle-specific stripped out.
 */
export function CounselorChatPage() {
  const navigate = useNavigate()
  const { thread, messages, adminReadAtMs, send, sending, loadOlder, loadingOlder, hasMoreHistory } = useCounselorThread()
  const { resolvedTheme } = useTheme()
  const darkMode = resolvedTheme === 'dark'
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  // Only the student's own single latest message ever needs a "ส่งแล้ว/อ่านแล้ว" label —
  // same convention as PrivateChatPage's latestMineMessageId.
  let latestMineMessageId: string | null = null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderRole === 'student') {
      latestMineMessageId = messages[i].id
      break
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setText('')
    await send(trimmed)
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
          onClick={() => navigate('/hub/talk')}
          aria-label="ย้อนกลับ"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm active:scale-95 transition"
          style={{ background: 'var(--chat-bubble-in-bg)', color: 'var(--chat-text-soft)' }}
        >
          ←
        </button>
        <span className="text-2xl" aria-hidden>
          👩‍🏫
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" style={{ color: 'var(--chat-text)' }}>
            ครูแนะแนว
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--chat-text-faint)' }}>
            พื้นที่สำหรับพูดคุยและขอคำปรึกษา
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div
          className="mb-4 whitespace-pre-line rounded-2xl px-4 py-3 text-center text-xs leading-relaxed"
          style={{ background: 'var(--chat-system-bg)', color: 'var(--chat-system-text)' }}
        >
          ฝากข้อความไว้ได้ตลอด ครูแนะแนวจะเข้ามาตอบเมื่อพร้อม
          {'\n'}ข้อความนี้ไม่ใช่บริการฉุกเฉิน และครูอาจไม่ได้ตอบทันที
          {'\n'}หากเป็นเหตุฉุกเฉินหรือมีอันตรายทันที โปรดติดต่อบุคคลที่ไว้ใจหรือบริการฉุกเฉินในพื้นที่
        </div>

        {hasMoreHistory ? (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
              className="rounded-full px-4 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{ background: 'var(--chat-bubble-in-bg)', color: 'var(--chat-text-soft)' }}
            >
              {loadingOlder ? 'กำลังโหลด...' : 'โหลดข้อความก่อนหน้า'}
            </button>
          </div>
        ) : null}

        {messages.length === 0 && !thread ? (
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--chat-text-faint)' }}>
            มีเรื่องอยากปรึกษาไหม? เริ่มพิมพ์ได้เลย 🤍
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const mine = m.senderRole === 'student'
              const showReceipt = mine && m.id === latestMineMessageId
              const isRead = showReceipt && adminReadAtMs != null && m.createdAtMs != null && adminReadAtMs >= m.createdAtMs
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine ? (
                    <span className="mb-0.5 px-1 text-[11px] font-medium" style={{ color: 'var(--chat-text-faint)' }}>
                      ครูแนะแนว
                    </span>
                  ) : null}
                  <div
                    className="max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={{
                      background: mine ? 'var(--chat-bubble-out-bg)' : 'var(--chat-bubble-in-bg)',
                      color: mine ? 'var(--chat-bubble-out-text)' : 'var(--chat-bubble-in-text)',
                      boxShadow: mine ? 'none' : 'var(--chat-bubble-in-shadow)',
                    }}
                  >
                    {m.text}
                  </div>
                  {showReceipt ? (
                    <span className="mt-0.5 px-1 text-[11px] leading-none" style={{ color: 'var(--chat-text-faint)' }}>
                      {isRead ? 'อ่านแล้ว ✓✓' : 'ส่งแล้ว ✓'}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3" style={{ borderColor: 'var(--chat-border)' }}>
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="พิมพ์ข้อความที่อยากปรึกษา..."
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            className="min-w-0 flex-1 resize-none rounded-2xl border px-4 py-2.5 text-[16px] outline-none disabled:opacity-50"
            style={{ background: 'var(--chat-composer-bg)', borderColor: 'var(--chat-composer-border)', color: 'var(--chat-text)', maxHeight: '7rem' }}
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
    </div>
  )
}
