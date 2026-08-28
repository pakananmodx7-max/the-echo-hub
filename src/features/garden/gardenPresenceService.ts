import { onValue, ref, serverTimestamp, set, update, onDisconnect as rtdbOnDisconnect } from 'firebase/database'
import { firebaseConfigured, getFirebaseAuth, getFirebaseDatabase } from '../../lib/firebase'
import { GARDEN_MEMBER_SEED } from './gardenSeedData'
import type { GardenAvatarConfig, GardenMember } from './types'
import type { MoodId } from '../../types'

export interface GardenPresenceProfile {
  publicId: string
  codename: string
  avatarId: string | null
  avatarConfig: GardenAvatarConfig | null
  mood: MoodId | null
}

/** Only the fields position-sync actually touches on every move — a small, frequent write. */
export interface GardenTransform {
  x: number
  y: number
  z: number
  rotationY: number
}

/**
 * Interface-first so GardenScene/EchoGardenPage never talk to Firebase directly (see
 * `.claude`-style service boundaries used throughout the app). Owns both "am I in the
 * garden" presence AND the throttled position sync — they're the same RTDB record
 * (`gardenPresence/{publicId}`), so keeping them in one service avoids two independent
 * writers racing each other on the same node.
 */
export interface GardenPresenceService {
  subscribeMembers(callback: (members: GardenMember[]) => void): () => void
  goOnline(profile: GardenPresenceProfile, spawn: GardenTransform): void
  /** Called every frame from GardenPlayer with cheap primitives — internally throttled and change-gated, so most calls are a no-op. */
  reportLocalMove(transform: GardenTransform): void
  updateMood(mood: MoodId | null): void
  goOffline(): void
}

// Writes at most this often while actively moving (spec target: 100-250ms).
const MIN_WRITE_INTERVAL_MS = 180
// Below this, a position/rotation change is treated as noise, not real movement.
const POSITION_EPSILON = 0.03
const ROTATION_EPSILON = 0.02

interface GardenPresenceRecord {
  publicId: string
  codename: string
  avatarId: string | null
  avatarConfig?: GardenAvatarConfig
  mood: MoodId | null
  x: number
  y: number
  z: number
  rotationY: number
  state: 'online' | 'offline'
  lastChanged: number
}

function angleDelta(a: number, b: number): number {
  const diff = Math.abs(a - b) % (Math.PI * 2)
  return diff > Math.PI ? Math.PI * 2 - diff : diff
}

class FirebaseGardenPresenceService implements GardenPresenceService {
  private currentPublicId: string | null = null
  private lastSent: GardenTransform | null = null
  private lastSentAt = 0
  private connectedUnsub: (() => void) | null = null

  subscribeMembers(callback: (members: GardenMember[]) => void): () => void {
    const presenceRef = ref(getFirebaseDatabase(), 'gardenPresence')
    return onValue(
      presenceRef,
      (snap) => {
        const value = (snap.val() ?? {}) as Record<string, GardenPresenceRecord>
        const members: GardenMember[] = Object.entries(value)
          .filter(([, record]) => record.state === 'online')
          .map(([publicId, record]) => ({
            id: publicId,
            codename: record.codename,
            avatarId: record.avatarId ?? 'cloud',
            avatarConfig: record.avatarConfig,
            mood: (record.mood ?? 'okay') as MoodId,
            online: true,
            x: record.x,
            y: record.y,
            z: record.z,
            rotationY: record.rotationY,
          }))
        callback(members)
      },
      (err) => console.error('[garden] subscribeMembers failed', err),
    )
  }

