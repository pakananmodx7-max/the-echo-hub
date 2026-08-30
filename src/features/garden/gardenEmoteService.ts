import { onValue, ref, remove, serverTimestamp, set } from 'firebase/database'
import { firebaseConfigured, getFirebaseDatabase } from '../../lib/firebase'
import type { GardenEmoteId } from '../../data/gardenEmotes'

export interface GardenEmoteState {
  emote: GardenEmoteId
  startedAt: number
}

/**
 * Garden emotes — another small sibling RTDB collection (see gardenSeatService.ts for the
 * same "why not inside gardenPresence" reasoning). Only `{emote, startedAt}` is ever
 * synced — no animation frames, exactly per spec: every client derives playback locally
 * from `now - startedAt` against GARDEN_EMOTES' own duration table.
 */
export interface GardenEmoteService {
  /** One shared subscription for the whole emote map — publicId -> current emote state. */
  subscribeEmotes(callback: (states: Record<string, GardenEmoteState>) => void): () => void
  setEmote(myPublicId: string, emote: GardenEmoteId): void
  clearEmote(myPublicId: string): void
}

class FirebaseGardenEmoteService implements GardenEmoteService {
  subscribeEmotes(callback: (states: Record<string, GardenEmoteState>) => void): () => void {
    const emotesRef = ref(getFirebaseDatabase(), 'gardenEmotes')
    return onValue(
      emotesRef,
      (snap) => callback((snap.val() ?? {}) as Record<string, GardenEmoteState>),
      (err) => console.error('[garden] subscribeEmotes failed', err),
    )
  }

  setEmote(myPublicId: string, emote: GardenEmoteId): void {
    const db = getFirebaseDatabase()
    // A plain (non-merge) set: the doc only ever holds these two fields, matching
    // database.rules.json's hasChildren(['emote','startedAt']) exactly.
    set(ref(db, `gardenEmotes/${myPublicId}`), { emote, startedAt: serverTimestamp() }).catch((err) =>
      console.error('[garden] setEmote failed', { emote, message: err instanceof Error ? err.message : String(err) }),
    )
    // Best-effort cooldown marker (mirrors gardenChatCooldown) — the rule itself is the
    // real enforcement; a failed write here just means the next rapid tap gets rejected
    // by the rule's ownership/shape check instead of the cooldown check, still safe.
    set(ref(db, `gardenEmoteCooldown/${myPublicId}`), serverTimestamp()).catch(() => {})
  }

  clearEmote(myPublicId: string): void {
    remove(ref(getFirebaseDatabase(), `gardenEmotes/${myPublicId}`)).catch((err) =>
      console.error('[garden] clearEmote failed', err),
    )
  }
}

class NoopGardenEmoteService implements GardenEmoteService {
  subscribeEmotes(callback: (states: Record<string, GardenEmoteState>) => void): () => void {
    callback({})
    return () => {}
  }
  setEmote(): void {}
  clearEmote(): void {}
}

export const gardenEmoteService: GardenEmoteService = firebaseConfigured
  ? new FirebaseGardenEmoteService()
  : new NoopGardenEmoteService()
