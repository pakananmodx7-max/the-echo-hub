import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminHeader } from '../../components/AdminHeader'
import { useCounselorThreadAdmin } from '../../hooks/useCounselorThreadAdmin'

const MAX_MESSAGE_LENGTH = 5000

/** Admin's view of one student's counselor thread (/admin/counselor/:studentUid) — reply,
 * message history with pagination, and the student's own read-receipt on the admin's latest
 * reply. Opening this page marks the thread read for the admin (see useCounselorThreadAdmin). */
export function AdminCounselorChatPage() {
  const { studentUid } = useParams<{ studentUid: string }>()
  const navigate = useNavigate()
  const { thread, messages, studentReadAtMs, reply, sending, loadOlder, loadingOlder, hasMoreHistory } =
    useCounselorThreadAdmin(studentUid)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  let latestMineMessageId: string | null = null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderRole === 'admin') {
      latestMineMessageId = messages[i].id
      break
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setText('')
    await reply(trimmed)
  }

  return (
    <div className="flex min-h-svh flex-col bg-cream">
      <AdminHeader title={thread?.studentDisplayName ?? 'บทสนทนา'} onBack={() => navigate('/admin/counselor')} />

      <div ref={listRef} data-testid="admin-chat-messages" className="flex-1 overflow-y-auto px-5 py-4">
        {!thread ? (
          <p className="mt-10 text-center text-sm text-ink-faint">กำลังโหลด...</p>
        ) : (
          <>
            {hasMoreHistory ? (
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-ink-soft shadow-card disabled:opacity-50"
                >
                  {loadingOlder ? 'กำลังโหลด...' : 'โหลดข้อความก่อนหน้า'}
                </button>
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5">
              {messages.map((m) => {
                const mine = m.senderRole === 'admin'
                const showReceipt = mine && m.id === latestMineMessageId
                const isRead = showReceipt && studentReadAtMs != null && m.createdAtMs != null && studentReadAtMs >= m.createdAtMs
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine ? (
                      <span className="mb-0.5 px-1 text-[11px] font-medium text-ink-faint">Student</span>
                    ) : (
                      <span className="mb-0.5 px-1 text-[11px] font-medium text-ink-faint">Admin</span>
                    )}
                    <div
                      className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        mine ? 'bg-lavender-500 text-white' : 'bg-white text-ink shadow-card'
                      }`}
                    >
                      {m.text}
                    </div>
                    {showReceipt ? (
                      <span className="mt-0.5 px-1 text-[11px] leading-none text-ink-faint">
                        {isRead ? 'อ่านแล้ว ✓✓' : 'ส่งแล้ว ✓'}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-lavender-100 bg-white px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="พิมพ์ข้อความตอบกลับ..."
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            className="min-w-0 flex-1 resize-none rounded-2xl border border-lavender-100 bg-cream px-4 py-2.5 text-[16px] text-ink outline-none focus:border-lavender-400"
            style={{ maxHeight: '7rem' }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim() || !thread}
            className="shrink-0 rounded-full bg-lavender-500 px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
          >
            ส่ง
          </button>
        </form>
      </div>
    </div>
  )
}
