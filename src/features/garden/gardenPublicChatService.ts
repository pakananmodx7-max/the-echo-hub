import { limitToLast, onValue, orderByChild, push, query, ref, serverTimestamp, set } from 'firebase/database'
import { firebaseConfigured, getFirebaseAuth, getFirebaseDatabase } from '../../lib/firebase'
import { GARDEN_CHAT_MAX_LENGTH } from '../../data/gardenPrompts'
import { GARDEN_CHAT_SEED } from './gardenSeedData'
import type { GardenChatMessage } from './types'

interface SendTextInput {
  authorPublicId: string
  authorCodename: string
  authorAvatarId: string
  text: string
}

/**
 * Interface-first, same pattern as every other Phase 2/3 service. Everyone currently in
 * the garden shares one `gardenChat/messages` Realtime Database node — no per-device mock
 * store, no mute/report backend yet (report is recorded locally only, same as before;
 * moderation hooks are ready to wire to a real queue later).
 */
export interface GardenPublicChatService {
  subscribe(callback: (messages: GardenChatMessage[]) => void): () => void
  sendMessage(input: SendTextInput): Promise<void>
  reportMessage(messageId: string, reason?: string): void
}

const MESSAGE_LIMIT = 50

function toGardenChatMessage(id: string, data: Record<string, unknown>): GardenChatMessage {
  return {
    id,
    authorId: data.authorPublicId as string,
    authorCodename: data.authorCodename as string,
    authorAvatarId: data.authorAvatarId as string,
    kind: data.kind as 'text' | 'song',
    text: data.text as string | undefined,
    song: data.song as GardenChatMessage['song'],
    createdAt: typeof data.createdAt === 'number' ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
  }
}

class FirebaseGardenPublicChatService implements GardenPublicChatService {
  subscribe(callback: (messages: GardenChatMessage[]) => void): () => void {
    const db = getFirebaseDatabase()
    const messagesQuery = query(ref(db, 'gardenChat/messages'), orderByChild('createdAt'), limitToLast(MESSAGE_LIMIT))
    return onValue(
      messagesQuery,
      (snap) => {
        const list: GardenChatMessage[] = []
        snap.forEach((child) => {
          list.push(toGardenChatMessage(child.key as string, child.val()))
          return false
        })
        callback(list)
      },
      (err) => console.error('[garden] chat subscribe failed', err),
    )
  }

  async sendMessage(input: SendTextInput): Promise<void> {
    const text = input.text.trim().slice(0, GARDEN_CHAT_MAX_LENGTH)
    if (!text) return
    const uid = getFirebaseAuth().currentUser?.uid
    if (!uid) return
    const db = getFirebaseDatabase()
    const newRef = push(ref(db, 'gardenChat/messages'))
    await set(newRef, {
      authorPublicId: input.authorPublicId,
      authorCodename: input.authorCodename,
      authorAvatarId: input.authorAvatarId,
      kind: 'text' as const,
      text,
      createdAt: serverTimestamp(),
    })
    // Best-effort cooldown marker backing the rules-level rate limit — a failure here just
    // means the next send briefly skips the server-side check; GardenChatPanel's own
    // client-side cooldown (GARDEN_CHAT_MIN_INTERVAL_MS) still applies regardless.
    void set(ref(db, `gardenChatCooldown/${input.authorPublicId}`), serverTimestamp()).catch((err) =>
      console.error('[garden] chat cooldown write failed', err),
    )
  }

  reportMessage(messageId: string, _reason?: string): void {
    // No moderation backend yet — matches the mock service's prior local-only behavior.
    console.info('[garden] message reported (not yet backed by a moderation queue)', messageId)
  }
}

class NoopGardenPublicChatService implements GardenPublicChatService {
  subscribe(callback: (messages: GardenChatMessage[]) => void): () => void {
    callback(GARDEN_CHAT_SEED)
    return () => {}
  }
  async sendMessage(): Promise<void> {}
  reportMessage(): void {}
}

export const gardenPublicChatService: GardenPublicChatService = firebaseConfigured
  ? new FirebaseGardenPublicChatService()
  : new NoopGardenPublicChatService()
