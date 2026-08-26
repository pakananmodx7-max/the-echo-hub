import { useState } from 'react'
import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'
import { DONT_INTERPRET_EXAMPLES } from '../../../../data/listeningMissions'
import { ListeningGuide } from './ListeningGuide'

interface ListeningModeProps {
  drawingDataUrl: string
  onContinue: () => void
}

export function ListeningMode({ drawingDataUrl, onContinue }: ListeningModeProps) {
  const [showExamples, setShowExamples] = useState(false)

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        <img src={drawingDataUrl} alt="ภาพที่วาด" className="aspect-[4/5] w-full bg-cream-deep object-contain" />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">ถึงเวลาฟังกัน 🤍</h1>
        <p className="mt-1 text-sm font-medium text-pink-text">"อย่าเพิ่งเดาความหมายของภาพ"</p>
        <p className="mt-1 text-sm text-ink-soft">ลองให้เจ้าของภาพเป็นคนเล่าเรื่องของเขาด้วยตัวเอง</p>
      </div>

      <Card className="bg-gradient-to-br from-pink-glow/40 to-white text-center">
        <p className="text-sm text-ink-soft">ลองเริ่มด้วยคำถามนี้</p>
        <p className="mt-1 text-lg font-semibold text-ink">"อยากเล่าเกี่ยวกับรูปนี้ไหม?"</p>
      </Card>

      <ListeningGuide />

      <div>
        <button
          type="button"
          onClick={() => setShowExamples((v) => !v)}
          className="w-full rounded-2xl bg-white px-4 py-3 text-left text-sm font-medium text-lavender-600 shadow-card"
        >
          {showExamples ? '▾' : '▸'} ถ้าไม่รู้จะถามยังไง ลองดูตัวอย่าง
        </button>
        {showExamples ? (
          <div className="mt-3 flex flex-col gap-3">
            {DONT_INTERPRET_EXAMPLES.map((ex, i) => (
              <Card key={i} className="text-sm">
                <p className="text-ink-faint">ไม่ควรพูด</p>
                <p className="mt-0.5 text-ink-soft line-through decoration-pink-deep/60">"{ex.avoid}"</p>
                <p className="mt-2 text-ink-faint">ลองถามแทน</p>
                <p className="mt-0.5 font-medium text-ink">"{ex.askInstead}"</p>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      <Button fullWidth onClick={onContinue} className="mt-1">
        ไปต่อ →
      </Button>
    </div>
  )
}
