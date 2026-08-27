import { onValue, ref, serverTimestamp, set, update, onDisconnect as rtdbOnDisconnect } from 'firebase/database'
import { firebaseConfigured, getFirebaseAuth, getFirebaseDatabase } from '../../lib/firebase'
import type { MoodId } from '../../types'

export interface PresenceMember {
  publicId: string
  codename: string
  avatarId: string | null
  mood: MoodId | null
}

export interface PresenceProfile {
  publicId: string
  codename: string
  avatarId: string | null
  mood: MoodId | null
}

export interface PresenceService {
  subscribeOnlineMembers(callback: (members: PresenceMember[]) => void): () => void
  goOnline(profile: PresenceProfile): void
  updateMood(mood: MoodId | null): void
  goOffline(): void
}

interface PresenceRecord {
  codename: string
  avatarId: string | null
  mood: MoodId | null
  online: boolean
}

class FirebasePresenceService implements PresenceService {
  private currentPublicId: string | null = null

  subscribeOnlineMembers(callback: (members: PresenceMember[]) => void): () => void {
    const presenceRef = ref(getFirebaseDatabase(), 'presence')
    return onValue(
      presenceRef,
      (snap) => {
        const value = (snap.val() ?? {}) as Record<string, PresenceRecord>
        const members: PresenceMember[] = Object.entries(value)
          .filter(([, record]) => record.online)
          .map(([publicId, record]) => ({
            publicId,
            codename: record.codename,
            avatarId: record.avatarId,
            mood: record.mood,
          }))
        callback(members)
      },
      (err) => console.error('[presence] subscribeOnlineMembers failed', err),
    )
  }

  goOnline(profile: PresenceProfile): void {
    const uid = getFirebaseAuth().currentUser?.uid
    if (!uid) return
    this.currentPublicId = profile.publicId

    const db = getFirebaseDatabase()
    // Lets the Realtime Database security rules verify a client only ever writes its
    // own presence node, without needing the raw uid to appear in /presence itself.
    set(ref(db, `uidToPublicId/${uid}`), profile.publicId).catch((err) => console.error('[presence] uidToPublicId write failed', err))

    const presenceRef = ref(db, `presence/${profile.publicId}`)
    const connectedRef = ref(db, '.info/connected')

    onValue(connectedRef, (snap) => {
      if (snap.val() !== true) return
      rtdbOnDisconnect(presenceRef)
        .update({ online: false, lastChanged: serverTimestamp() })
        .catch((err) => console.error('[presence] onDisconnect setup failed', err))
      set(presenceRef, {
        codename: profile.codename,
        avatarId: profile.avatarId,
        mood: profile.mood,
        online: true,
        lastChanged: serverTimestamp(),
      }).catch((err) => console.error('[presence] presence set failed', err))
    })
  }

  updateMood(mood: MoodId | null): void {
    if (!this.currentPublicId) return
    void update(ref(getFirebaseDatabase(), `presence/${this.currentPublicId}`), {
      mood,
      lastChanged: serverTimestamp(),
    })
  }

  goOffline(): void {
    if (!this.currentPublicId) return
    void update(ref(getFirebaseDatabase(), `presence/${this.currentPublicId}`), {
      online: false,
      lastChanged: serverTimestamp(),
    })
    this.currentPublicId = null
  }
}

class NoopPresenceService implements PresenceService {
  subscribeOnlineMembers(callback: (members: PresenceMember[]) => void): () => void {
    callback([])
    return () => {}
  }
  goOnline(): void {}
  updateMood(): void {}
  goOffline(): void {}
}

// Without a configured Firebase project there are no other real accounts to be
// "online" with, so Echo Space falls back to its old static preview list instead
// (see EchoSpacePage.tsx) rather than a presence service with nothing to show.
export const presenceService: PresenceService = firebaseConfigured ? new FirebasePresenceService() : new NoopPresenceService()
