import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'

interface TeamSummaryStepProps {
  teamAName: string
  teamAScore: number
  teamBName: string
  teamBScore: number
  onPlayAgain: () => void
  onChangeCategory: () => void
  onExit: () => void
}

export function TeamSummaryStep({
  teamAName,
  teamAScore,
  teamBName,
  teamBScore,
  onPlayAgain,
  onChangeCategory,
  onExit,
}: TeamSummaryStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <p className="mt-2 font-semibold text-ink">จบเกม!</p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <div className="flex-1 rounded-2xl bg-lavender-100 px-3 py-4">
            <p className="text-sm font-semibold text-lavender-700">🔵 {teamAName}</p>
            <p className="mt-1 text-3xl font-extrabold text-lavender-700">{teamAScore}</p>
          </div>
          <span className="text-sm font-bold text-ink-faint">VS</span>
          <div className="flex-1 rounded-2xl bg-pink-glow/50 px-3 py-4">
            <p className="text-sm font-semibold text-pink-text">🟣 {teamBName}</p>
            <p className="mt-1 text-3xl font-extrabold text-pink-text">{teamBScore}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-soft">สนุกด้วยกันก็ชนะแล้ว 🫶</p>
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
