import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'

interface HowToPlayStepProps {
  onReady: () => void
}

const STEPS = [
  'เลือกหมวด',
  'ถือโทรศัพท์ไว้ที่หน้าผากโดยไม่ดูคำ',
  'ให้เพื่อนช่วยกันใบ้',
  'ห้ามพูดคำตอบตรง ๆ',
  'ทายถูกกด ถูก!',
  'ถ้าไม่รู้กด ข้าม',
  'ทายให้ได้มากที่สุดก่อนหมดเวลา',
]

export function HowToPlayStep({ onReady }: HowToPlayStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card>
        <p className="text-center text-3xl" aria-hidden>
          📖
        </p>
        <p className="mt-2 text-center font-semibold text-ink">วิธีเล่น</p>
        <ol className="mt-4 flex flex-col gap-2.5">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-ink-soft">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender-100 text-xs font-bold text-lavender-600">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Button fullWidth onClick={onReady}>
        พร้อมแล้ว! 🎭
      </Button>
    </div>
  )
}
