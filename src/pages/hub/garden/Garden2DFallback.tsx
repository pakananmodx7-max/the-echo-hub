import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'

interface Garden2DFallbackProps {
  memberCount?: number
  onOpenChat: () => void
  onOpenOnline: () => void
  onOpenSong: () => void
  onOpenKindWord: () => void
  onOpenStone: () => void
  onOpenBench: () => void
  onExit: () => void
}

export function Garden2DFallback({
  memberCount,
  onOpenChat,
  onOpenOnline,
  onOpenSong,
  onOpenKindWord,
  onOpenStone,
  onOpenBench,
  onExit,
}: Garden2DFallbackProps) {
  const count = memberCount ?? 1

  return (
    <div className="px-5 pb-8">
      <Card className="mb-4 bg-lavender-50 text-center text-xs text-ink-soft">
        อุปกรณ์นี้แสดงผลสวนแบบ 2 มิติ เนื้อหาเหมือนกับเวอร์ชัน 3 มิติทุกอย่าง
      </Card>

      <div className="flex flex-col gap-3">
        <Card onClick={onOpenChat} className="cursor-pointer">
          <p className="font-semibold text-ink">💬 Garden Chat</p>
          <p className="mt-1 text-sm text-ink-soft">พูดคุยกับทุกคนที่อยู่ในสวนตอนนี้</p>
        </Card>

        <Card onClick={onOpenSong} className="cursor-pointer bg-gradient-to-br from-lavender-50 to-white">
          <p className="font-semibold text-ink">🌳 Song Tree</p>
          <p className="mt-1 text-sm text-ink-soft">ฝากเพลงหนึ่งเพลงไว้ให้ใครสักคนที่เดินผ่านมา</p>
        </Card>

        <Card onClick={onOpenKindWord} className="cursor-pointer bg-gradient-to-br from-mint/40 to-white">
          <p className="font-semibold text-ink">🌼 Kind Word Garden</p>
          <p className="mt-1 text-sm text-ink-soft">ปลูกคำดี ๆ ไว้ในสวน</p>
        </Card>

        <Card onClick={onOpenStone} className="cursor-pointer bg-gradient-to-br from-pink-glow/40 to-white">
          <p className="font-semibold text-ink">🪨 Listening Stone</p>
          <p className="mt-1 text-sm text-ink-soft">คำถามเล็ก ๆ ที่อาจเปิดบทสนทนาดี ๆ</p>
        </Card>

        <Card onClick={onOpenBench} className="cursor-pointer">
          <p className="font-semibold text-ink">🪑 Private Bench</p>
          <p className="mt-1 text-sm text-ink-soft">ชวนใครสักคนไปคุยกันแบบส่วนตัว</p>
        </Card>

        <Card onClick={onOpenOnline} className="cursor-pointer">
          <p className="font-semibold text-ink">👥 คนที่อยู่ในสวน</p>
          <p className="mt-1 text-sm text-ink-soft">มี {count} คนอยู่ในสวนตอนนี้</p>
        </Card>
      </div>

      <Button fullWidth variant="secondary" className="mt-5" onClick={onExit}>
        🚪 ออกจากสวน
      </Button>
    </div>
  )
}
