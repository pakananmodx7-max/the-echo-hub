import { Card } from './Card'
import { BADGES } from '../features/rewards/levelConfig'

interface BadgeCollectionProps {
  currentLevel: number
}

/** "🏅 ตราของฉัน" (spec §5) — every badge in the system, unlocked ones shown normally with
 * the level they were earned at, locked ones dimmed with the level still needed. */
export function BadgeCollection({ currentLevel }: BadgeCollectionProps) {
  return (
    <Card>
      <p className="font-semibold text-ink">🏅 ตราของฉัน</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {BADGES.map((badge) => {
          const unlocked = currentLevel >= badge.level
          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 text-center ${
                unlocked ? 'bg-lavender-50' : 'bg-cream-deep/60 opacity-60'
              }`}
            >
              <span className="text-3xl" aria-hidden>
                {unlocked ? badge.emoji : '🔒'}
              </span>
              <p className={`text-sm font-semibold ${unlocked ? 'text-ink' : 'text-ink-faint'}`}>{badge.title}</p>
              <p className="text-xs text-ink-faint">
                {unlocked ? `ปลดล็อกที่ Level ${badge.level}` : `🔒 ปลดล็อกเมื่อถึง Level ${badge.level}`}
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
