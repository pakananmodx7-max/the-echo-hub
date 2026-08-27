import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../../components/Avatar'
import { useAuth } from '../../../hooks/useAuth'
import { useChatRoomMessages } from '../../../hooks/useChatRoomMessages'

/**
 * The private 1:1 chat thread opened once a chat request is accepted. Only the two
 * room participants can ever reach real messages here — enforced by firestore.rules,
 * not just this UI. No voice/video/file upload and no AI analysis of messages, by design.
 */
export function PrivateChatPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { room, messages, send, sending } = useChatRoomMessages(roomId)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  const myPublicId = user?.publicId ?? null
  const partnerId = room?.participants.find((id) => id !== myPublicId) ?? null
  const partner = partnerId ? room?.profiles[partnerId] : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const toSend = text
    setText('')
    await send(toSend)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream">
      <div className="flex items-center gap-3 border-b border-lavender-100 px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <button
          type="button"
          onClick={() => navigate('/hub/talk')}
          aria-label="ย้อนกลับ"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-card text-ink-soft active:scale-95 transition"
        >
          ←
        </button>
        <Avatar avatarId={partner?.avatarId ?? null} size="sm" />
        <p className="min-w-0 flex-1 truncate font-semibold text-ink">{partner?.codename ?? 'แชทส่วนตัว'}</p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-ink-faint">เริ่มบทสนทนาได้เลย 🤍</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const mine = m.senderPublicId === myPublicId
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      mine ? 'bg-lavender-500 text-white' : 'bg-white text-ink shadow-card'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-lavender-100 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="พิมพ์ข้อความ..."
          className="min-w-0 flex-1 rounded-2xl border border-lavender-100 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-lavender-300"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-full bg-lavender-500 px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
        >
          ส่ง
        </button>
      </form>
    </div>
  )
}
