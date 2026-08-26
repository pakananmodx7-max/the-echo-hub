import { useState } from 'react'
import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'
import { MoodPicker } from '../../../../components/MoodPicker'
import type { MoodId } from '../../../../types'

interface SaveOrDiscardDrawingProps {
  drawingDataUrl: string
  onDiscard: () => void
  onSave: (mood: MoodId | null, reflection: string) => void
}

export function SaveOrDiscardDrawing({ drawingDataUrl, onDiscard, onSave }: SaveOrDiscardDrawingProps) {
  const [choice, setChoice] = useState<'none' | 'save'>('none')
  const [mood, setMood] = useState<MoodId | null>(null)
  const [reflection, setReflection] = useState('')

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        <img src={drawingDataUrl} alt="ภาพที่วาด" className="aspect-[4/5] w-full bg-cream-deep object-contain" />
      </div>

      <h1 className="text-center text-lg font-bold text-ink">อยากเก็บภาพนี้ไว้ไหม?</h1>
      <p className="text-center text-sm text-ink-soft">ภาพนี้เป็นของคุณ จะเก็บหรือลบก็ได้ ไม่มีใครเห็นนอกจากคุณ</p>

      {choice === 'save' ? (
        <Card>
          <p className="text-sm font-semibold text-ink">วันนี้รู้สึกยังไง? (ไม่บังคับ)</p>
          <div className="mt-3">
            <MoodPicker selected={mood} onSelect={setMood} />
          </div>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">บันทึกสั้น ๆ (ไม่บังคับ)</span>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="อยากจดอะไรไว้เกี่ยวกับภาพนี้..."
              rows={2}
              className="resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
          </label>
          <Button fullWidth className="mt-4" onClick={() => onSave(mood, reflection.trim())}>
            📖 บันทึกลง ECHO Journal
          </Button>
          <Button fullWidth variant="ghost" className="mt-2" onClick={() => setChoice('none')}>
            ย้อนกลับ
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Button fullWidth onClick={() => setChoice('save')}>
            📖 เก็บภาพนี้ใน ECHO Journal ของฉัน
          </Button>
          <Button fullWidth variant="secondary" onClick={onDiscard}>
            🗑️ จบกิจกรรมโดยไม่บันทึก
          </Button>
        </div>
      )}
    </div>
  )
}
