import { ECHO_STICKERS } from '../data/stickers'

interface StickerPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (stickerId: string) => void
  /** 'chat' uses PrivateChatPage's CSS custom properties (dark-mode aware); 'plain' uses
   * THE ECHO HUB's normal lavender/cream Tailwind palette (Garden World Chat, always light). */
  variant?: 'chat' | 'plain'
}

/**
 * The lightweight sticker panel shared by Private Chat and Garden World Chat — a bottom
 * sheet over the composer, one tap sends immediately (see onSelect). Every sticker comes
 * from the fixed ECHO_STICKERS catalog (see stickers.ts); nothing here is user-uploaded or
 * fetched, so there's no loading state and no network cost.
 */
export function StickerPicker({ open, onClose, onSelect, variant = 'plain' }: StickerPickerProps) {
  if (!open) return null

  const sheetStyle = variant === 'chat' ? { background: 'var(--chat-modal-bg)', color: 'var(--chat-text)' } : undefined
  const sheetClass = variant === 'chat' ? 'w-full rounded-t-3xl p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] animate-modal-in' : 'w-full rounded-t-3xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] animate-modal-in'
  const titleClass = variant === 'chat' ? 'text-sm font-semibold' : 'text-sm font-semibold text-ink'
  const handleClass = variant === 'chat' ? 'mx-auto mb-4 h-1 w-10 rounded-full opacity-30' : 'mx-auto mb-4 h-1 w-10 rounded-full bg-lavender-100'
  const stickerBtnClass =
    variant === 'chat'
      ? 'flex flex-col items-center gap-1 rounded-2xl p-2.5 text-center transition active:scale-95'
      : 'flex flex-col items-center gap-1 rounded-2xl bg-cream-deep/60 p-2.5 text-center transition active:scale-95 hover:bg-lavender-50'
  const stickerBtnStyle = variant === 'chat' ? { background: 'var(--chat-bubble-in-bg)' } : undefined
  const labelClass = variant === 'chat' ? 'text-[11px] leading-tight opacity-80' : 'text-[11px] leading-tight text-ink-soft'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="เลือกสติกเกอร์"
    >
      <div className={sheetClass} style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div className={handleClass} style={variant === 'chat' ? { background: 'var(--chat-text-faint)' } : undefined} />
        <p className={titleClass}>🧸 ECHO Sticker</p>
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {ECHO_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => {
                onSelect(sticker.id)
                onClose()
              }}
              className={stickerBtnClass}
              style={stickerBtnStyle}
              aria-label={sticker.label}
            >
              <span className="text-3xl" aria-hidden>
                {sticker.emoji}
              </span>
              <span className={labelClass}>{sticker.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
