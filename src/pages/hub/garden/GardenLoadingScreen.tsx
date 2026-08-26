export function GardenLoadingScreen() {
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="animate-float-slow text-5xl" aria-hidden>
        🌿
      </div>
      <p className="text-sm font-medium text-ink-soft">กำลังเข้าสวน... 🌿</p>
    </div>
  )
}
