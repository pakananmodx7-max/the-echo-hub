interface GardenQuoteOverlayProps {
  /** null hides the overlay entirely. */
  content: { heading: string; text: string } | null
  leaving: boolean
}

/**
 * The shared visual for every passive, non-blocking Garden reflection — zone-entry
 * overlays (spec §11) and mindfulness-bench sit messages (spec §16) both render through
 * this one component so they read as the same gentle language. Deliberately reuses the
 * exact same fade keyframes as the reward toast (index.css's animate-reward-toast-in/out)
 * rather than inventing a second animation — same "gentle pop/slide in, fade away" feel.
 *
 * Never blocks input (pointer-events-none wrapper), never pauses movement/camera/music —
 * this is purely decorative text floating above the already-running 3D scene.
 */
export function GardenQuoteOverlay({ content, leaving }: GardenQuoteOverlayProps) {
  if (!content) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),4.5rem)] z-[65] flex justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`max-w-xs rounded-2xl bg-white/95 px-5 py-3.5 text-center shadow-soft backdrop-blur-sm motion-reduce:animate-none ${
          leaving ? 'animate-reward-toast-out' : 'animate-reward-toast-in'
        }`}
      >
        <p className="text-xs font-semibold text-lavender-600">{content.heading}</p>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{content.text}</p>
      </div>
    </div>
  )
}
