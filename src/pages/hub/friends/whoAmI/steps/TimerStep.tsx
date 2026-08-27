import { Card } from '../../../../../components/Card'
import type { TimerOption } from '../../../../../features/friendBond/whoAmI/types'

interface TimerStepProps {
  onSelect: (seconds: TimerOption) => void
}

const OPTIONS: { value: TimerOption; emoji: string; label: string }[] = [
  { value: 30, emoji: '⚡', label: '30 วินาที' },
  { value: 60, emoji: '🎯', label: '60 วินาที' },
  { value: 90, emoji: '🔥', label: '90 วินาที' },
  { value: 120, emoji: '⏱️', label: '120 วินาที' },
  { value: 0, emoji: '♾️', label: 'ไม่จับเวลา' },
]

export function TimerStep({ onSelect }: TimerStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-3xl" aria-hidden>
          ⏱️
        </p>
        <p className="mt-2 font-semibold text-ink">เลือกเวลาต่อรอบ</p>
        <p className="mt-1 text-sm text-ink-soft">ค่าเริ่มต้นคือ 60 วินาที</p>
      </Card>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-left font-semibold text-ink shadow-card transition active:scale-[0.98]"
          >
            <span className="text-2xl" aria-hidden>
              {opt.emoji}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
