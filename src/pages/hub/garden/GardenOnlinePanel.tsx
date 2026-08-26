import { Avatar } from '../../../components/Avatar'
import { getMoodById } from '../../../data/moods'
import type { GardenMember } from '../../../features/garden/types'

interface GardenOnlinePanelProps {
  members: GardenMember[]
  onGreet: (member: GardenMember) => void
  onRequestChat: (member: GardenMember) => void
}

export function GardenOnlinePanel({ members, onGreet, onRequestChat }: GardenOnlinePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
      <p className="mb-3 text-sm font-semibold text-ink">👥 คนที่อยู่ในสวน</p>
      <div className="flex flex-col gap-2.5">
        {members.map((m) => {
          const mood = getMoodById(m.mood)
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-cream-deep/60 px-3 py-2.5">
              <div className="relative">
                <Avatar avatarId={m.avatarId} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-mint-deep" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.codename}</p>
                <p className="text-xs text-ink-soft">
                  <span aria-hidden>{mood?.emoji}</span> {mood?.label}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => onGreet(m)}
                  aria-label={`ทักทาย ${m.codename}`}
                  className="rounded-full bg-white px-2.5 py-1.5 text-sm"
                >
                  👋
                </button>
                <button
                  type="button"
                  onClick={() => onRequestChat(m)}
                  aria-label={`ขอคุยส่วนตัวกับ ${m.codename}`}
                  className="rounded-full bg-pink-glow px-2.5 py-1.5 text-sm"
                >
                  🤍
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
