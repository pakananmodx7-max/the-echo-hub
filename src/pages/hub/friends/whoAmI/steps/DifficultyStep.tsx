import { Card } from '../../../../../components/Card'
import type { DifficultyFilter } from '../../../../../features/friendBond/whoAmI/types'

interface DifficultyStepProps {
  value: DifficultyFilter
  onSelect: (value: DifficultyFilter) => void
}

const OPTIONS: { value: DifficultyFilter; emoji: string; label: string }[] = [
  { value: 'easy', emoji: '🌱', label: 'ง่าย' },
  { value: 'normal', emoji: '⭐', label: 'ปกติ' },
  { value: 'hard', emoji: '🔥', label: 'ยาก' },
  { value: 'mixed', emoji: '🎲', label: 'ผสม' },
]

export function DifficultyStep({ value, onSelect }: DifficultyStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-3xl" aria-hidden>
          🎯
        </p>
        <p className="mt-2 font-semibold text-ink">เลือกระดับความยาก</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`rounded-2xl py-5 text-center font-semibold shadow-card transition active:scale-95 ${
              value === opt.value ? 'bg-lavender-500 text-white' : 'bg-white text-ink'
            }`}
          >
            <span className="block text-2xl" aria-hidden>
              {opt.emoji}
            </span>
            <span className="mt-1 block text-sm">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
