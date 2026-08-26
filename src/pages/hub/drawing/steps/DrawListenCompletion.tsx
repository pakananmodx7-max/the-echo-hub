import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'

interface DrawListenCompletionProps {
  onDone: () => void
}

export function DrawListenCompletion({ onDone }: DrawListenCompletionProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <Card className="bg-gradient-to-br from-mint/40 to-white text-center">
        <p className="text-4xl" aria-hidden>
          🤍
        </p>
        <h1 className="mt-3 text-xl font-bold text-ink">ขอบคุณที่วาด เล่า และฟังกัน 🤍</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          บางครั้งการเข้าใจกัน อาจเริ่มจากการมีพื้นที่เล็ก ๆ ให้ใครสักคนได้เล่าในแบบของตัวเอง
        </p>
        <Button fullWidth className="mt-5" onClick={onDone}>
          กลับไปหน้าวาด & ฟัง
        </Button>
      </Card>
    </div>
  )
}
