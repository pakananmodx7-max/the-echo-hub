import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import {
  OPEN_HEART_QUESTIONS,
  OPEN_HEART_CATEGORY_LABELS,
  getOpenHeartQuestionById,
  type OpenHeartQuestion,
} from '../../../data/openHeartQuestions'
import {
  fetchOpenHeartAnswer,
  saveOpenHeartAnswer,
  type OpenHeartAnswerDraft,
} from '../../../features/familyFriends/openHeartAnswerService'
import { MAX_OPEN_HEART_ANSWER_LENGTH, isMeaningfulText } from '../../../features/familyFriends/familyFriendsLimits'
import { awardDailyMission } from '../../../features/rewards/rewardsService'
import { recordActivity } from '../../../features/analytics/analyticsService'
import { useAuth } from '../../../hooks/useAuth'
import { getBangkokDateString } from '../../../lib/thailandDate'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type View = 'choose' | 'answering' | 'took-offline'

const AUTOSAVE_DEBOUNCE_MS = 1200

function pickRandomQuestion(avoidId?: string): OpenHeartQuestion {
  const candidates = avoidId ? OPEN_HEART_QUESTIONS.filter((q) => q.id !== avoidId) : OPEN_HEART_QUESTIONS
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function OpenHeartQuestionPage() {
  const { user, completeActivity } = useAuth()
  const today = getBangkokDateString()

  const [question, setQuestion] = useState<OpenHeartQuestion>(() => pickRandomQuestion())
  const [answer, setAnswer] = useState('')
  const [view, setView] = useState<View>('choose')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const entryExistsRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Same "never leave the page stuck" guarantee as DailyJournalPage's equivalent load: a
  // fetch failure must still resolve `loading` back to false (see the .catch()/.finally()
  // below) rather than leaving the choose/answer UI permanently hidden — reading today's
  // existing answer is a convenience, never a precondition for being allowed to answer.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchOpenHeartAnswer(user.id, today)
      .then((entry) => {
        if (cancelled) return
        if (entry && entry.answer) {
          entryExistsRef.current = true
          const known = getOpenHeartQuestionById(entry.questionId)
          setQuestion(known ?? { id: entry.questionId, category: 'today', text: entry.questionText })
          setAnswer(entry.answer)
          setView('answering')
        }
      })
      .catch((err) => {
        console.error('[OpenHeartQuestionPage] fetchOpenHeartAnswer failed', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (!user) return null

  async function performSave(nextAnswer: string, forQuestion: OpenHeartQuestion) {
    if (!user) return
    setSaveStatus('saving')
    const isNewEntry = !entryExistsRef.current
    const draft: OpenHeartAnswerDraft = { questionId: forQuestion.id, questionText: forQuestion.text, answer: nextAnswer }
    const result = await saveOpenHeartAnswer(user.id, today, draft, isNewEntry)
    if (!result.ok) {
      setSaveStatus('error')
      return
    }
    entryExistsRef.current = true
    setSaveStatus('saved')
    if (isMeaningfulText(nextAnswer)) {
      const granted = await awardDailyMission(user.id, 'open_heart_question', today)
      if (granted) {
        void recordActivity('openHeartQuestion')
        void completeActivity('open-heart-question')
      }
    }
  }

  function updateAnswer(next: string) {
    setAnswer(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void performSave(next, question)
    }, AUTOSAVE_DEBOUNCE_MS)
  }

  function saveNow() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void performSave(answer, question)
  }

  function rerollQuestion() {
    setQuestion(pickRandomQuestion(question.id))
  }

  function startAnswering() {
    setView('answering')
  }

  async function takeItOffline() {
    setView('took-offline')
    // A real, chosen way of engaging with today's question — completes the same daily
    // mission as answering in-app, exactly once (idempotent ledger), never any text stored.
    const granted = await awardDailyMission(user!.id, 'open_heart_question', today)
    if (granted) {
      void recordActivity('openHeartQuestion')
      void completeActivity('open-heart-question')
    }
  }

  const statusText: Record<SaveStatus, string> = {
    idle: '',
    saving: 'กำลังบันทึก...',
    saved: 'บันทึกแล้ว ✓',
    error: 'ยังบันทึกไม่ได้ ข้อความของคุณยังอยู่ในหน้านี้ กรุณาลองอีกครั้ง',
  }

  return (
    <div>
      <PageHeader title="💬 คำถามเปิดใจวันนี้" subtitle="บางบทสนทนาเริ่มต้นได้ด้วยคำถามดี ๆ เพียงหนึ่งข้อ" />

      <div className="flex flex-col gap-4 px-5 pb-6">
        <Card className="bg-gradient-to-br from-pink-glow/40 to-white">
          <p className="text-xs font-medium text-pink-text">{OPEN_HEART_CATEGORY_LABELS[question.category]}</p>
          <p className="mt-2 text-lg font-bold text-ink">{question.text}</p>
          {view !== 'answering' ? (
            <button type="button" onClick={rerollQuestion} className="mt-3 text-sm font-semibold text-lavender-600">
              🔀 สุ่มคำถามใหม่
            </button>
          ) : null}
        </Card>

        {loading ? null : view === 'choose' ? (
          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={startAnswering}>
              ตอบของฉัน
            </Button>
            <Button fullWidth variant="secondary" onClick={takeItOffline}>
              เอาไปคุยกับใครสักคน
            </Button>
          </div>
        ) : view === 'took-offline' ? (
          <Card className="text-center">
            <p className="text-3xl" aria-hidden>
              🤍
            </p>
            <p className="mt-2 text-sm font-medium text-ink">ขอให้บทสนทนานี้ดีนะ</p>
          </Card>
        ) : (
          <>
            <Card>
              <p
                className="min-h-[1.25rem] text-xs font-medium"
                style={{ color: saveStatus === 'error' ? '#d9578e' : undefined }}
              >
                <span className={saveStatus === 'error' ? '' : 'text-ink-faint'}>{statusText[saveStatus]}</span>
              </p>
              <textarea
                value={answer}
                onChange={(e) => updateAnswer(e.target.value)}
                maxLength={MAX_OPEN_HEART_ANSWER_LENGTH}
                placeholder="เขียนคำตอบของคุณที่นี่ ไม่ว่าจะสั้นหรือยาว..."
                rows={8}
                className="mt-1 w-full resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
              />
              <p className="mt-1 text-right text-xs text-ink-faint">
                {answer.length.toLocaleString('th-TH')} / {MAX_OPEN_HEART_ANSWER_LENGTH.toLocaleString('th-TH')}
              </p>
            </Card>
            <Button fullWidth onClick={saveNow}>
              บันทึก
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
