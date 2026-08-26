import type { JournalEntry, MoodId } from '../../types'

/**
 * Interface-first design: swap `LocalJournalService` for a
 * `FirebaseJournalService` implementation later without touching any
 * consuming component (EchoJournalPage, DRAW & LISTEN's save step, ...).
 */
export interface JournalService {
  listEntries(userId: string): JournalEntry[]
  addEntry(
    userId: string,
    entry: { dataUrl: string; mood: MoodId | null; reflection: string; source: JournalEntry['source'] },
  ): JournalEntry
}

function storageKey(userId: string) {
  return `echoHub.demo.journal.${userId}`
}

function makeId() {
  return `journal-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

class LocalJournalService implements JournalService {
  listEntries(userId: string): JournalEntry[] {
    try {
      const raw = localStorage.getItem(storageKey(userId))
      const entries = raw ? (JSON.parse(raw) as JournalEntry[]) : []
      return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    } catch {
      return []
    }
  }

  addEntry(
    userId: string,
    entry: { dataUrl: string; mood: MoodId | null; reflection: string; source: JournalEntry['source'] },
  ): JournalEntry {
    const newEntry: JournalEntry = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      ...entry,
    }
    const entries = this.listEntries(userId)
    entries.unshift(newEntry)
    localStorage.setItem(storageKey(userId), JSON.stringify(entries))
    return newEntry
  }
}

export const journalService: JournalService = new LocalJournalService()
