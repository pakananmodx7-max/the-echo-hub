import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'

interface RoleSwitchProps {
  onSwitch: () => void
}

export function RoleSwitch({ onSwitch }: RoleSwitchProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <Card className="bg-gradient-to-br from-lavender-100 to-pink-glow/40 text-center">
        <h1 className="text-xl font-bold text-ink">คราวนี้ลองสลับกัน 🤍</h1>
        <p className="mt-2 text-sm text-ink-soft">ส่งมือถือให้อีกฝ่าย แล้วผลัดกันเป็นคนวาดบ้าง</p>

        <div className="mt-5 flex flex-col gap-2 text-sm font-medium text-ink">
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5">
            <span>✏️ ผู้วาด</span>
            <span aria-hidden>→</span>
            <span>👂 ผู้ฟัง</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5">
            <span>👂 ผู้ฟัง</span>
            <span aria-hidden>→</span>
            <span>✏️ ผู้วาด</span>
          </div>
        </div>

        <Button fullWidth className="mt-5" onClick={onSwitch}>
          🔄 สลับกัน — ถึงตาคุณวาดแล้ว
        </Button>
      </Card>
    </div>
  )
}
