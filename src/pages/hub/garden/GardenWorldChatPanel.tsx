import { useState } from 'react'
import { GardenChatPanel } from './GardenChatPanel'

interface GardenWorldChatPanelProps {
  currentUser: { id: string; codename: string; avatarId: string | null }
}

/** Within the spec's suggested 280–340px desktop width. */
const PANEL_WIDTH = 320

/**
 * Desktop/tablet-landscape-only persistent World Chat panel — visible by default the
 * moment the Garden loads, no "press Chat" step needed (see EchoGardenPage's flex-row
 * layout, which reserves this width so the 3D canvas resizes around it rather than being
 * covered). Hidden entirely below the `lg` breakpoint; mobile keeps the existing floating
 * 💬 button → full-screen bottom sheet instead (GardenHUD's onOpenChat, unchanged).
 *
 * Reuses GardenChatPanel exactly as-is for the message list/composer — same
 * gardenPublicChatService RTDB backend, same emoji row, same sticker picker, same message
 * safety filter. This component only adds the persistent glass frame + minimize/reopen.
 */
export function GardenWorldChatPanel({ currentUser }: GardenWorldChatPanelProps) {
  // Open by default on every Garden entry, per spec — never persisted/remembered.
  const [minimized, setMinimized] = useState(false)

  if (minimized) {
    return (
      <div className="hidden shrink-0 items-start justify-center pt-[max(env(safe-area-inset-top),4.5rem)] lg:flex" style={{ width: 56 }}>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="เปิดแชทโลก"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-lg shadow-card backdrop-blur-md transition active:scale-95"
        >
          🌍
        </button>
      </div>
    )
  }

  return (
    <div
      className="hidden shrink-0 flex-col overflow-hidden border-l border-white/50 bg-white/55 backdrop-blur-xl lg:flex"
      style={{ width: PANEL_WIDTH }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-lavender-100/60 px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">🌍 แชทโลก</p>
          <p className="truncate text-xs text-ink-soft">คุยกับทุกคนที่อยู่ในสวนตอนนี้</p>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          aria-label="ย่อแชทโลก"
          className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-lavender-50 active:scale-95"
        >
          ย่อ ✕
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <GardenChatPanel currentUser={currentUser} />
      </div>
    </div>
  )
}
