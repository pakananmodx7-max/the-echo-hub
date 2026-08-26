import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Avatar } from '../../../../components/Avatar'
import { getMoodById } from '../../../../data/moods'
import type { GardenMember } from '../../../../features/garden/types'

interface PrivateBenchModalProps {
  open: boolean
  onClose: () => void
  members: GardenMember[]
  onRequestMember: (member: GardenMember) => void
}

export function PrivateBenchModal({ open, onClose, members, onRequestMember }: PrivateBenchModalProps) {
  const [view, setView] = useState<'intro' | 'pick'>('intro')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setView('intro')
      setSelectedId(null)
    }
  }, [open])

  const selected = members.find((m) => m.id === selectedId) ?? null

  return (
    <Modal open={open} onClose={onClose}>
      <p className="text-3xl" aria-hidden>
        🪑
      </p>
      <h2 className="mt-1 text-lg font-bold text-ink">Private Bench</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        "ถ้าอยากคุยต่อแบบส่วนตัว สามารถชวนใครสักคนไปคุยกันได้"
      </p>

      {view === 'intro' ? (
        <div className="mt-4 flex flex-col gap-2.5">
          <Button fullWidth onClick={() => setView('pick')}>
            เลือกสมาชิก
          </Button>
          <Button fullWidth variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
            {members.map((m) => {
              const mood = getMoodById(m.mood)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left transition ${
                    selectedId === m.id ? 'border-lavender-400 bg-lavender-50' : 'border-transparent bg-cream-deep/60'
                  }`}
                >
                  <Avatar avatarId={m.avatarId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{m.codename}</p>
                    <p className="text-xs text-ink-soft">
                      <span aria-hidden>{mood?.emoji}</span> {mood?.label}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          <Button fullWidth disabled={!selected} onClick={() => selected && onRequestMember(selected)}>
            ส่งคำขอคุย
          </Button>
          <Button fullWidth variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </Modal>
  )
}
