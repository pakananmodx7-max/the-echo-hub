import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { WHO_AM_I_CARDS, type WhoAmICard } from '../../../data/missions'
import { useAuth } from '../../../hooks/useAuth'

const GAME_SECONDS = 60

function shuffled(cards: WhoAmICard[]): WhoAmICard[] {
  const arr = [...cards]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

type Phase = 'idle' | 'playing' | 'ended'

export function WhoAmIPage() {
  const { completeActivity } = useAuth()
  const [phase, setPhase] = useState<Phase>('idle')
  const [deck, setDeck] = useState<WhoAmICard[]>(() => shuffled(WHO_AM_I_CARDS))
  const [cardIndex, setCardIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (phase !== 'playing') return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setPhase('ended')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'ended') {
      void completeActivity('friend-bond')
    }
  }, [phase, completeActivity])

  function nextCard() {
    setCardIndex((prev) => {
      const next = prev + 1
      if (next >= deck.length) {
        setDeck(shuffled(WHO_AM_I_CARDS))
        return 0
      }
      return next
    })
  }

  function handleStart() {
    setDeck(shuffled(WHO_AM_I_CARDS))
    setCardIndex(0)
    setScore(0)
    setSecondsLeft(GAME_SECONDS)
    setPhase('playing')
  }

  function handleCorrect() {
    setScore((s) => s + 1)
    nextCard()
  }

  function handleSkip() {
    nextCard()
  }

  const currentCard = deck[cardIndex]

  return (
    <div>
      <PageHeader title="🎭 Who Am I?" subtitle="ถือมือถือให้เพื่อนดู แล้วให้เพื่อนใบ้คำตอบ" />

      <div className="px-5 pb-4">
        {phase === 'idle' ? (
          <Card className="text-center">
            <p className="text-4xl" aria-hidden>
              🎭
            </p>
            <p className="mt-3 font-semibold text-ink">พร้อมเล่นหรือยัง?</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              ถือโทรศัพท์หันจอไปทางเพื่อน แล้วให้เพื่อนใบ้คำในการ์ดให้คุณทาย ภายใน 60 วินาที
            </p>
            <Button fullWidth className="mt-5" onClick={handleStart}>
              เริ่มเกม
            </Button>
          </Card>
        ) : null}

        {phase === 'playing' ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm font-semibold text-ink-soft">
              <span>⏱ {secondsLeft} วินาที</span>
              <span>คะแนน: {score}</span>
            </div>

            <Card
              key={cardIndex}
              className="flex h-64 animate-fade-in-up flex-col items-center justify-center bg-gradient-to-br from-lavender-100 to-pink-glow/50 text-center"
            >
              <p className="text-6xl" aria-hidden>
                {currentCard.emoji}
              </p>
              <p className="mt-4 text-2xl font-bold text-ink">{currentCard.label}</p>
            </Card>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={handleSkip}>
                ↷ ข้าม
              </Button>
              <Button variant="soft-mint" fullWidth onClick={handleCorrect}>
                ✓ ทายถูก
              </Button>
            </div>
          </div>
        ) : null}

        {phase === 'ended' ? (
          <Card className="text-center">
            <p className="text-4xl" aria-hidden>
              🎉
            </p>
            <p className="mt-3 text-lg font-semibold text-ink">หมดเวลา!</p>
            <p className="mt-1 text-3xl font-bold text-lavender-600">{score} คะแนน</p>
            <p className="mt-1 text-sm text-ink-soft">เล่นได้ดีมาก ลองอีกครั้งเพื่อทำคะแนนให้สูงขึ้น</p>
            <Button fullWidth className="mt-5" onClick={handleStart}>
              เล่นอีกครั้ง
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
