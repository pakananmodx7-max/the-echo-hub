import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'
import { LISTENER_REFLECTION_OPTIONS } from '../../../../data/listeningMissions'

interface DrawListenReflectionProps {
  rating: number | null
  onRatingChange: (rating: number) => void
  listenerOptionId: string | null
  onListenerOptionChange: (id: string) => void
  otherText: string
  onOtherTextChange: (text: string) => void
  onContinue: () => void
}

export function DrawListenReflection({
  rating,
  onRatingChange,
  listenerOptionId,
  onListenerOptionChange,
  otherText,
  onOtherTextChange,
  onContinue,
}: DrawListenReflectionProps) {
  const canContinue = !!rating && !!listenerOptionId

  return (
    <div className="flex flex-col gap-4 px-5 pb-6">
      <h1 className="text-center text-xl font-bold text-ink">คุยกันเสร็จแล้ว ลองสะท้อนกันนิดนึง</h1>

      <Card>
        <p className="text-sm font-semibold text-ink">สำหรับคนที่วาด</p>
        <p className="mt-1 text-sm text-ink-soft">วันนี้คุณรู้สึกว่าอีกฝ่ายฟังคุณแค่ไหน?</p>
        <div className="mt-3 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              aria-label={`${star} ดาว`}
              className="text-3xl transition active:scale-90"
            >
              <span aria-hidden>{rating && star <= rating ? '⭐' : '☆'}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-ink">สำหรับคนฟัง</p>
        <p className="mt-1 text-sm text-ink-soft">วันนี้คุณได้เรียนรู้อะไรจากการฟัง?</p>
        <div className="mt-3 flex flex-col gap-2">
          {LISTENER_REFLECTION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onListenerOptionChange(option.id)}
              className={`rounded-2xl border-2 px-4 py-3 text-left text-sm transition ${
                listenerOptionId === option.id
                  ? 'border-lavender-400 bg-lavender-50 font-medium text-ink'
                  : 'border-transparent bg-cream-deep/60 text-ink-soft'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {listenerOptionId === 'other' ? (
          <textarea
            value={otherText}
            onChange={(e) => onOtherTextChange(e.target.value)}
            placeholder="อยากเล่าเพิ่มไหม (ไม่บังคับ)"
            rows={2}
            className="mt-3 w-full resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
          />
        ) : null}
      </Card>

      <Button fullWidth disabled={!canContinue} onClick={onContinue} className="mt-1">
        ไปต่อ →
      </Button>
    </div>
  )
}
