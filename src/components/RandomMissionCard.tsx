import { useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import { ReflectionInput } from './ReflectionInput'
import { isMeaningfulReflection } from '../lib/reflection'

interface ReflectionCopy {
  title: string
  prompt: string
  placeholder: string
  helper?: string
}

interface RandomMissionCardProps {
  missions: string[]
  icon: string
  onComplete?: () => void
  completeLabel?: string
  /** When set, the student must write a short private reflection — "what will you say or
   * do?" — before the complete button unlocks. Omit to keep the old shuffle-then-complete
   * flow with no reflection gate. */
  reflection?: ReflectionCopy
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
  reflection,
}: RandomMissionCardProps) {
  const [mission, setMission] = useState(() => pickRandom(missions))
  const [response, setResponse] = useState('')
  const [triedEmpty, setTriedEmpty] = useState(false)
  const [done, setDone] = useState(false)

  const responseReady = !reflection || isMeaningfulReflection(response)

  function handleShuffle() {
    setMission((current) => pickRandom(missions, current))
    setResponse('')
    setTriedEmpty(false)
    setDone(false)
  }

  function handleComplete() {
    if (!responseReady) {
      setTriedEmpty(true)
      return
    }
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

      {reflection && !done ? (
        <ReflectionInput
          title={reflection.title}
          prompt={reflection.prompt}
          placeholder={reflection.placeholder}
          helper={reflection.helper}
          value={response}
          onChange={(v) => {
            setResponse(v)
            if (triedEmpty) setTriedEmpty(false)
          }}
          showHint={triedEmpty && !responseReady}
        />
      ) : null}

      <div className="mt-6 flex flex-col gap-2.5">
        <Button variant="secondary" fullWidth onClick={handleShuffle}>
          🎲 สุ่มภารกิจ
        </Button>
        <Button
          fullWidth
          variant={done ? 'soft-mint' : 'primary'}
          onClick={handleComplete}
          disabled={done || !responseReady}
        >
          {done ? 'ทำภารกิจสำเร็จแล้ว 💜' : completeLabel}
        </Button>
      </div>

      {done ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          สิ่งเล็ก ๆ ที่เราพูดหรือทำ อาจมีความหมายกับใครบางคนมากกว่าที่คิด
        </p>
      ) : null}
    </Card>
  )
}
