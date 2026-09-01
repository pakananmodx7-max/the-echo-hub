import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { subscribeRewardPopups, type RewardPopupEvent } from '../features/rewards/rewardPopupBus'

type QueueItem = RewardPopupEvent & { id: number }

const REWARD_TOAST_VISIBLE_MS = 2500
const REWARD_TOAST_FADE_MS = 350

/**
 * Global, singleton popup host for ECHO Points events — mounted once in HubLayout, exactly
 * like IncomingChatRequestModal/NewMessageToast/DailyCheckinModal, reacting to
 * rewardPopupBus events fired from wherever a reward was actually granted. Shows at most one
 * popup at a time from an internal queue: a reward toast auto-dismisses itself, then (only if
 * a level threshold was crossed) a level-up celebration, then (only if a milestone badge was
 * newly crossed) a badge celebration — never more than one popup of each kind per reward, and
 * never a popup per skipped level on a multi-level jump (spec §16).
 *
 * The reward toast is deliberately anchored to the TOP of the viewport (not the bottom), so
 * it can never cover the bottom nav, a chat composer, or the Daily Journal textarea (spec
 * §21) — those all live at/near the bottom of the screen everywhere in this app.
 */
export function RewardPopupHost() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [current, setCurrent] = useState<QueueItem | null>(null)
  const [leaving, setLeaving] = useState(false)
  const idRef = useRef(0)

  useEffect(() => {
    return subscribeRewardPopups((event) => {
      idRef.current += 1
      setQueue((q) => [...q, { ...event, id: idRef.current }])
    })
  }, [])

  useEffect(() => {
    if (current || queue.length === 0) return
    setCurrent(queue[0])
    setQueue((q) => q.slice(1))
  }, [queue, current])

  useEffect(() => {
    if (!current || current.kind !== 'reward') return
    setLeaving(false)
    const startFade = window.setTimeout(() => setLeaving(true), REWARD_TOAST_VISIBLE_MS)
    const clear = window.setTimeout(() => {
      setCurrent(null)
      setLeaving(false)
    }, REWARD_TOAST_VISIBLE_MS + REWARD_TOAST_FADE_MS)
    return () => {
      window.clearTimeout(startFade)
      window.clearTimeout(clear)
    }
  }, [current])

  if (!current) return null

  if (current.kind === 'reward') {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-[70] flex justify-center px-4"
        role="status"
      >
        <div
          className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ${
            leaving ? 'animate-reward-toast-out' : 'animate-reward-toast-in'
          }`}
        >
          <span className="text-2xl" aria-hidden>
            {current.icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-lavender-600">✨ +{current.points} คะแนน</p>
            <p className="truncate text-xs text-ink-soft">จาก {current.label}</p>
          </div>
        </div>
      </div>
    )
  }

  if (current.kind === 'levelup') {
    return (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 px-6 backdrop-blur-sm"
        onClick={() => setCurrent(null)}
      >
        <div
          className="animate-modal-in relative w-full max-w-xs overflow-hidden rounded-3xl bg-white p-6 text-center shadow-soft"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            aria-hidden
            className="animate-celebration-glow pointer-events-none absolute inset-0 bg-gradient-to-br from-lavender-200 via-transparent to-pink-glow/40"
          />
          <div className="relative">
            <span className="animate-celebration-sparkle absolute -left-1 -top-1 text-lg" aria-hidden>
              ✨
            </span>
            <span className="animate-celebration-sparkle absolute -right-1 top-2 text-base" style={{ animationDelay: '0.6s' }} aria-hidden>
              🤍
            </span>
            <p className="text-2xl font-bold text-ink">🎉 LEVEL UP!</p>
            <p className="mt-3 text-sm text-ink-soft">คุณขึ้นสู่</p>
            <p className="mt-1 text-2xl font-extrabold text-lavender-600">
              {current.multiJump ? `LEVEL ${current.fromLevel} → LEVEL ${current.toLevel}` : `LEVEL ${current.toLevel}`}
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              <span aria-hidden>{current.emoji}</span> {current.title}
            </p>
            <p className="mt-3 text-sm text-ink-soft">"อีกหนึ่งก้าวของการเข้าใจกัน 🤍"</p>
            <Button fullWidth className="mt-5" onClick={() => setCurrent(null)}>
              เยี่ยมเลย
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 'milestone'
  const { badge } = current
  const isMaxBadge = badge.level >= 50
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 px-6 backdrop-blur-sm"
      onClick={() => setCurrent(null)}
    >
      <div
        className={`animate-modal-in relative w-full max-w-xs overflow-hidden rounded-3xl p-6 text-center shadow-soft ${
          isMaxBadge ? 'bg-gradient-to-br from-[#fff8e6] to-white' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className={`animate-celebration-glow pointer-events-none absolute inset-0 bg-gradient-to-br ${
            isMaxBadge ? 'from-[#f5d98a]/60 via-transparent to-lavender-200/40' : 'from-pink-glow/40 via-transparent to-lavender-200/40'
          }`}
        />
        <div className="relative">
          <p className="text-sm font-bold text-ink-soft">🏅 ได้รับตราใหม่!</p>
          <p className="mt-2 text-lg font-extrabold text-ink">LEVEL {badge.level}</p>
          <p className="animate-celebration-sparkle mt-3 text-5xl" aria-hidden>
            {badge.emoji}
          </p>
          <p className="mt-2 text-base font-bold uppercase tracking-wide text-ink">{badge.title}</p>
          <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{badge.celebrationMessage}</p>
          <Button
            fullWidth
            className="mt-5"
            onClick={() => {
              setCurrent(null)
              navigate('/hub/me')
            }}
          >
            ดูตราของฉัน
          </Button>
        </div>
      </div>
    </div>
  )
}
