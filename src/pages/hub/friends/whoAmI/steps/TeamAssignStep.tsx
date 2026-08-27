import { useState } from 'react'
import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'

interface TeamAssignStepProps {
  playerNames: string[]
  onContinue: (teamAName: string, teamBName: string, teamAIndices: number[], teamBIndices: number[]) => void
}

export function TeamAssignStep({ playerNames, onContinue }: TeamAssignStepProps) {
  const [teamAName, setTeamAName] = useState('ทีม A')
  const [teamBName, setTeamBName] = useState('ทีม B')
  const [assignment, setAssignment] = useState<('A' | 'B')[]>(() =>
    playerNames.map((_, i) => (i % 2 === 0 ? 'A' : 'B')),
  )

  function toggle(index: number) {
    setAssignment((prev) => {
      const next = [...prev]
      next[index] = next[index] === 'A' ? 'B' : 'A'
      return next
    })
  }

  const teamAIndices = assignment.map((t, i) => (t === 'A' ? i : -1)).filter((i) => i >= 0)
  const teamBIndices = assignment.map((t, i) => (t === 'B' ? i : -1)).filter((i) => i >= 0)
  const canContinue = teamAIndices.length > 0 && teamBIndices.length > 0

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-3xl" aria-hidden>
          ⚔️
        </p>
        <p className="mt-2 font-semibold text-ink">สร้างทีม</p>
        <p className="mt-1 text-sm text-ink-soft">ตั้งชื่อทีม แล้วแตะชื่อผู้เล่นเพื่อสลับทีม</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <input
          value={teamAName}
          onChange={(e) => setTeamAName(e.target.value)}
          maxLength={20}
          className="rounded-2xl border-2 border-lavender-200 bg-lavender-50 px-3 py-2.5 text-center text-sm font-semibold text-lavender-700 outline-none"
        />
        <input
          value={teamBName}
          onChange={(e) => setTeamBName(e.target.value)}
          maxLength={20}
          className="rounded-2xl border-2 border-pink-glow bg-pink-glow/40 px-3 py-2.5 text-center text-sm font-semibold text-pink-text outline-none"
        />
      </div>

      <Card className="flex flex-col gap-2">
        {playerNames.map((name, i) => {
          const team = assignment[i]
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                team === 'A' ? 'bg-lavender-100 text-lavender-700' : 'bg-pink-glow/50 text-pink-text'
              }`}
            >
              <span>{name || `ผู้เล่น ${i + 1}`}</span>
              <span>{team === 'A' ? `🔵 ${teamAName}` : `🟣 ${teamBName}`}</span>
            </button>
          )
        })}
      </Card>

      <Button
        fullWidth
        disabled={!canContinue}
        onClick={() => onContinue(teamAName || 'ทีม A', teamBName || 'ทีม B', teamAIndices, teamBIndices)}
      >
        ต่อไป
      </Button>
      {!canContinue ? <p className="text-center text-xs text-ink-faint">ต้องมีผู้เล่นอย่างน้อยทีมละ 1 คน</p> : null}
    </div>
  )
}
