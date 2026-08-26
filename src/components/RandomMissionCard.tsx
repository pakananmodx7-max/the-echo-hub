import { useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'

interface RandomMissionCardProps {
  missions: string[]
  icon: string
  onComplete?: () => void
  completeLabel?: string
}

function pickRandom(missions: string[], exclude?: string) {
  if (missions.length <= 1) return missions[0]
  let next = missions[Math.floor(Math.random() * missions.length)]
  while (next === exclude) {
    next = missions[Math.floor(Math.random() * missions.length)]
  }
  return next
}

export function RandomMissionCard({
  missions,
  icon,
  onComplete,
  completeLabel = '✓ ทำสำเร็จแล้ว',
}: RandomMissionCardProps) {
  const [mission, setMission] = useState(() => pickRandom(missions))
  const [done, setDone] = useState(false)

  function handleShuffle() {
    setMission((current) => pickRandom(missions, current))
    setDone(false)
  }

  function handleComplete() {
    setDone(true)
    onComplete?.()
  }

  return (
    <Card className="text-center">
      <p className="text-4xl" aria-hidden>
        {icon}
      </p>
      <p key={mission} className="mt-4 animate-fade-in-up text-lg font-semibold leading-relaxed text-ink">
        {mission}
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        <Button variant="secondary" fullWidth onClick={handleShuffle}>
          🎲 สุ่มภารกิจ
        </Button>
        <Button
          fullWidth
          variant={done ? 'soft-mint' : 'primary'}
          onClick={handleComplete}
          disabled={done}
        >
          {done ? 'สำเร็จแล้ว 🎉' : completeLabel}
        </Button>
      </div>
    </Card>
  )
}
