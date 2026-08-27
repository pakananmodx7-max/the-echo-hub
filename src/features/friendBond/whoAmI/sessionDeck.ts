import type { DifficultyFilter, MusicGuessMode, WhoAmIEntry } from './types'

export interface ResolvedCard {
  entryId: string
  answer: string
  hints: string[]
}

/** Music entries can be guessed by title or by artist — this picks which, and adjusts hints. */
export function resolveCard(entry: WhoAmIEntry, musicMode: MusicGuessMode): ResolvedCard {
  if (entry.category === 'music' && entry.metadata?.artist && musicMode === 'artist') {
    return {
      entryId: entry.id,
      answer: entry.metadata.artist,
      hints: [`ชื่อเพลงคือ "${entry.answer}"`, ...(entry.hints ?? [])],
    }
  }
  if (entry.category === 'music' && entry.metadata?.artist) {
    return {
      entryId: entry.id,
      answer: entry.answer,
      hints: [`ศิลปินคือ ${entry.metadata.artist}`, ...(entry.hints ?? [])],
    }
  }
  return { entryId: entry.id, answer: entry.answer, hints: entry.hints ?? [] }
}

export function filterByDifficulty(entries: WhoAmIEntry[], difficulty: DifficultyFilter): WhoAmIEntry[] {
  if (difficulty === 'mixed') return entries
  return entries.filter((e) => e.difficulty === difficulty)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * A session-scoped word deck: shuffled once, drawn sequentially with no repeats
 * until exhausted, then reshuffled. Shared across turns/players in one game so
 * nobody sees a word a previous player already saw, until the deck runs out.
 */
export class SessionDeck {
  private readonly pool: WhoAmIEntry[]
  private queue: WhoAmIEntry[]
  private readonly musicMode: MusicGuessMode

  constructor(pool: WhoAmIEntry[], musicMode: MusicGuessMode = 'title') {
    this.pool = pool
    this.queue = shuffle(pool)
    this.musicMode = musicMode
  }

  get poolSize() {
    return this.pool.length
  }

  get remaining() {
    return this.queue.length
  }

  next(): ResolvedCard | null {
    if (this.pool.length === 0) return null
    if (this.queue.length === 0) {
      this.queue = shuffle(this.pool)
    }
    const entry = this.queue.shift()
    if (!entry) return null
    return resolveCard(entry, this.musicMode)
  }
}
