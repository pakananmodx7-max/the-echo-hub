import { useState } from 'react'
import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'

interface PlayerCountStepProps {
  min?: number
  onContinue: (count: number) => void
}

const QUICK_COUNTS = [2, 3, 4, 5, 6, 7, 8]

export function PlayerCountStep({ min = 2, onContinue }: PlayerCountStepProps) {
  const [custom, setCustom] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-3xl" aria-hidden>
          👥
        </p>
        <p className="mt-2 font-semibold text-ink">วันนี้เล่นกันกี่คน?</p>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        {QUICK_COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onContinue(n)}
            className="rounded-2xl bg-white py-4 text-lg font-semibold text-ink shadow-card active:scale-95"
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(min)}
          className="rounded-2xl bg-lavender-50 py-4 text-sm font-semibold text-lavender-600 shadow-card active:scale-95"
        >
          กำหนดเอง
        </button>
      </div>

      {custom !== null ? (
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">จำนวนผู้เล่น (สูงสุด 12 คน)</p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCustom((c) => Math.max(min, (c ?? min) - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender-100 text-lg font-bold text-lavender-600 active:scale-95"
            >
              −
            </button>
            <span className="w-10 text-center text-2xl font-bold text-ink">{custom}</span>
            <button
              type="button"
              onClick={() => setCustom((c) => Math.min(12, (c ?? min) + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender-100 text-lg font-bold text-lavender-600 active:scale-95"
            >
              +
            </button>
          </div>
          <Button fullWidth onClick={() => onContinue(custom)}>
            ยืนยัน
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