  goOnline(profile: GardenPresenceProfile, spawn: GardenTransform): void {
    const uid = getFirebaseAuth().currentUser?.uid
    if (!uid) return
    this.currentPublicId = profile.publicId
    this.lastSent = { ...spawn }
    this.lastSentAt = Date.now()

    const db = getFirebaseDatabase()
    // Same indirection presence/{publicId} relies on: lets the rules verify a client only
    // ever writes its own gardenPresence node, without needing the raw uid to appear there.
    set(ref(db, `uidToPublicId/${uid}`), profile.publicId).catch((err) =>
      console.error('[garden] uidToPublicId write failed', err),
    )

    const gardenRef = ref(db, `gardenPresence/${profile.publicId}`)
    const connectedRef = ref(db, '.info/connected')

    if (this.connectedUnsub) this.connectedUnsub()
    this.connectedUnsub = onValue(connectedRef, (snap) => {
      if (snap.val() !== true) return
      // Registered BEFORE the online set() below, per the onDisconnect-before-online rule
      // — a drop mid-handshake still leaves a correct offline record, never a stale one.
      // Uses the full record shape (not a partial update): the security rules require every
      // gardenPresence write to satisfy hasChildren([...]) against the resulting node, and at
      // registration time (before the very first online set() below has ever run) a
      // fields-only update would fail that check because the rest of the record doesn't exist yet.
      rtdbOnDisconnect(gardenRef)
        .set({
          publicId: profile.publicId,
          codename: profile.codename,
          avatarId: profile.avatarId,
          avatarConfig: profile.avatarConfig,
          mood: profile.mood,
          x: spawn.x,
          y: spawn.y,
          z: spawn.z,
          rotationY: spawn.rotationY,
          state: 'offline',
          lastChanged: serverTimestamp(),
        })
        .catch((err) => console.error('[garden] onDisconnect setup failed', err))
      set(gardenRef, {
        publicId: profile.publicId,
        codename: profile.codename,
        avatarId: profile.avatarId,
        avatarConfig: profile.avatarConfig,
        mood: profile.mood,
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        rotationY: spawn.rotationY,
        state: 'online',
        lastChanged: serverTimestamp(),
      }).catch((err) => console.error('[garden] presence set failed', err))
    })
  }

  reportLocalMove(transform: GardenTransform): void {
    if (!this.currentPublicId) return
    const last = this.lastSent
    if (last) {
      const moved =
        Math.abs(transform.x - last.x) > POSITION_EPSILON ||
        Math.abs(transform.z - last.z) > POSITION_EPSILON ||
        Math.abs(transform.y - last.y) > POSITION_EPSILON ||
        angleDelta(transform.rotationY, last.rotationY) > ROTATION_EPSILON
      if (!moved) return
    }
    const now = Date.now()
    if (now - this.lastSentAt < MIN_WRITE_INTERVAL_MS) return
    this.lastSentAt = now
    this.lastSent = { ...transform }
    void update(ref(getFirebaseDatabase(), `gardenPresence/${this.currentPublicId}`), {
      x: transform.x,
      y: transform.y,
      z: transform.z,
      rotationY: transform.rotationY,
      lastChanged: serverTimestamp(),
    })
  }

  updateMood(mood: MoodId | null): void {
    if (!this.currentPublicId) return
    void update(ref(getFirebaseDatabase(), `gardenPresence/${this.currentPublicId}`), {
      mood,
      lastChanged: serverTimestamp(),
    })
  }

  goOffline(): void {
    if (this.connectedUnsub) {
      this.connectedUnsub()
      this.connectedUnsub = null
    }
    if (!this.currentPublicId) return
    void update(ref(getFirebaseDatabase(), `gardenPresence/${this.currentPublicId}`), {
      state: 'offline',
      lastChanged: serverTimestamp(),
    })
    this.currentPublicId = null
    this.lastSent = null
  }
}

class NoopGardenPresenceService implements GardenPresenceService {
  subscribeMembers(callback: (members: GardenMember[]) => void): () => void {
    callback(GARDEN_MEMBER_SEED)
    return () => {}
  }
  goOnline(): void {}
  reportLocalMove(): void {}
  updateMood(): void {}
  goOffline(): void {}
}

// Without a configured Firebase project there are no other real accounts sharing the
// garden, so it falls back to the old static demo cast instead of an empty room.
export const gardenPresenceService: GardenPresenceService = firebaseConfigured
  ? new FirebaseGardenPresenceService()
  : new NoopGardenPresenceService()
