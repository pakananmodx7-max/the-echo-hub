import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'
import type { RoundResult } from '../../../../../features/friendBond/whoAmI/types'

interface RoundSummaryStepProps {
  playerName: string
  result: RoundResult
  continueLabel: string
  onContinue: () => void
}

export function RoundSummaryStep({ playerName, result, continueLabel, onContinue }: RoundSummaryStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <p className="mt-3 text-lg font-semibold text-ink">{playerName} จบรอบแล้ว!</p>
        <div className="mt-4 flex flex-col gap-2 text-sm text-ink-soft">
          <div className="flex justify-between rounded-xl bg-mint/40 px-4 py-2">
            <span>ทายถูก</span>
            <span className="font-bold text-mint-text">{result.correct}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-cream-deep px-4 py-2">
            <span>ข้าม</span>
            <span className="font-bold text-ink">{result.skipped}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-lavender-50 px-4 py-2">
            <span>ใช้คำใบ้</span>
            <span className="font-bold text-lavender-600">{result.hintsUsed}</span>
          </div>
        </div>
      </Card>

      <Button fullWidth onClick={onContinue}>
        {continueLabel}
      </Button>
    </div>
  )
}
