import { useEffect, useRef, useState } from 'react'
import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'
import type { SessionDeck } from '../../../../../features/friendBond/whoAmI/sessionDeck'
import type { RoundResult, TimerOption } from '../../../../../features/friendBond/whoAmI/types'

interface PlayScreenProps {
  deck: SessionDeck
  timerSeconds: TimerOption
  categoryLabel: string
  onRoundEnd: (result: RoundResult) => void
}

export function PlayScreen({ deck, timerSeconds, categoryLabel, onRoundEnd }: PlayScreenProps) {
  const [card, setCard] = useState(() => deck.next())
  const [hintIndex, setHintIndex] = useState(-1)
  const [secondsLeft, setSecondsLeft] = useState<number>(timerSeconds)
  const statsRef = useRef<RoundResult>({ correct: 0, skipped: 0, hintsUsed: 0, wordsShown: card ? 1 : 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerSeconds === 0) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (timerSeconds === 0 || secondsLeft > 0) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    onRoundEnd(statsRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  function drawNext() {
    const next = deck.next()
    setCard(next)
    setHintIndex(-1)
    statsRef.current = { ...statsRef.current, wordsShown: statsRef.current.wordsShown + (next ? 1 : 0) }
  }

  function handleCorrect() {
    statsRef.current = { ...statsRef.current, correct: statsRef.current.correct + 1 }
    drawNext()
  }

  function handleSkip() {
    statsRef.current = { ...statsRef.current, skipped: statsRef.current.skipped + 1 }
    drawNext()
  }

  function handleHint() {
    if (!card || card.hints.length === 0) return
    if (hintIndex + 1 < card.hints.length) {
      if (hintIndex === -1) statsRef.current = { ...statsRef.current, hintsUsed: statsRef.current.hintsUsed + 1 }
      setHintIndex((i) => i + 1)
    }
  }

  const hasHints = !!card && card.hints.length > 0

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <div className="flex items-center justify-between text-sm font-semibold text-ink-soft">
        <span>{categoryLabel}</span>
        <span>{timerSeconds === 0 ? '♾️ ไม่จับเวลา' : `⏱ ${secondsLeft} วินาที`}</span>
      </div>
      <div className="text-center text-sm font-semibold text-ink-soft">คะแนน: {statsRef.current.correct}</div>

      <Card
        key={card?.entryId ?? 'empty'}
        className="flex min-h-64 animate-fade-in-up flex-col items-center justify-center gap-3 bg-gradient-to-br from-lavender-100 to-pink-glow/50 p-6 text-center"
      >
        {card ? (
          <>
            <p className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{card.answer}</p>
            {hintIndex >= 0 ? (
              <p className="mt-2 text-sm font-medium text-lavender-600">💡 {card.hints[hintIndex]}</p>
            ) : null}
          </>
        ) : (
          <p className="text-lg font-semibold text-ink-soft">ไม่มีคำในหมวดนี้</p>
        )}
      </Card>

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={handleSkip} disabled={!card}>
          ↷ ข้าม
        </Button>
        <Button variant="soft-pink" fullWidth onClick={handleHint} disabled={!hasHints || hintIndex + 1 >= (card?.hints.length ?? 0)}>
          💡 คำใบ้
        </Button>
        <Button variant="soft-mint" fullWidth onClick={handleCorrect} disabled={!card}>
          ✅ ถูก!
        </Button>
      </div>

      {timerSeconds === 0 ? (
        <Button fullWidth variant="ghost" onClick={() => onRoundEnd(statsRef.current)}>
          จบตานี้
        </Button>
      ) : null}
    </div>
  )
}
