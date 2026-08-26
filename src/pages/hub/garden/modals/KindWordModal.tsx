import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'
import { kindWordService } from '../../../../features/garden/kindWordService'
import { KIND_WORD_PRESETS, KIND_WORD_MAX_LENGTH } from '../../../../data/gardenPrompts'
import type { KindWordEntry } from '../../../../features/garden/types'

interface KindWordModalProps {
  open: boolean
  onClose: () => void
  currentUser: { id: string; codename: string }
}

export function KindWordModal({ open, onClose, currentUser }: KindWordModalProps) {
  const [entries, setEntries] = useState<KindWordEntry[]>(() => kindWordService.listEntries())
  const [view, setView] = useState<'list' | 'add'>('list')
  const [custom, setCustom] = useState('')
  const [viewingEntry, setViewingEntry] = useState<KindWordEntry | null>(null)

  useEffect(() => kindWordService.subscribe(setEntries), [])

  useEffect(() => {
    if (!open) {
      setView('list')
      setViewingEntry(null)
    }
  }, [open])

  function plant(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    kindWordService.addEntry({ authorId: currentUser.id, authorCodename: currentUser.codename, text: trimmed })
    setCustom('')
    setView('list')
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="max-h-[75vh] overflow-y-auto">
        <p className="text-3xl" aria-hidden>
          🌼
        </p>
        <h2 className="mt-1 text-lg font-bold text-ink">KIND WORD GARDEN</h2>
        <p className="text-sm text-ink-soft">ปลูกคำดี ๆ ไว้ในสวน</p>

        {viewingEntry ? (
          <div className="mt-4 text-center">
            <p className="text-4xl" aria-hidden>
              🌼
            </p>
            <p className="mt-2 text-lg font-medium text-ink">"{viewingEntry.text}"</p>
            <p className="mt-1 text-sm text-ink-faint">— {viewingEntry.authorCodename}</p>
            <Button fullWidth variant="ghost" className="mt-4" onClick={() => setViewingEntry(null)}>
              ย้อนกลับ
            </Button>
          </div>
        ) : view === 'list' ? (
          <div className="mt-4 flex flex-col gap-3">
            <Button fullWidth onClick={() => setView('add')}>
              🌱 ปลูกคำดี ๆ
            </Button>
            <div className="grid grid-cols-3 gap-2">
              {entries
                .slice()
                .reverse()
                .map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setViewingEntry(entry)}
                    className="flex flex-col items-center gap-1 rounded-2xl bg-mint/30 py-3"
                  >
                    <span className="text-2xl" aria-hidden>
                      🌼
                    </span>
                  </button>
                ))}
            </div>
            <p className="text-center text-xs text-ink-faint">แตะดอกไม้เพื่ออ่านคำดี ๆ</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            {KIND_WORD_PRESETS.map((preset) => (
              <Card key={preset} onClick={() => plant(preset)} className="cursor-pointer py-3 text-center">
                <p className="text-sm text-ink">{preset}</p>
              </Card>
            ))}
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value.slice(0, KIND_WORD_MAX_LENGTH))}
              placeholder="หรือพิมพ์ข้อความของคุณเอง..."
              rows={2}
              maxLength={KIND_WORD_MAX_LENGTH}
              className="resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
            <Button fullWidth disabled={!custom.trim()} onClick={() => plant(custom)}>
              ปลูกคำนี้
            </Button>
            <Button fullWidth variant="ghost" onClick={() => setView('list')}>
              ย้อนกลับ
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
