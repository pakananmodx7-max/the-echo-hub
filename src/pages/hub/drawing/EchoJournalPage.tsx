import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { MoodPicker } from '../../../components/MoodPicker'
import { SharedDrawingCanvas, type DrawingCanvasHandle } from '../../../components/drawing/SharedDrawingCanvas'
import { getMoodById } from '../../../data/moods'
import { journalService } from '../../../features/journal/journalService'
import { awardDailyMission } from '../../../features/rewards/rewardsService'
import { recordActivity } from '../../../features/analytics/analyticsService'
import { useAuth } from '../../../hooks/useAuth'
import { getBangkokDateString } from '../../../lib/thailandDate'
import type { JournalEntry, MoodId } from '../../../types'

type View = 'list' | 'new'

export function EchoJournalPage() {
  const { user } = useAuth()
  const [view, setView] = useState<View>('list')
  const [entries, setEntries] = useState<JournalEntry[]>(() => (user ? journalService.listEntries(user.id) : []))
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)

  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [mood, setMood] = useState<MoodId | null>(null)
  const [reflection, setReflection] = useState('')

  const sortedEntries = useMemo(() => entries, [entries])

  function startNewEntry() {
    setMood(null)
    setReflection('')
    setHasStrokes(false)
    setView('new')
  }

  function handleSave() {
    if (!user || !hasStrokes) return
    const dataUrl = canvasRef.current?.exportPng() ?? ''
    if (!dataUrl) return
    const entry = journalService.addEntry(user.id, {
      dataUrl,
      mood,
      reflection: reflection.trim(),
      source: 'journal',
    })
    setEntries((prev) => [entry, ...prev])
    setView('list')
    // A real save (a drawing was actually made and kept) is the completion event for the
    // daily "ECHO Journal" mission — never just opening the page.
    void awardDailyMission(user.id, 'journal', getBangkokDateString())
    void recordActivity('echoJournal')
  }

  if (!user) return null

  if (view === 'new') {
    return (
      <div>
        <PageHeader title="ECHO Journal" subtitle="วาดสิ่งที่อยู่ในใจของฉัน" onBack={() => setView('list')} />

        <div className="flex flex-col gap-4 px-5 pb-6">
          <SharedDrawingCanvas ref={canvasRef} onStrokesChange={setHasStrokes} />

          <Card>
            <p className="text-sm font-semibold text-ink">วันนี้รู้สึกยังไง? (ไม่บังคับ)</p>
            <div className="mt-3">
              <MoodPicker selected={mood} onSelect={setMood} />
            </div>
          </Card>

          <Card>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">บันทึกสั้น ๆ (ไม่บังคับ)</span>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="อยากบอกอะไรกับตัวเองวันนี้..."
                rows={3}
                className="resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
              />
            </label>
          </Card>

          <Button fullWidth disabled={!hasStrokes} onClick={handleSave}>
            บันทึกลง ECHO Journal
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="ECHO Journal" subtitle="วาดสิ่งที่อยู่ในใจของฉัน" />

      <div className="px-5 pb-6">
        <Button fullWidth onClick={startNewEntry}>
          🖊️ วาดใหม่
        </Button>

        {sortedEntries.length === 0 ? (
          <Card className="mt-4 text-center">
            <p className="text-3xl" aria-hidden>
              📖
            </p>
            <p className="mt-2 text-sm text-ink-soft">ยังไม่มีบันทึก ลองวาดสิ่งแรกของคุณดูสิ</p>
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {sortedEntries.map((entry) => {
              const entryMood = getMoodById(entry.mood ?? undefined)
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setViewingEntry(entry)}
                  className="overflow-hidden rounded-3xl bg-white text-left shadow-card transition active:scale-[0.98]"
                >
                  <img src={entry.dataUrl} alt="" className="aspect-square w-full bg-cream-deep object-contain" />
                  <div className="p-3">
                    <p className="text-xs text-ink-faint">
                      {new Date(entry.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                    {entryMood ? (
                      <p className="mt-1 text-xs text-ink-soft">
                        <span aria-hidden>{entryMood.emoji}</span> {entryMood.label}
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {viewingEntry ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-6 backdrop-blur-sm"
          onClick={() => setViewingEntry(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={viewingEntry.dataUrl} alt="" className="w-full rounded-2xl bg-cream-deep object-contain" />
            <div className="mt-3">
              <p className="text-xs text-ink-faint">
                {new Date(viewingEntry.createdAt).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {viewingEntry.mood ? (
                <p className="mt-1 text-sm text-ink-soft">
                  <span aria-hidden>{getMoodById(viewingEntry.mood)?.emoji}</span>{' '}
                  {getMoodById(viewingEntry.mood)?.label}
                </p>
              ) : null}
              {viewingEntry.reflection ? (
                <p className="mt-2 text-sm leading-relaxed text-ink">{viewingEntry.reflection}</p>
              ) : null}
            </div>
            <Button fullWidth variant="secondary" className="mt-4" onClick={() => setViewingEntry(null)}>
              ปิด
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
