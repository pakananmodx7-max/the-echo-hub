const GUIDE_ITEMS = [
  { icon: '👂', label: 'ฟังให้จบ' },
  { icon: '💬', label: 'ถามเพื่อเข้าใจ' },
  { icon: '❤️', label: 'ไม่ตัดสิน' },
  { icon: '🚫', label: 'ไม่ตีความภาพแทนเจ้าของ' },
  { icon: '🚫', label: 'ไม่รีบให้คำแนะนำ' },
]

export function ListeningGuide() {
  return (
    <div className="rounded-3xl bg-lavender-50 p-4">
      <p className="text-sm font-semibold text-ink">ฟังด้วยใจ</p>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {GUIDE_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 rounded-2xl bg-white/70 px-3 py-2">
            <span className="text-lg" aria-hidden>
              {item.icon}
            </span>
            <span className="text-sm text-ink">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
