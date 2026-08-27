import { useEffect, useState } from 'react'
import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'

interface HandoffStepProps {
  playerName: string
  teamLabel?: string
  onDone: () => void
}

export function HandoffStep({ playerName, teamLabel, onDone }: HandoffStepProps) {
  const [counting, setCounting] = useState(false)
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (!counting) return
    if (count === 0) {
      const t = setTimeout(onDone, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(t)
  }, [counting, count, onDone])

  if (counting) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-24 text-center">
        <p className="animate-fade-in-up text-7xl font-extrabold text-lavender-500" key={count}>
          {count === 0 ? 'เริ่ม!' : count}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>
          🎭
        </p>
        <p className="mt-3 text-sm text-ink-soft">ถึงตาของ...</p>
        <p className="mt-1 text-2xl font-bold text-ink">{playerName}</p>
        {teamLabel ? <p className="mt-1 text-sm font-semibold text-lavender-600">{teamLabel}</p> : null}
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          ส่งโทรศัพท์ให้ {playerName} และอย่าให้ {playerName} ดูหน้าจอ
        </p>
      </Card>

      <Button
        fullWidth
        onClick={() => {
          setCount(3)
          setCounting(true)
        }}
      >
        พร้อมแล้ว!
      </Button>
    </div>
  )
}
