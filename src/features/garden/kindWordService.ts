import { createLocalGardenStore } from './localGardenStore'
import { KIND_WORD_SEED } from './gardenSeedData'
import { KIND_WORD_MAX_LENGTH } from '../../data/gardenPrompts'
import type { KindWordEntry } from './types'

interface AddKindWordInput {
  authorId: string
  authorCodename: string
  text: string
}

export interface KindWordService {
  listEntries(): KindWordEntry[]
  subscribe(callback: (entries: KindWordEntry[]) => void): () => void
  addEntry(input: AddKindWordInput): KindWordEntry
}

function makeId() {
  return `kw-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

const store = createLocalGardenStore<KindWordEntry>('kindWords', KIND_WORD_SEED)

class MockKindWordService implements KindWordService {
  listEntries(): KindWordEntry[] {
    return store.list()
  }

  subscribe(callback: (entries: KindWordEntry[]) => void): () => void {
    return store.subscribe(callback)
  }

  addEntry(input: AddKindWordInput): KindWordEntry {
    const entry: KindWordEntry = {
      id: makeId(),
      authorId: input.authorId,
      authorCodename: input.authorCodename,
      text: input.text.slice(0, KIND_WORD_MAX_LENGTH),
      createdAt: new Date().toISOString(),
    }
    return store.add(entry)
  }
}

export const kindWordService: KindWordService = new MockKindWordService()
