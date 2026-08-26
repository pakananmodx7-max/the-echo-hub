import { createLocalGardenStore } from './localGardenStore'
import { SONG_TREE_SEED } from './gardenSeedData'
import type { SongTreeEntry } from './types'

interface AddSongInput {
  authorId: string
  authorCodename: string
  title: string
  artist: string
  link?: string
  message: string
}

export interface SongTreeService {
  listEntries(): SongTreeEntry[]
  subscribe(callback: (entries: SongTreeEntry[]) => void): () => void
  addEntry(input: AddSongInput): SongTreeEntry
  react(entryId: string): void
}

function makeId() {
  return `st-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

const store = createLocalGardenStore<SongTreeEntry>('songTree', SONG_TREE_SEED)

class MockSongTreeService implements SongTreeService {
  listEntries(): SongTreeEntry[] {
    return store.list()
  }

  subscribe(callback: (entries: SongTreeEntry[]) => void): () => void {
    return store.subscribe(callback)
  }

  addEntry(input: AddSongInput): SongTreeEntry {
    const entry: SongTreeEntry = {
      id: makeId(),
      authorId: input.authorId,
      authorCodename: input.authorCodename,
      title: input.title,
      artist: input.artist,
      link: input.link,
      message: input.message,
      reactionCount: 0,
      createdAt: new Date().toISOString(),
    }
    return store.add(entry)
  }

  react(entryId: string): void {
    const current = store.list().find((e) => e.id === entryId)
    if (!current) return
    store.update(entryId, { reactionCount: current.reactionCount + 1 })
  }
}

export const songTreeService: SongTreeService = new MockSongTreeService()
