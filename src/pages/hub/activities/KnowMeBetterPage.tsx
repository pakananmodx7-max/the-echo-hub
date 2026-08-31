import { useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import {
  KNOW_ME_BETTER_FEEDBACK,
  KNOW_ME_BETTER_FOLLOW_UPS,
  KNOW_ME_BETTER_QUESTIONS,
  type KnowMeBetterQuestion,
} from '../../../data/knowMeBetterQuestions'
import { awardDailyMission } from '../../../features/rewards/rewardsService'
import { recordActivity } from '../../../features/analytics/analyticsService'
import { useAuth } from '../../../hooks/useAuth'
import { getBangkokDateString } from '../../../lib/thailandDate'

function pickRandomQuestion(avoidId?: string): KnowMeBetterQuestion {
  const candidates = avoidId ? KNOW_ME_BETTER_QUESTIONS.filter((q) => q.id !== avoidId) : KNOW_ME_BETTER_QUESTIONS
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function pickRandomLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]
}

type Step = 'guess' | 'reveal'

export function KnowMeBetterPage() {
  const { user, completeActivity } = useAuth()
  const [question, setQuestion] = useState<KnowMeBetterQuestion>(() => pickRandomQuestion())
  const [step, setStep] = useState<Step>('guess')
  const [guess, setGuess] = useState('')
  const [actualAnswer, setActualAnswer] = useState('')
  const [feedback, setFeedback] = useState(() => pickRandomLine(KNOW_ME_BETTER_FEEDBACK))
  const [followUp, setFollowUp] = useState(() => pickRandomLine(KNOW_ME_BETTER_FOLLOW_UPS))

  if (!user) return null

  function reveal() {
    setStep('reveal')
    setFeedback(pickRandomLine(KNOW_ME_BETTER_FEEDBACK))
    setFollowUp(pickRandomLine(KNOW_ME_BETTER_FOLLOW_UPS))
    // Genuine engagement — reaching the reveal/compare step, never just opening the page.
    // Idempotent: replaying this any number of times only ever grants the day's +5 once.
    void completeActivity('know-me-better')
    void awardDailyMission(user!.id, 'know_me_better', getBangkokDateString())
    void recordActivity('knowMeBetter')
  }

  function playAgain() {
    setQuestion(pickRandomQuestion(question.id))
    setStep('guess')
    setGuess('')
    setActualAnswer('')
  }

  return (
    <div>
      <PageHeader title="🎯 รู้จักกันแค่ไหน?" subtitle="ลองทายใจคนใกล้ตัว แล้วดูว่าเรารู้จักกันแค่ไหน" />

      <div className="flex flex-col gap-4 px-5 pb-6">
        <Card className="bg-gradient-to-br from-lavender-50 to-white text-center">
          <p className="text-xs font-medium text-ink-faint">คำถามวันนี้</p>
          <p className="mt-2 text-lg font-bold text-ink">{question.text}</p>
        </Card>

        <Card>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">คิดว่าเขาจะตอบว่า...</span>
            <textarea
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="ลองเดาใจดูก่อน (ไม่บังคับ)"
              rows={2}
              className="resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
          </label>
        </Card>

        {step === 'guess' ? (
          <Button fullWidth onClick={reveal}>
            ดูเฉลย
          </Button>
        ) : (
          <>
            <Card>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink">คำตอบจริงของเขาคือ...</span>
                <textarea
                  value={actualAnswer}
                  onChange={(e) => setActualAnswer(e.target.value)}
                  placeholder="ให้เจ้าของคำตอบพิมพ์เองตรงนี้"
                  rows={2}
                  className="resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
                />
              </label>
            </Card>

            <Card className="bg-gradient-to-br from-pink-glow/40 to-white text-center">
              <p className="text-base font-semibold text-ink">{feedback}</p>
              <p className="mt-3 text-sm text-ink-soft">💭 {followUp}</p>
            </Card>

            <Button fullWidth variant="secondary" onClick={playAgain}>
              เล่นคำถามใหม่
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
