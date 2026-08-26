import { createLocalGardenStore } from './localGardenStore'
import { GARDEN_CHAT_SEED } from './gardenSeedData'
import { GARDEN_CHAT_MAX_LENGTH } from '../../data/gardenPrompts'
import type { GardenChatMessage } from './types'

interface SendTextInput {
  authorId: string
  authorCodename: string
  authorAvatarId: string
  text: string
}

interface SendSongInput {
  authorId: string
  authorCodename: string
  authorAvatarId: string
  song: { title: string; artist: string; link?: string }
}

/**
 * Interface-first: swap for a Firestore-backed implementation later without
 * touching GardenChatPanel or GardenScene. Report/mute hooks exist now so
 * moderation can be wired to a real backend later; in mock mode they only
 * affect what this device shows.
 */
export interface GardenPublicChatService {
  listMessages(): GardenChatMessage[]
  subscribe(callback: (messages: GardenChatMessage[]) => void): () => void
  sendMessage(input: SendTextInput): GardenChatMessage
  sendSongCard(input: SendSongInput): GardenChatMessage
  reportMessage(messageId: string, reason?: string): void
}

function makeId() {
  return `gc-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

const store = createLocalGardenStore<GardenChatMessage>('publicChat', GARDEN_CHAT_SEED)
const reportedMessageIds = new Set<string>()

class MockGardenPublicChatService implements GardenPublicChatService {
  listMessages(): GardenChatMessage[] {
    return store.list()
  }

  subscribe(callback: (messages: GardenChatMessage[]) => void): () => void {
    return store.subscribe(callback)
  }

  sendMessage(input: SendTextInput): GardenChatMessage {
    const message: GardenChatMessage = {
      id: makeId(),
      authorId: input.authorId,
      authorCodename: input.authorCodename,
      authorAvatarId: input.authorAvatarId,
      kind: 'text',
      text: input.text.slice(0, GARDEN_CHAT_MAX_LENGTH),
      createdAt: new Date().toISOString(),
    }
    return store.add(message)
  }

  sendSongCard(input: SendSongInput): GardenChatMessage {
    const message: GardenChatMessage = {
      id: makeId(),
      authorId: input.authorId,
      authorCodename: input.authorCodename,
      authorAvatarId: input.authorAvatarId,
      kind: 'song',
      song: input.song,
      createdAt: new Date().toISOString(),
    }
    return store.add(message)
  }

  reportMessage(messageId: string, _reason?: string): void {
    // Mock mode: remember locally only. A real backend would create a
    // moderation-queue record instead.
    reportedMessageIds.add(messageId)
  }
}

export const gardenPublicChatService: GardenPublicChatService = new MockGardenPublicChatService()
