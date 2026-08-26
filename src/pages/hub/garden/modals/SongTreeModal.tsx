import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Card } from '../../../../components/Card'
import { songTreeService } from '../../../../features/garden/songTreeService'
import type { SongTreeEntry } from '../../../../features/garden/types'

interface SongTreeModalProps {
  open: boolean
  onClose: () => void
  currentUser: { id: string; codename: string }
}

export function SongTreeModal({ open, onClose, currentUser }: SongTreeModalProps) {
  const [entries, setEntries] = useState<SongTreeEntry[]>(() => songTreeService.listEntries())
  const [view, setView] = useState<'list' | 'add'>('list')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [link, setLink] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => songTreeService.subscribe(setEntries), [])

  useEffect(() => {
    if (!open) setView('list')
  }, [open])

  function handleAdd() {
    if (!title.trim() || !artist.trim()) return
    songTreeService.addEntry({
      authorId: currentUser.id,
      authorCodename: currentUser.codename,
      title: title.trim(),
      artist: artist.trim(),
      link: link.trim() || undefined,
      message: message.trim(),
    })
    setTitle('')
    setArtist('')
    setLink('')
    setMessage('')
    setView('list')
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="max-h-[75vh] overflow-y-auto">
        <p className="text-3xl" aria-hidden>
          🌳
        </p>
        <h2 className="mt-1 text-lg font-bold text-ink">SONG TREE</h2>
        <p className="text-sm text-ink-soft">ฝากเพลงหนึ่งเพลงไว้ให้ใครสักคนที่เดินผ่านมา</p>

        {view === 'list' ? (
          <div className="mt-4 flex flex-col gap-3">
            <Button fullWidth onClick={() => setView('add')}>
              🎧 ฝากเพลงไว้ในสวน
            </Button>
            {entries
              .slice()
              .reverse()
              .map((entry) => (
                <Card key={entry.id} className="text-left">
                  <p className="font-semibold text-ink">
                    {entry.title} — {entry.artist}
                  </p>
                  {entry.message ? <p className="mt-1 text-sm text-ink-soft">"{entry.message}"</p> : null}
                  <p className="mt-1 text-xs text-ink-faint">โดย {entry.authorCodename}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => songTreeService.react(entry.id)}
                      className="rounded-full bg-pink-glow px-3 py-1 text-xs font-medium text-pink-text"
                    >
                      🤍 {entry.reactionCount}
                    </button>
                    {entry.link ? (
                      <a
                        href={entry.link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-lavender-50 px-3 py-1 text-xs font-medium text-lavender-600"
                      >
                        เปิดเพลง ↗
                      </a>
                    ) : null}
                  </div>
                </Card>
              ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ชื่อเพลง"
              className="rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="ศิลปิน"
              className="rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="ลิงก์เพลง (ไม่บังคับ)"
              className="rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 120))}
              placeholder='ข้อความสั้น ๆ เช่น "เผื่อวันนี้ใครกำลังเหนื่อย 🤍"'
              rows={2}
              maxLength={120}
              className="resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-sm outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
            />
            <Button fullWidth disabled={!title.trim() || !artist.trim()} onClick={handleAdd}>
              ฝากเพลงไว้ในสวน
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
