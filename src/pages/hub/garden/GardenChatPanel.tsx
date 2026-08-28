import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../../components/Avatar'
import { Button } from '../../../components/Button'
import { useGardenPublicChat } from '../../../hooks/useGardenPublicChat'
import { GARDEN_CHAT_MAX_LENGTH, GARDEN_CHAT_MIN_INTERVAL_MS } from '../../../data/gardenPrompts'

const QUICK_EMOJI = ['🤍', '✨', '😂', '👍', '🫂']
const MUTED_KEY = 'echoHub.garden.mock.mutedAuthors'

function readMuted(): Set<string> {
  try {
    const raw = localStorage.getItem(MUTED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function writeMuted(ids: Set<string>) {
  localStorage.setItem(MUTED_KEY, JSON.stringify(Array.from(ids)))
}

interface GardenChatPanelProps {
  currentUser: { id: string; codename: string; avatarId: string | null }
  onOpenListeningPrompt?: (prompt: string) => void
}

export function GardenChatPanel({ currentUser }: GardenChatPanelProps) {
  const { messages, sendMessage, reportMessage } = useGardenPublicChat()
  const [draft, setDraft] = useState('')
  const [mutedIds, setMutedIds] = useState<Set<string>>(() => readMuted())
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const lastSentAt = useRef(0)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    const now = Date.now()
    if (now - lastSentAt.current < GARDEN_CHAT_MIN_INTERVAL_MS) {
      setRateLimited(true)
      window.setTimeout(() => setRateLimited(false), 1200)
      return
    }
    lastSentAt.current = now
    setDraft('')
    void sendMessage({
      authorPublicId: currentUser.id,
      authorCodename: currentUser.codename,
      authorAvatarId: currentUser.avatarId ?? 'cloud',
      text,
    }).catch((err) => console.error('[garden] sendMessage failed', err))
  }

  function toggleMute(authorId: string) {
    const next = new Set(mutedIds)
    if (next.has(authorId)) next.delete(authorId)
    else next.add(authorId)
    setMutedIds(next)
    writeMuted(next)
    setOpenMenuFor(null)
  }

  function handleReport(messageId: string) {
    reportMessage(messageId)
    setOpenMenuFor(null)
    window.alert('รายงานข้อความแล้ว ทีมงานจะตรวจสอบภายหลัง')
  }

  const visibleMessages = messages.filter((m) => !mutedIds.has(m.authorId))

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {visibleMessages.map((m) => (
            <div key={m.id} className="flex items-start gap-2">
              <Avatar avatarId={m.authorAvatarId} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-ink">{m.authorCodename}</p>
                  <button
                    type="button"
                    onClick={() => setOpenMenuFor(openMenuFor === m.id ? null : m.id)}
                    aria-label="ตัวเลือกข้อความ"
                    className="ml-auto shrink-0 px-1 text-ink-faint"
                  >
                    ⋯
                  </button>
                </div>
                {m.kind === 'song' && m.song ? (
                  <div className="mt-1 rounded-2xl bg-lavender-50 p-2.5">
                    <p className="text-xs font-medium text-lavender-600">🎵 {m.song.title}</p>
                    <p className="text-xs text-ink-soft">{m.song.artist}</p>
                    {m.song.link ? (
                      <a
                        href={m.song.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-lavender-600"
                      >
                        เปิดเพลง ↗
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-0.5 break-words text-sm text-ink">{m.text}</p>
                )}
                {openMenuFor === m.id ? (
                  <div className="mt-1.5 flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleReport(m.id)}
                      className="rounded-full bg-pink-glow px-2.5 py-1 font-medium text-pink-text"
                    >
                      รายงาน
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMute(m.authorId)}
                      className="rounded-full bg-cream-deep px-2.5 py-1 font-medium text-ink-soft"
                    >
                      {mutedIds.has(m.authorId) ? 'เลิกปิดเสียง' : `ปิดเสียง ${m.authorCodename}`}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>
      </div>

      <div className="border-t border-lavender-100 px-3 py-2.5">
        <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
          {QUICK_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setDraft((d) => (d + emoji).slice(0, GARDEN_CHAT_MAX_LENGTH))}
              className="shrink-0 rounded-full bg-cream-deep px-2.5 py-1 text-base"
            >
              {emoji}
            </button>
          ))}
        </div>
        {rateLimited ? <p className="mb-1 text-xs text-pink-text">พิมพ์เร็วไปนิดนะ รอสักครู่แล้วลองใหม่</p> : null}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, GARDEN_CHAT_MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="พิมพ์อะไรบางอย่าง..."
            maxLength={GARDEN_CHAT_MAX_LENGTH}
            className="flex-1 rounded-full border border-lavender-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
          />
          <Button onClick={handleSend} disabled={!draft.trim()} className="shrink-0 !px-4 !py-2.5">
            ส่ง
          </Button>
        </div>
      </div>
    </div>
  )
}
