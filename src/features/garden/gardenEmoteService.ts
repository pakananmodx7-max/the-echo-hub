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

// Opt-in verbose tracing for the emote write/subscribe path — never on by default (this is
// a hot path: every subscribeEmotes callback fires on every emote change from every client).
// Set VITE_GARDEN_DEBUG_EMOTES=true (e.g. in .env.local) to enable while diagnosing a sync
// issue. Only ever logs publicId (the app's own pseudonymous multiplayer handle, already
// shown in the UI as part of presence/codenames) and emote ids/timestamps — never uid/email.
const DEBUG_EMOTES = import.meta.env.VITE_GARDEN_DEBUG_EMOTES === 'true'

class FirebaseGardenEmoteService implements GardenEmoteService {
  subscribeEmotes(callback: (states: Record<string, GardenEmoteState>) => void): () => void {
    const emotesRef = ref(getFirebaseDatabase(), 'gardenEmotes')
    return onValue(
      emotesRef,
      (snap) => {
        const states = (snap.val() ?? {}) as Record<string, GardenEmoteState>
        if (DEBUG_EMOTES) {
          for (const [publicId, state] of Object.entries(states)) {
            console.debug(`[emote subscription] received id=${publicId} emote=${state.emote} startedAt=${state.startedAt}`)
          }
        }
        callback(states)
      },
      (err) => console.error('[garden] subscribeEmotes failed', err),
    )
  }

  setEmote(myPublicId: string, emote: GardenEmoteId): void {
    const db = getFirebaseDatabase()
    const path = `gardenEmotes/${myPublicId}`
    if (DEBUG_EMOTES) console.debug(`[A emote write] path=${path} emote=${emote}`)
    // A plain (non-merge) set: the doc only ever holds these two fields, matching
    // database.rules.json's hasChildren(['emote','startedAt']) exactly.
    set(ref(db, path), { emote, startedAt: serverTimestamp() })
      .then(() => {
        if (DEBUG_EMOTES) console.debug(`[A emote write] success path=${path} emote=${emote}`)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        if (DEBUG_EMOTES) console.debug(`[A emote write] denied path=${path} emote=${emote} reason=${message}`)
        console.error('[garden] setEmote failed', { emote, message })
      })
    // Best-effort cooldown marker (mirrors gardenChatCooldown) — the rule itself is the
    // real enforcement; a failed write here just means the next rapid tap gets rejected
    // by the rule's ownership/shape check instead of the cooldown check, still safe.
    set(ref(db, `gardenEmoteCooldown/${myPublicId}`), serverTimestamp()).catch(() => {})
  }

  clearEmote(myPublicId: string): void {
    const path = `gardenEmotes/${myPublicId}`
    if (DEBUG_EMOTES) console.debug(`[A emote write] path=${path} emote=null (clear)`)
    remove(ref(getFirebaseDatabase(), path))
      .then(() => {
        if (DEBUG_EMOTES) console.debug(`[A emote write] success path=${path} emote=null (clear)`)
      })
      .catch((err) => {
        if (DEBUG_EMOTES) console.debug(`[A emote write] denied path=${path} emote=null (clear) reason=${err instanceof Error ? err.message : String(err)}`)
        console.error('[garden] clearEmote failed', err)
      })
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
