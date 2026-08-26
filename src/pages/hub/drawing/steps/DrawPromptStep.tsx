import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'

interface DrawPromptStepProps {
  prompt: string | null
  freeDraw: boolean
  previousPrompt: string | null
  onRandom: () => void
  onUseSame: () => void
  onFreeDraw: () => void
  onContinue: () => void
}

export function DrawPromptStep({
  prompt,
  freeDraw,
  previousPrompt,
  onRandom,
  onUseSame,
  onFreeDraw,
  onContinue,
}: DrawPromptStepProps) {
  const chosen = !!prompt || freeDraw

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <h1 className="text-xl font-bold text-ink">ลองวาดอะไรบางอย่างกัน</h1>

      {prompt && !freeDraw ? (
        <Card className="bg-gradient-to-br from-lavender-50 to-white text-center">
          <p className="text-lg font-medium leading-relaxed text-ink">"{prompt}"</p>
        </Card>
      ) : freeDraw ? (
        <Card className="bg-gradient-to-br from-mint/40 to-white text-center">
          <p className="text-lg font-medium text-ink">✏️ วาดอิสระ</p>
          <p className="mt-1 text-sm text-ink-soft">วาดอะไรก็ได้ที่อยากวาดวันนี้</p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {!chosen ? (
          <Button fullWidth onClick={onRandom}>
            🎲 สุ่มโจทย์ให้เรา
          </Button>
        ) : (
          <Button fullWidth variant="secondary" onClick={onRandom}>
            🎲 สุ่มใหม่
          </Button>
        )}

        {previousPrompt && !chosen ? (
          <Button fullWidth variant="secondary" onClick={onUseSame}>
            🔁 ใช้โจทย์เดิม
          </Button>
        ) : null}

        {!freeDraw ? (
          <Button fullWidth variant="ghost" onClick={onFreeDraw}>
            ✏️ วาดอิสระ
          </Button>
        ) : (
          <Button fullWidth variant="ghost" onClick={onRandom}>
            🎲 ขอโจทย์แทน
          </Button>
        )}
      </div>

      <Button fullWidth disabled={!chosen} onClick={onContinue} className="mt-2">
        ไปวาดกันเลย →
      </Button>
    </div>
  )
}
