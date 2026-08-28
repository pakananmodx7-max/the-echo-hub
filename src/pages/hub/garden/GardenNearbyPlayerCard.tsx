import { Avatar } from '../../../components/Avatar'
import { getMoodById } from '../../../data/moods'
import type { GardenMember } from '../../../features/garden/types'

interface GardenNearbyPlayerCardProps {
  member: GardenMember
  onGreet: () => void
  onRequestChat: () => void
}

/** Floating prompt shown when the local player walks near another real person in the garden. */
export function GardenNearbyPlayerCard({ member, onGreet, onRequestChat }: GardenNearbyPlayerCardProps) {
  const mood = getMoodById(member.mood)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[7.5rem] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-3xl bg-white/85 px-3 py-2 shadow-card backdrop-blur-md">
        <Avatar avatarId={member.avatarId} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{member.codename}</p>
          <p className="text-xs text-ink-soft">
            <span aria-hidden>{mood?.emoji}</span> {mood?.label}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onGreet}
            aria-label={`ทักทาย ${member.codename}`}
            className="rounded-full bg-cream-deep px-2.5 py-1.5 text-sm"
          >
            👋
          </button>
          <button
            type="button"
            onClick={onRequestChat}
            aria-label={`ขอคุยส่วนตัวกับ ${member.codename}`}
            className="rounded-full bg-pink-glow px-2.5 py-1.5 text-sm"
          >
            🤍
          </button>
        </div>
      </div>
    </div>
  )
}
