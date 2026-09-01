import { Card } from './Card'
import { MAX_LEVEL, getLevelProgress, getLevelTitle, getUnlockedBadges } from '../features/rewards/levelConfig'

interface LevelCardProps {
  totalPoints: number
}

/**
 * The Me-tab's prominent level identity card (spec §4) — level, title, total points, a
 * progress bar WITHIN the current level (never the global 0-9450 range, see
 * getLevelProgress), points remaining to the next level, and the current milestone badge.
 * Level 50 shows a distinct "reached the top" state with no next-level requirement.
 */
export function LevelCard({ totalPoints }: LevelCardProps) {
  const progress = getLevelProgress(totalPoints)
  const { emoji, title } = getLevelTitle(progress.level)
  const unlocked = getUnlockedBadges(progress.level)
  const currentBadge = unlocked.at(-1)

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-lavender-50 to-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-lavender-500">
            LEVEL {progress.level}
            {progress.isMaxLevel ? ' 👑' : ''}
          </p>
          <p className="mt-0.5 text-lg font-bold text-ink">
            <span aria-hidden>{emoji}</span> {title}
          </p>
        </div>
        {currentBadge ? (
          <span className="text-3xl" aria-hidden title={currentBadge.title}>
            {currentBadge.emoji}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-ink-soft">{totalPoints.toLocaleString('th-TH')} คะแนนสะสม</p>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-lavender-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lavender-400 to-pink-glow transition-all"
          style={{ width: `${Math.round(progress.ratio * 100)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-ink-soft">
        {progress.isMaxLevel
          ? `ถึงระดับสูงสุดแล้ว (LEVEL ${MAX_LEVEL})`
          : `อีก ${progress.pointsToNextLevel} คะแนน ถึง LEVEL ${progress.level + 1}`}
      </p>
    </Card>
  )
}
