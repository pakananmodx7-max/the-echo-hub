import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { AmbientBackground } from '../components/AmbientBackground'
import { MoodPicker } from '../components/MoodPicker'
import { useAuth } from '../hooks/useAuth'
import type { MoodId } from '../types'

export function MoodCheckinPage() {
  const navigate = useNavigate()
  const { setMood, completeOnboarding } = useAuth()
  const [selected, setSelected] = useState<MoodId | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleEnter() {
    if (!selected) return
    setSubmitting(true)
    try {
      await setMood(selected)
      await completeOnboarding()
      navigate('/hub')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden px-6 py-10">
      <AmbientBackground />

      <div className="flex-1">
        <h1 className="text-2xl font-bold text-ink">วันนี้คุณรู้สึกเป็นอย่างไร?</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          "ไม่มีคำตอบที่ถูกหรือผิด เลือกสิ่งที่ใกล้กับความรู้สึกของคุณที่สุด"
        </p>

        <div className="mt-8">
          <MoodPicker selected={selected} onSelect={setSelected} />
        </div>
      </div>

      <Button fullWidth onClick={handleEnter} disabled={!selected || submitting}>
        เข้าสู่ THE ECHO →
      </Button>
    </div>
  )
}
