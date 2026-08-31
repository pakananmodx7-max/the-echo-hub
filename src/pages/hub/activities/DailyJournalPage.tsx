import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { MonthCalendar } from '../../../components/MonthCalendar'
import { JOURNAL_THEMES, type JournalThemeId } from '../../../data/journalThemes'
import { JOURNAL_STICKERS, MAX_JOURNAL_STICKERS } from '../../../data/journalStickers'
import { MOODS, getMoodById } from '../../../data/moods'
import {
  emptyJournalDraft,
  fetchJournalEntry,
  fetchMonthEntryDates,
  saveJournalEntry,
  type DailyJournalDraft,
} from '../../../features/dailyJournal/dailyJournalService'
import { MAX_JOURNAL_CONTENT_LENGTH, isMeaningfulJournalEntry } from '../../../features/dailyJournal/dailyJournalLimits'
import { awardDailyMission } from '../../../features/rewards/rewardsService'
import { recordActivity } from '../../../features/analytics/analyticsService'
import { useAuth } from '../../../hooks/useAuth'
import { getBangkokDateString } from '../../../lib/thailandDate'
import type { MoodId } from '../../../types'

type View = 'write' | 'calendar'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DEBOUNCE_MS = 1200

function formatThaiDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function DailyJournalPage() {
  const { user, completeActivity } = useAuth()
  const todayDate = getBangkokDateString()

  const [view, setView] = useState<View>('write')
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<DailyJournalDraft>(emptyJournalDraft())
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const [calYear, setCalYear] = useState(() => Number(todayDate.slice(0, 4)))
  const [calMonth, setCalMonth] = useState(() => Number(todayDate.slice(5, 7)))
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set())

  const entryExistsRef = useRef<Record<string, boolean>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load the selected date's entry (a brand new date defaults to today's mood pre-filled —
  // a convenience default only, never forced: freely changeable/clearable in the mood row
  // below — and otherwise an empty draft; existing entries load exactly as saved).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setSaveStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    fetchJournalEntry(user.id, selectedDate).then((entry) => {
      if (cancelled) return
      const loaded: DailyJournalDraft = entry
        ? { content: entry.content, mood: entry.mood, theme: entry.theme, stickers: entry.stickers }
        : { ...emptyJournalDraft(), mood: selectedDate === todayDate ? user.mood : null }
      entryExistsRef.current[selectedDate] = !!entry
      setDraft(loaded)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user?.id])

  // Which days in the visible calendar month already have an entry (for the dot indicator).
  useEffect(() => {
    if (!user || view !== 'calendar') return
    let cancelled = false
    fetchMonthEntryDates(user.id, calYear, calMonth).then((dates) => {
      if (!cancelled) setEntryDates(dates)
    })
    return () => {
      cancelled = true
    }
  }, [user, view, calYear, calMonth])

  if (!user) return null

  async function performSave(nextDraft: DailyJournalDraft, date: string) {
    if (!user) return
    setSaveStatus('saving')
    const isNewEntry = !entryExistsRef.current[date]
    const result = await saveJournalEntry(user.id, date, nextDraft, isNewEntry)
    if (!result.ok) {
      setSaveStatus('error')
      return
    }
    entryExistsRef.current[date] = true
    setSaveStatus('saved')
    setEntryDates((prev) => (prev.has(date) ? prev : new Set(prev).add(date)))

    // The FIRST meaningful save of this date, ever — awardDailyMission's create-once reward
    // ledger is what actually guarantees this (see rewardsService.ts): a short/empty draft
    // never reaches here, and any later edit that same day resolves to `false` (already
    // granted) with no duplicate points, mission credit, or analytics count.
    if (isMeaningfulJournalEntry(nextDraft.content)) {
      const granted = await awardDailyMission(user.id, 'daily_journal', date)
      if (granted) {
        void recordActivity('dailyJournalCompleted')
        void completeActivity('daily-journal')
      }
    }
  }

  function updateDraft(patch: Partial<DailyJournalDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        void performSave(next, selectedDate)
      }, AUTOSAVE_DEBOUNCE_MS)
      return next
    })
  }

  function saveNow() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void performSave(draft, selectedDate)
  }

  function toggleSticker(sticker: string) {
    const has = draft.stickers.includes(sticker)
    if (has) {
      updateDraft({ stickers: draft.stickers.filter((s) => s !== sticker) })
    } else if (draft.stickers.length < MAX_JOURNAL_STICKERS) {
      updateDraft({ stickers: [...draft.stickers, sticker] })
    }
  }

  function openDate(date: string) {
    setSelectedDate(date)
    setView('write')
  }

  const todayMood = getMoodById(user.mood ?? undefined)
  const statusText: Record<SaveStatus, string> = {
    idle: '',
    saving: 'กำลังบันทึก...',
    saved: 'บันทึกแล้ว ✓',
    error: 'ยังบันทึกไม่ได้ ข้อความของคุณยังอยู่ในหน้านี้ กรุณาลองอีกครั้ง',
  }

  return (
    <div className={`journal-scope journal-theme-${draft.theme}`} style={{ background: 'var(--journal-bg)' }}>
      <PageHeader
        title="📔 DAILY JOURNAL"
        subtitle="บันทึกชีวิตประจำวัน"
        action={
          <button
            type="button"
            onClick={() => setView(view === 'write' ? 'calendar' : 'write')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-card text-sm"
            style={{ background: 'var(--journal-card-bg)', color: 'var(--journal-text)' }}
            aria-label={view === 'write' ? 'ปฏิทินบันทึก' : 'เขียนบันทึก'}
          >
            {view === 'write' ? '🗓️' : '✍️'}
          </button>
        }
      />

      <div className="flex flex-col gap-4 px-5 pb-6">
        {view === 'calendar' ? (
          <Card style={{ background: 'var(--journal-card-bg)' }}>
            <MonthCalendar
              year={calYear}
              month={calMonth}
              todayDate={todayDate}
              selectedDate={selectedDate}
              markedDates={entryDates}
              onSelectDate={openDate}
              onChangeMonth={(y, m) => {
                setCalYear(y)
                setCalMonth(m)
              }}
              textColor="var(--journal-text)"
              textSoftColor="var(--journal-text-soft)"
              accentColor="var(--journal-accent)"
            />
          </Card>
        ) : (
          <>
            <div
              className="relative overflow-hidden rounded-[2rem] p-5 shadow-card"
              style={{ background: 'var(--journal-card-bg)', color: 'var(--journal-text)' }}
            >
              <span className="journal-paper-texture pointer-events-none absolute inset-0" aria-hidden />
              {/* Decorative "washi tape" corners — plain CSS, no image assets. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -left-3 -top-2 h-5 w-14 -rotate-12 rounded-sm opacity-70"
                style={{ background: 'var(--journal-accent)' }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-2 h-5 w-14 rotate-12 rounded-sm opacity-70"
                style={{ background: 'var(--journal-accent)' }}
              />

              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--journal-text-soft)' }}>
                    {formatThaiDate(selectedDate)}
                    {selectedDate !== todayDate ? ' (บันทึกย้อนหลัง)' : ''}
                  </p>
                  {selectedDate === todayDate && todayMood ? (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: 'var(--journal-border)', color: 'var(--journal-text)' }}
                    >
                      <span aria-hidden>{todayMood.emoji}</span> {todayMood.label}
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-1 text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  วันนี้เป็นอย่างไรบ้าง?
                </h1>

                <p
                  className="mt-3 min-h-[1.25rem] text-xs font-medium"
                  style={{ color: saveStatus === 'error' ? '#d9578e' : 'var(--journal-text-soft)' }}
                  role="status"
                >
                  {loading ? 'กำลังโหลด...' : statusText[saveStatus]}
                </p>

                <textarea
                  value={draft.content}
                  onChange={(e) => updateDraft({ content: e.target.value })}
                  disabled={loading}
                  maxLength={MAX_JOURNAL_CONTENT_LENGTH}
                  placeholder="เขียนอะไรก็ได้ที่อยู่ในใจตอนนี้..."
                  rows={12}
                  className="mt-2 w-full resize-none rounded-2xl border bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none"
                  style={{ borderColor: 'var(--journal-border)', minHeight: '38vh' }}
                />
                <p className="mt-1 text-right text-xs" style={{ color: 'var(--journal-text-soft)' }}>
                  {draft.content.length.toLocaleString('th-TH')} / {MAX_JOURNAL_CONTENT_LENGTH.toLocaleString('th-TH')}
                </p>
              </div>
            </div>

            <Card style={{ background: 'var(--journal-card-bg)', color: 'var(--journal-text)' }}>
              <p className="text-sm font-semibold">🎨 ธีมบันทึก</p>
              <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {JOURNAL_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateDraft({ theme: t.id as JournalThemeId })}
                    className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 transition"
                  >
                    <span
                      className={`h-9 w-9 rounded-full border-2 ${t.swatchClass}`}
                      style={{ borderColor: draft.theme === t.id ? 'var(--journal-accent)' : 'transparent' }}
                      aria-hidden
                    />
                    <span className="text-[11px]" style={{ color: 'var(--journal-text-soft)' }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card style={{ background: 'var(--journal-card-bg)', color: 'var(--journal-text)' }}>
              <p className="text-sm font-semibold">😊 มู้ดของวันนี้ (ไม่บังคับ)</p>
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => updateDraft({ mood: null })}
                  className="shrink-0 rounded-full border-2 px-3 py-2 text-xs font-medium transition"
                  style={{
                    borderColor: draft.mood === null ? 'var(--journal-accent)' : 'var(--journal-border)',
                    color: 'var(--journal-text-soft)',
                  }}
                >
                  ไม่ระบุ
                </button>
                {MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => updateDraft({ mood: mood.id as MoodId })}
                    className="shrink-0 rounded-full border-2 px-3 py-2 text-xs font-medium transition"
                    style={{
                      borderColor: draft.mood === mood.id ? 'var(--journal-accent)' : 'var(--journal-border)',
                      color: 'var(--journal-text)',
                    }}
                  >
                    <span aria-hidden>{mood.emoji}</span> {mood.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card style={{ background: 'var(--journal-card-bg)', color: 'var(--journal-text)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">✨ สติกเกอร์</p>
                <p className="text-xs" style={{ color: 'var(--journal-text-soft)' }}>
                  {draft.stickers.length}/{MAX_JOURNAL_STICKERS}
                </p>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {JOURNAL_STICKERS.map((sticker) => {
                  const selected = draft.stickers.includes(sticker)
                  return (
                    <button
                      key={sticker}
                      type="button"
                      onClick={() => toggleSticker(sticker)}
                      disabled={!selected && draft.stickers.length >= MAX_JOURNAL_STICKERS}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl transition disabled:opacity-30"
                      style={{
                        background: selected ? 'var(--journal-accent)' : 'var(--journal-border)',
                      }}
                    >
                      <span aria-hidden>{sticker}</span>
                    </button>
                  )
                })}
              </div>
              {draft.stickers.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.stickers.map((sticker, i) => (
                    <span
                      key={`${sticker}-${i}`}
                      className="rounded-full px-2.5 py-1 text-lg"
                      style={{ background: 'var(--journal-border)' }}
                    >
                      <span aria-hidden>{sticker}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>

            <Button fullWidth onClick={saveNow} disabled={loading}>
              บันทึก
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
