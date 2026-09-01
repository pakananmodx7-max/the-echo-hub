import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../../components/PageHeader'
import { StepProgress } from '../../../components/drawing/StepProgress'
import { randomPrompt } from '../../../data/drawPrompts'
import { randomMission } from '../../../data/listeningMissions'
import { journalService } from '../../../features/journal/journalService'
import { awardDailyMission } from '../../../features/rewards/rewardsService'
import { notifyRewardResult } from '../../../features/rewards/rewardPopupBus'
import { recordActivity } from '../../../features/analytics/analyticsService'
import { useAuth } from '../../../hooks/useAuth'
import { getBangkokDateString } from '../../../lib/thailandDate'
import type { DrawListenPartner, MoodId } from '../../../types'
import { PartnerStep } from './steps/PartnerStep'
import { DrawPromptStep } from './steps/DrawPromptStep'
import { DrawingStep } from './steps/DrawingStep'
import { ListeningMode } from './steps/ListeningMode'
import { ListeningMission } from './steps/ListeningMission'
import { DrawListenReflection } from './steps/DrawListenReflection'
import { SaveOrDiscardDrawing } from './steps/SaveOrDiscardDrawing'
import { RoleSwitch } from './steps/RoleSwitch'
import { DrawListenCompletion } from './steps/DrawListenCompletion'

type Phase =
  | 'who'
  | 'prompt'
  | 'drawing'
  | 'listening-guide'
  | 'listening-mission'
  | 'reflect'
  | 'save'
  | 'switch'
  | 'done'

function stepNumber(phase: Phase): number {
  switch (phase) {
    case 'who':
      return 1
    case 'prompt':
      return 2
    case 'drawing':
      return 3
    case 'listening-guide':
    case 'listening-mission':
      return 4
    default:
      return 5
  }
}

export function DrawAndListenPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [phase, setPhase] = useState<Phase>('who')
  const [partner, setPartner] = useState<DrawListenPartner | null>(null)
  const [round, setRound] = useState<1 | 2>(1)

  const [prompt, setPrompt] = useState<string | null>(null)
  const [freeDraw, setFreeDraw] = useState(false)
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null)

  const [drawing, setDrawing] = useState<string | null>(null)
  const [mission, setMission] = useState(() => randomMission())
  const [rating, setRating] = useState<number | null>(null)
  const [listenerOptionId, setListenerOptionId] = useState<string | null>(null)
  const [otherText, setOtherText] = useState('')

  if (!user) return null
  const userId = user.id

  function goNextAfterSaveDecision() {
    if (round === 1) {
      setPhase('switch')
    } else {
      setPhase('done')
    }
  }

  function handleDiscard() {
    setDrawing(null)
    goNextAfterSaveDecision()
  }

  function handleSave(mood: MoodId | null, reflection: string) {
    if (drawing) {
      journalService.addEntry(userId, { dataUrl: drawing, mood, reflection, source: 'draw-and-listen' })
      // Same completion event as ECHO Journal's own save — this flow saves into the same
      // journal, so it counts toward the same daily mission (never on discard).
      void awardDailyMission(userId, 'journal', getBangkokDateString()).then((result) => {
        notifyRewardResult(result, { icon: '🎨', label: 'Draw & Listen' })
      })
      void recordActivity('drawListen')
    }
    setDrawing(null)
    goNextAfterSaveDecision()
  }

  function handleSwitchRoles() {
    setPreviousPrompt(freeDraw ? null : prompt)
    setPrompt(null)
    setFreeDraw(false)
    setRating(null)
    setListenerOptionId(null)
    setOtherText('')
    setMission(randomMission())
    setRound(2)
    setPhase('prompt')
  }

  const showChrome = phase !== 'switch' && phase !== 'done'
  const showBack = phase === 'who' || (phase === 'prompt' && round === 1)

  return (
    <div>
      {showChrome ? (
        <>
          <PageHeader
            title="DRAW & LISTEN"
            subtitle="วาดให้ฉันฟัง"
            hideBack={!showBack}
            onBack={phase === 'prompt' ? () => setPhase('who') : () => navigate('/hub/draw')}
          />
          <StepProgress current={stepNumber(phase)} />
        </>
      ) : null}

      {phase === 'who' ? (
        <PartnerStep value={partner} onChange={setPartner} onContinue={() => setPhase('prompt')} />
      ) : null}

      {phase === 'prompt' ? (
        <DrawPromptStep
          prompt={prompt}
          freeDraw={freeDraw}
          previousPrompt={round === 2 ? previousPrompt : null}
          onRandom={() => {
            setPrompt(randomPrompt(prompt ?? undefined))
            setFreeDraw(false)
          }}
          onUseSame={() => {
            setPrompt(previousPrompt)
            setFreeDraw(false)
          }}
          onFreeDraw={() => {
            setPrompt(null)
            setFreeDraw(true)
          }}
          onContinue={() => setPhase('drawing')}
        />
      ) : null}

      {phase === 'drawing' ? (
        <DrawingStep
          prompt={freeDraw ? null : prompt}
          onDone={(dataUrl) => {
            setDrawing(dataUrl)
            setPhase('listening-guide')
          }}
        />
      ) : null}

      {phase === 'listening-guide' && drawing ? (
        <ListeningMode drawingDataUrl={drawing} onContinue={() => setPhase('listening-mission')} />
      ) : null}

      {phase === 'listening-mission' ? (
        <ListeningMission
          mission={mission}
          onReroll={() => setMission(randomMission(mission))}
          onContinue={() => setPhase('reflect')}
        />
      ) : null}

      {phase === 'reflect' ? (
        <DrawListenReflection
          rating={rating}
          onRatingChange={setRating}
          listenerOptionId={listenerOptionId}
          onListenerOptionChange={setListenerOptionId}
          otherText={otherText}
          onOtherTextChange={setOtherText}
          onContinue={() => setPhase('save')}
        />
      ) : null}

      {phase === 'save' && drawing ? (
        <SaveOrDiscardDrawing drawingDataUrl={drawing} onDiscard={handleDiscard} onSave={handleSave} />
      ) : null}

      {phase === 'switch' ? <RoleSwitch onSwitch={handleSwitchRoles} /> : null}

      {phase === 'done' ? <DrawListenCompletion onDone={() => navigate('/hub/draw')} /> : null}
    </div>
  )
}
