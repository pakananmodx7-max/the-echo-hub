import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'
import type { RoundResult } from '../../../../../features/friendBond/whoAmI/types'

interface SoloSummaryStepProps {
  result: RoundResult
  onPlayAgain: () => void
  onChangeCategory: () => void
  onExit: () => void
}

export function SoloSummaryStep({ result, onPlayAgain, onChangeCategory, onExit }: SoloSummaryStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <p className="mt-3 text-lg font-semibold text-ink">หมดเวลา!</p>
        <p className="mt-1 text-3xl font-bold text-lavender-600">{result.correct} คะแนน</p>
        <p className="mt-1 text-sm text-ink-soft">
          ข้าม {result.skipped} ครั้ง · ใช้คำใบ้ {result.hintsUsed} ครั้ง
        </p>
        <p className="mt-2 text-sm text-ink-soft">เล่นได้ดีมาก ลองอีกครั้งเพื่อทำคะแนนให้สูงขึ้น</p>
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
