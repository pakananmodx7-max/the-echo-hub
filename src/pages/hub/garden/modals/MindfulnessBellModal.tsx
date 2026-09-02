import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { awardDailyMission } from '../../../../features/rewards/rewardsService'
import { notifyRewardResult } from '../../../../features/rewards/rewardPopupBus'
import { playBellChime } from '../../../../features/garden/playBellChime'
import { getDailyBellQuote } from '../../../../features/garden/dhammaQuotes'
import { getBangkokDateString } from '../../../../lib/thailandDate'

interface MindfulnessBellModalProps {
  open: boolean
  onClose: () => void
  userId: string
  /** Opens Daily Journal with this reflection offered as an optional, never-auto-inserted prompt. */
  onKeepInJournal: (quoteText: string) => void
}

/**
 * "🔔 ระฆังแห่งสติ" — approach + tap rings the bell, shows today's reflection (the SAME one
 * all day, see getDailyBellQuote), and grants the daily +3 via the existing idempotent
 * reward ledger. Ringing again the same day shows a reflection again but the ledger's
 * create-once semantics guarantee no second grant — notifyRewardResult already no-ops on
 * `granted: false`, so no duplicate reward toast can ever appear either.
 */
export function MindfulnessBellModal({ open, onClose, userId, onKeepInJournal }: MindfulnessBellModalProps) {
  const [rung, setRung] = useState(false)
  const today = getBangkokDateString()
  const quote = getDailyBellQuote(today)

  useEffect(() => {
    if (!open) {
      setRung(false)
      return
    }
    playBellChime()
    setRung(true)
    void awardDailyMission(userId, 'mindfulness_bell', today).then((result) => {
      notifyRewardResult(result, { icon: '🔔', label: 'ระฆังแห่งสติ' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Modal open={open} onClose={onClose}>
      <p className="text-3xl" aria-hidden>
        🔔
      </p>
      <h2 className="mt-1 text-lg font-bold text-ink">ระฆังแห่งสติ</h2>
      {rung ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">🔔 ข้อคิดประจำวันนี้</p>
          <div className="mt-4 rounded-2xl bg-lavender-50 p-4 text-center">
            <p className="whitespace-pre-line text-base font-medium leading-relaxed text-ink">{quote.text}</p>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <Button fullWidth onClick={() => onKeepInJournal(quote.text)}>
              📔 เก็บไว้ใน Journal
            </Button>
            <Button fullWidth variant="secondary" onClick={onClose}>
              🌿 รับข้อคิดนี้
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  )
}
