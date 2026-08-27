import { Card } from '../../../../../components/Card'
import type { WhoAmIGameMode } from '../../../../../features/friendBond/whoAmI/types'

interface ModeSelectStepProps {
  onSelect: (mode: WhoAmIGameMode) => void
}

const MODES: { mode: WhoAmIGameMode; emoji: string; label: string; desc: string }[] = [
  { mode: 'solo', emoji: '🎮', label: 'เล่นปกติ', desc: 'เลือกหมวด แล้วผลัดกันช่วยใบ้ให้คนถือมือถือ' },
  { mode: 'multiplayer', emoji: '👥', label: 'ผลัดกันทาย', desc: 'เล่นกับเพื่อน 2–12 คน ผลัดกันถือมือถือทีละคน' },
  { mode: 'team', emoji: '⚔️', label: 'ทีมปะทะทีม', desc: 'แบ่งทีม แข่งกันสะสมคะแนน' },
]

export function ModeSelectStep({ onSelect }: ModeSelectStepProps) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-4xl" aria-hidden>
          🎭
        </p>
        <p className="mt-2 text-lg font-semibold text-ink">ทายสิ...ฉันคือใคร?</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">เลือกหมวด แล้วส่งโทรศัพท์ให้เพื่อนช่วยกันใบ้!</p>
      </Card>

      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          onClick={() => onSelect(m.mode)}
          className="rounded-3xl bg-white p-5 text-left shadow-card transition active:scale-[0.98]"
        >
          <p className="text-lg font-semibold text-ink">
            <span aria-hidden>{m.emoji}</span> {m.label}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{m.desc}</p>
        </button>
      ))}
    </div>
  )
}
