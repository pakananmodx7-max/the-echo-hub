import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'
import { defaultPlayerName } from '../../../../../features/friendBond/whoAmI/gameEngine'

interface PlayerNamesStepProps {
  count: number
  names: string[]
  onChange: (names: string[]) => void
  onContinue: () => void
}

export function PlayerNamesStep({ count, names, onChange, onContinue }: PlayerNamesStepProps) {
  const list = Array.from({ length: count }, (_, i) => names[i] ?? '')

  function updateName(index: number, value: string) {
    const next = [...list]
    next[index] = value
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-3xl" aria-hidden>
          ✏️
        </p>
        <p className="mt-2 font-semibold text-ink">ตั้งชื่อเล่นผู้เล่นแต่ละคน</p>
        <p className="mt-1 text-sm text-ink-soft">ไม่บังคับต้องใช้ชื่อจริง เช่น Moon, Mochi, Panda</p>
      </Card>

      <Card className="flex flex-col gap-3">
        {list.map((name, i) => (
          <input
            key={i}
            type="text"
            value={name}
            onChange={(e) => updateName(i, e.target.value)}
            placeholder={defaultPlayerName(i)}
            maxLength={16}
            className="rounded-2xl border-2 border-lavender-100 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-lavender-300"
          />
        ))}
      </Card>

      <Button fullWidth onClick={onContinue}>
        ต่อไป
      </Button>
    </div>
  )
}
