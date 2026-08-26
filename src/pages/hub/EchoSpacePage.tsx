import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { MOODS, getMoodById } from '../../data/moods'
import { ONLINE_USERS } from '../../data/onlineUsers'
import type { EchoUser, MoodId } from '../../types'

type FilterId = 'all' | MoodId

export function EchoSpacePage() {
  const [filter, setFilter] = useState<FilterId>('all')
  const [target, setTarget] = useState<EchoUser | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'ทั้งหมด' },
    ...MOODS.filter((m) => m.id !== 'tired').map((m) => ({ id: m.id, label: `${m.emoji} ${shortLabel(m.id)}` })),
  ]

  const visibleUsers = useMemo(
    () => (filter === 'all' ? ONLINE_USERS : ONLINE_USERS.filter((u) => u.mood === filter)),
    [filter],
  )

  function handleSend() {
    if (!target) return
    setSentIds((prev) => new Set(prev).add(target.id))
  }

  const alreadySent = target ? sentIds.has(target.id) : false

  return (
    <div>
      <PageHeader title="💫 ECHO SPACE" subtitle="ตอนนี้มีใครอยู่ตรงนี้บ้าง" hideBack />

      <div className="px-5">
        <p className="text-sm font-medium text-mint-text">🟢 {ONLINE_USERS.length} คนออนไลน์</p>

        <div className="no-scrollbar mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === f.id
                  ? 'bg-lavender-500 text-white'
                  : 'bg-white text-ink-soft border border-lavender-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 pb-4">
          {visibleUsers.map((u) => {
            const mood = getMoodById(u.mood)
            const sent = sentIds.has(u.id)
            return (
              <Card key={u.id} className="flex items-center gap-3 py-4">
                <div className="relative">
                  <Avatar avatarId={u.avatarId} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-mint-deep" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{u.codename}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    <span aria-hidden>{mood?.emoji}</span> {mood?.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTarget(u)}
                  disabled={sent}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                    sent
                      ? 'bg-mint text-mint-text'
                      : u.mood === 'ready-to-listen'
                        ? 'bg-lavender-500 text-white'
                        : 'bg-pink-glow text-pink-text'
                  }`}
                >
                  {sent ? 'ส่งคำขอแล้ว ✓' : u.mood === 'good' ? 'ทักทาย' : 'ขอคุยด้วย 🤍'}
                </button>
              </Card>
            )
          })}
        </div>
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)}>
        {target ? (
          alreadySent ? (
            <div className="text-center">
              <p className="text-3xl" aria-hidden>
                ✓
              </p>
              <p className="mt-2 font-semibold text-ink">ส่งคำขอแล้ว ✓</p>
              <Button fullWidth className="mt-5" onClick={() => setTarget(null)}>
                ปิด
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-ink">ส่งคำขอคุยให้ {target.codename}?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                "อีกฝ่ายจะเป็นคนเลือกว่าจะรับคำขอหรือไม่"
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <Button fullWidth onClick={handleSend}>
                  ส่งคำขอ 🤍
                </Button>
                <Button fullWidth variant="ghost" onClick={() => setTarget(null)}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          )
        ) : null}
      </Modal>
    </div>
  )
}

function shortLabel(id: MoodId) {
  switch (id) {
    case 'good':
      return 'ดี'
    case 'okay':
      return 'เรื่อย ๆ'
    case 'need-ear':
      return 'อยากมีคนฟัง'
    case 'ready-to-listen':
      return 'พร้อมรับฟัง'
    default:
      return ''
  }
}
