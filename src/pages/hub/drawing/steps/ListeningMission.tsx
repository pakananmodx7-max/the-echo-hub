import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'

interface ListeningMissionProps {
  mission: string
  onReroll: () => void
  onContinue: () => void
}

export function ListeningMission({ mission, onReroll, onContinue }: ListeningMissionProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <h1 className="text-center text-xl font-bold text-ink">🎧 ภารกิจของคนฟัง</h1>

      <Card key={mission} className="animate-fade-in-up bg-gradient-to-br from-mint/40 to-white text-center">
        <p className="text-lg font-medium leading-relaxed text-ink">{mission}</p>
      </Card>

      <p className="text-center text-xs text-ink-faint">แค่ลองทำเบา ๆ ไม่มีการให้คะแนนใด ๆ</p>

      <div className="flex flex-col gap-2.5">
        <Button fullWidth variant="secondary" onClick={onReroll}>
          สุ่มภารกิจใหม่ 🎲
        </Button>
        <Button fullWidth onClick={onContinue}>
          ไปต่อ →
        </Button>
      </div>
    </div>
  )
}
