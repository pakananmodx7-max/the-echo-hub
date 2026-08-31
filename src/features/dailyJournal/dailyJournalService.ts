import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore'
import { firebaseConfigured, getFirebaseFirestore } from '../../lib/firebase'
import { DEFAULT_JOURNAL_THEME, type JournalThemeId } from '../../data/journalThemes'
import type { MoodId } from '../../types'

/**
 * Private per-account, per-Bangkok-calendar-day journal entry: users/{uid}/dailyJournal/{date}.
 * Only the owning account can ever read or write it — see firestore.rules. Never keyed by
 * publicId (private ownership, not the presence/social identity used elsewhere in the app).
 */
export interface DailyJournalEntry {
  date: string
  content: string
  mood: MoodId | null
  theme: JournalThemeId
  stickers: string[]
  createdAt: number | null
  updatedAt: number | null
}

export interface DailyJournalDraft {
  content: string
  mood: MoodId | null
  theme: JournalThemeId
  stickers: string[]
}

export function emptyJournalDraft(): DailyJournalDraft {
  return { content: '', mood: null, theme: DEFAULT_JOURNAL_THEME, stickers: [] }
}

function toMillis(value: unknown): number | null {
  const ts = value as Timestamp | undefined
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null
}

function toEntry(date: string, data: DocumentData | undefined): DailyJournalEntry | null {
  if (!data) return null
  return {
    date,
    content: typeof data.content === 'string' ? data.content : '',
    mood: typeof data.mood === 'string' ? (data.mood as MoodId) : null,
    theme: typeof data.theme === 'string' ? (data.theme as JournalThemeId) : DEFAULT_JOURNAL_THEME,
    stickers: Array.isArray(data.stickers) ? (data.stickers as string[]) : [],
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}

function entryRef(uid: string, date: string) {
  return doc(getFirebaseFirestore(), 'users', uid, 'dailyJournal', date)
}

/** One-shot load — used when a page first opens a given date. */
export async function fetchJournalEntry(uid: string, date: string): Promise<DailyJournalEntry | null> {
  if (!firebaseConfigured) return null
  const snap = await getDoc(entryRef(uid, date))
  return toEntry(date, snap.data())
}

/** Realtime feed for the currently-open date — picks up a save from another tab/device. */
export function subscribeJournalEntry(
  uid: string,
  date: string,
  callback: (entry: DailyJournalEntry | null) => void,
): () => void {
  if (!firebaseConfigured) {
    callback(null)
    return () => {}
  }
  return onSnapshot(
    entryRef(uid, date),
    (snap) => callback(toEntry(date, snap.data())),
    (err) => console.error('[dailyJournal] subscribeJournalEntry failed', err),
  )
}

export interface SaveJournalEntryResult {
  ok: boolean
}

/**
 * Upserts today's (or any owned date's) journal entry. `isNewEntry` must be true only when
 * the caller knows no document exists yet for this date (from its initial load) — this is
 * what lets `createdAt` be set once, on first save, and never touched again by a later edit,
 * without an extra read-before-write on every autosave tick. `merge: true` means every
 * field not included here is left alone, but every field IS included on every save, so this
 * always fully overwrites content/mood/theme/stickers/updatedAt as a single atomic write —
 * "editing the same day never creates a duplicate document" (the doc id IS the date).
 */
export async function saveJournalEntry(
  uid: string,
  date: string,
  draft: DailyJournalDraft,
  isNewEntry: boolean,
): Promise<SaveJournalEntryResult> {
  if (!firebaseConfigured) return { ok: false }
  try {
    const patch: DocumentData = {
      date,
      content: draft.content,
      mood: draft.mood,
      theme: draft.theme,
      stickers: draft.stickers,
      updatedAt: serverTimestamp(),
    }
    if (isNewEntry) patch.createdAt = serverTimestamp()
    await setDoc(entryRef(uid, date), patch, { merge: true })
    return { ok: true }
  } catch (err) {
    console.error('[dailyJournal] saveJournalEntry failed', { date, message: err instanceof Error ? err.message : String(err) })
    return { ok: false }
  }
}

/** Last day-of-month for a given Gregorian year/month (1-12). */
function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

/**
 * Which dates in a given Gregorian year/month already have a journal entry — powers the
 * calendar/history view's dot indicators. A single inequality range on the `date` field
 * (which is also the document id) needs only Firestore's default single-field index, so no
 * firestore.indexes.json entry is required for this.
 */
export async function fetchMonthEntryDates(uid: string, year: number, month1to12: number): Promise<Set<string>> {
  if (!firebaseConfigured) return new Set()
  const mm = String(month1to12).padStart(2, '0')
  const start = `${year}-${mm}-01`
  const end = `${year}-${mm}-${String(daysInMonth(year, month1to12)).padStart(2, '0')}`
  try {
    const q = query(
      collection(getFirebaseFirestore(), 'users', uid, 'dailyJournal'),
      where('date', '>=', start),
      where('date', '<=', end),
    )
    const snap = await getDocs(q)
    return new Set(snap.docs.map((d) => d.id))
  } catch (err) {
    console.error('[dailyJournal] fetchMonthEntryDates failed', err)
    return new Set()
  }
}
