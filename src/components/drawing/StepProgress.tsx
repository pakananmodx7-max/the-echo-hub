const STEP_COUNT = 5

interface StepProgressProps {
  current: number
}

export function StepProgress({ current }: StepProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2" aria-label={`ขั้นตอนที่ ${current} จาก ${STEP_COUNT}`}>
      {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((step) => (
        <span
          key={step}
          className={`h-1.5 rounded-full transition-all ${
            step === current ? 'w-5 bg-lavender-500' : step < current ? 'w-1.5 bg-lavender-300' : 'w-1.5 bg-lavender-100'
          }`}
          aria-hidden
        />
      ))}
    </div>
  )
}
