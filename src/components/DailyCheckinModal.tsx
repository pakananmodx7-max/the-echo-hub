import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { MoodPicker } from './MoodPicker'
import { useAuth } from '../hooks/useAuth'
import { getBangkokDateString } from '../lib/thailandDate'
import type { MoodId } from '../types'

/**
 * The gentle once-a-day mood check-in — mounted globally in HubLayout so it appears the
 * moment an authenticated student first lands in the hub on a new Bangkok calendar day.
 * Gating source of truth is `user.lastCheckinDate` from Firestore (realtime via
 * AuthContext), never localStorage — logging out and back in the same day, or opening a
 * second device, must not ask again, and a genuinely new day makes it available again
 * automatically. "ไว้ทีหลัง" just dismisses it for the rest of this session — it can
 * reappear on a later visit the same day, but never nags mid-session.
 */
export function DailyCheckinModal() {
  const { user, completeDailyCheckin } = useAuth()
  const [dismissedThisSession, setDismissedThisSession] = useState(false)
  const [selected, setSelected] = useState<MoodId | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const today = getBangkokDateString()
  const shouldShow = !!user && user.onboardingComplete && user.lastCheckinDate !== today && !dismissedThisSession

  async function handleConfirm() {
    if (!selected) return
    setSubmitting(true)
    try {
      await completeDailyCheckin(selected)
    } finally {
      setSubmitting(false)
      setSelected(null)
    }
  }

  function handleSkip() {
    setDismissedThisSession(true)
    setSelected(null)
  }

  return (
    <Modal open={shouldShow} onClose={handleSkip}>
      <h2 className="text-lg font-bold text-ink">วันนี้เป็นยังไงบ้าง? 🌤️</h2>
      <p className="mt-1 text-sm text-ink-soft">ลองเลือกความรู้สึกที่ใกล้กับคุณที่สุดในวันนี้</p>

      <div className="mt-4 max-h-[50vh] overflow-y-auto">
        <MoodPicker selected={selected} onSelect={setSelected} />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <Button fullWidth onClick={handleConfirm} disabled={!selected || submitting}>
          เช็กอิน 🤍
        </Button>
        <Button fullWidth variant="ghost" onClick={handleSkip} disabled={submitting}>
          ไว้ทีหลัง
        </Button>
      </div>
    </Modal>
  )
}
