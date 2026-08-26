import { getMoodById } from '../data/moods'
import type { MoodId } from '../types'

interface MoodBadgeProps {
  mood: MoodId | null | undefined
  onClick?: () => void
  size?: 'sm' | 'md'
}

export function MoodBadge({ mood, onClick, size = 'sm' }: MoodBadgeProps) {
  const m = getMoodById(mood ?? undefined)
  if (!m) return null
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  const Component = onClick ? 'button' : 'span'
  return (
    <Component
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={`inline-flex items-center gap-1 rounded-full bg-white/70 ${padding} font-medium text-ink-soft border border-lavender-100 ${
        onClick ? 'active:scale-95 transition' : ''
      }`}
    >
      <span aria-hidden>{m.emoji}</span>
      <span>{m.label}</span>
    </Component>
  )
}
