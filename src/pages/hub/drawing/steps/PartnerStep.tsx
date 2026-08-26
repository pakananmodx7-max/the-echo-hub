import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'
import type { DrawListenPartner } from '../../../../types'

interface PartnerStepProps {
  value: DrawListenPartner | null
  onChange: (partner: DrawListenPartner) => void
  onContinue: () => void
}

export function PartnerStep({ value, onChange, onContinue }: PartnerStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <div>
        <h1 className="text-xl font-bold text-ink">วันนี้อยากวาดและฟังกับใคร?</h1>
      </div>

      <Card
        onClick={() => onChange('friend')}
        className={`cursor-pointer transition ${value === 'friend' ? 'ring-2 ring-lavender-400' : ''}`}
      >
        <p className="text-lg font-semibold text-ink">👥 เล่นกับเพื่อน</p>
        <p className="mt-1 text-sm text-ink-soft">ชวนเพื่อนมาผลัดกันวาด เล่า และฟัง</p>
      </Card>

      <Card
        onClick={() => onChange('family')}
        className={`cursor-pointer transition ${value === 'family' ? 'ring-2 ring-lavender-400' : ''}`}
      >
        <p className="text-lg font-semibold text-ink">🏠 เล่นกับครอบครัว</p>
        <p className="mt-1 text-sm text-ink-soft">ใช้ภาพเล็ก ๆ เปิดบทสนทนากับคนในบ้าน</p>
      </Card>

      <p className="text-center text-xs text-ink-faint">เล่นได้บนอุปกรณ์เครื่องเดียวกัน ไม่ต้องล็อกอินอีกฝ่าย</p>

      <Button fullWidth disabled={!value} onClick={onContinue} className="mt-2">
        ไปต่อ →
      </Button>
    </div>
  )
}
