import { GARDEN_EMOTES, type GardenEmoteId } from '../../../data/gardenEmotes'

interface GardenEmotePanelProps {
  onSelectEmote: (id: GardenEmoteId) => void
  /** "🪑 นั่ง" only does something meaningful near an actual free seat — it calls the real
   * seat-claim flow (see EchoGardenPage), never a second fake sit animation. */
  onSit: () => void
  canSit: boolean
  /** "🧍 ยืนปกติ" clears whichever emote is active and, if seated, stands up too. */
  onStand: () => void
  isSeated: boolean
  onClose: () => void
}

/**
 * The "😊 ท่าทาง" grid — desktop gets it as a small floating panel (see GardenHUD.tsx's
 * placement), mobile as a bottom sheet; both just render this same Modal content, no
 * separate layouts to maintain.
 */
export function GardenEmotePanel({ onSelectEmote, onSit, canSit, onStand, isSeated, onClose }: GardenEmotePanelProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-ink">😊 ท่าทาง</h2>
      <p className="mt-1 text-sm text-ink-soft">คนอื่นในสวนจะเห็นท่าทางนี้ทันที</p>

      <div className="mt-4 grid grid-cols-4 gap-2.5">
        {GARDEN_EMOTES.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              onSelectEmote(e.id)
              onClose()
            }}
            className="flex flex-col items-center gap-1 rounded-2xl bg-cream-deep/60 px-2 py-3 text-center transition active:scale-95"
          >
            <span className="text-2xl leading-none" aria-hidden>
              {e.icon}
            </span>
            <span className="text-[11px] font-medium text-ink-soft">{e.label}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            if (canSit) onSit()
            onClose()
          }}
          disabled={!canSit}
          className="flex flex-col items-center gap-1 rounded-2xl bg-cream-deep/60 px-2 py-3 text-center transition active:scale-95 disabled:opacity-40"
        >
          <span className="text-2xl leading-none" aria-hidden>
            🪑
          </span>
          <span className="text-[11px] font-medium text-ink-soft">นั่ง</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onStand()
            onClose()
          }}
          className="flex flex-col items-center gap-1 rounded-2xl bg-cream-deep/60 px-2 py-3 text-center transition active:scale-95"
        >
          <span className="text-2xl leading-none" aria-hidden>
            🧍
          </span>
          <span className="text-[11px] font-medium text-ink-soft">ยืนปกติ</span>
        </button>
      </div>

      {!canSit && !isSeated ? (
        <p className="mt-3 text-xs text-ink-faint">เข้าใกล้เก้าอี้ว่างเพื่อ &ldquo;นั่ง&rdquo;</p>
      ) : null}
    </div>
  )
}
