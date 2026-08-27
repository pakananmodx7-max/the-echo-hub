import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'
import { sortByScoreDesc } from '../../../../../features/friendBond/whoAmI/gameEngine'
import type { PlayerScore } from '../../../../../features/friendBond/whoAmI/types'

interface ScoreboardStepProps {
  players: PlayerScore[]
  onPlayAgain: () => void
  onChangeCategory: () => void
  onExit: () => void
}

export function ScoreboardStep({ players, onPlayAgain, onChangeCategory, onExit }: ScoreboardStepProps) {
  const ranked = sortByScoreDesc(players)

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card>
        <p className="text-center text-3xl" aria-hidden>
          🏆
        </p>
        <p className="mt-2 text-center font-semibold text-ink">คะแนนตอนนี้</p>
        <div className="mt-4 flex flex-col gap-2">
          {ranked.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-cream-deep px-4 py-2.5 text-sm">
              <span className="font-semibold text-ink">
                {i + 1}. {p.name}
              </span>
              <span className="font-bold text-lavender-600">{p.correct}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-ink-faint">คะแนนนี้เป็นเฉพาะรอบนี้เท่านั้น</p>
      </Card>

      <Button fullWidth onClick={onPlayAgain}>
        เล่นอีกครั้ง
      </Button>
      <Button fullWidth variant="secondary" onClick={onChangeCategory}>
        เปลี่ยนหมวด
      </Button>
      <Button fullWidth variant="ghost" onClick={onExit}>
        กลับ Friend Bond
      </Button>
    </div>
  )
}
