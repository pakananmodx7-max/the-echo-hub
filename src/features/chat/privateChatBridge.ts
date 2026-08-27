import {
  type DocumentData,
  type QueryDocumentSnapshot,
  FirestoreError,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firebaseConfigured, getFirebaseFirestore } from '../../lib/firebase'
import type { MoodId } from '../../types'

export type ChatRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'

/** Minimal shape any "ask to talk privately" call site passes in as the other person. */
export interface ChatRequestTarget {
  id: string
  codename: string
  avatarId?: string | null
  mood?: MoodId | null
}

export interface ChatParticipant {
  publicId: string
  codename: string
  avatarId: string | null
  mood: MoodId | null
}

export interface ChatRequestRecord {
  id: string
  fromPublicId: string
  toPublicId: string
  fromCodename: string
  fromAvatarId: string | null
  fromMood: MoodId | null
  toCodename: string
  toAvatarId: string | null
  toMood: MoodId | null
  status: ChatRequestStatus
  roomId: string | null
  createdAtMs: number | null
  updatedAtMs: number | null
}

export interface ChatRoomProfile {
  codename: string
  avatarId: string | null
}

export interface ChatRoomRecord {
  id: string
  participants: string[]
  profiles: Record<string, ChatRoomProfile>
  requestId: string
}

export interface ChatMessage {
  id: string
  senderPublicId: string
  text: string
  createdAtMs: number | null
}

/**
 * The single entry point for everything related to "ask to talk privately" and the
 * resulting private chat — ECHO SPACE, ECHO GARDEN's avatar interactions, and the
 * Private Bench all call `sendRequest` instead of each rolling their own logic.
 * Interface-first so a `FirebasePrivateChatBridge` can back real Firestore-backed
 * requests/rooms/messages while `NoopPrivateChatBridge` keeps the app usable before a
 * Firebase project is wired up, exactly like every other Phase 2 service.
 */
export interface PrivateChatBridge {
  sendRequest(from: ChatParticipant, to: ChatParticipant): Promise<void>
  cancelRequest(requestId: string): Promise<void>
  acceptRequest(requestId: string): Promise<string>
  declineRequest(requestId: string): Promise<void>
  subscribeIncomingRequests(publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void
  subscribeSentRequests(publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void
  subscribeRoom(roomId: string, callback: (room: ChatRoomRecord | null) => void): () => void
  subscribeRoomMessages(roomId: string, callback: (messages: ChatMessage[]) => void): () => void
  sendMessage(roomId: string, senderPublicId: string, text: string): Promise<void>
}

/** Deterministic id for the (unordered) pair of two publicIds — mirrors firestore.rules pairId(). */
function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null
}

function toRequestRecord(snap: QueryDocumentSnapshot<DocumentData>): ChatRequestRecord {
  const data = snap.data()
  return {
    id: snap.id,
    fromPublicId: data.fromPublicId,
    toPublicId: data.toPublicId,
    fromCodename: data.fromCodename,
    fromAvatarId: data.fromAvatarId ?? null,
    fromMood: data.fromMood ?? null,
    toCodename: data.toCodename,
    toAvatarId: data.toAvatarId ?? null,
    toMood: data.toMood ?? null,
    status: data.status,
    roomId: data.roomId ?? null,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  }
}

class FirebasePrivateChatBridge implements PrivateChatBridge {
  async sendRequest(from: ChatParticipant, to: ChatParticipant): Promise<void> {
    const db = getFirebaseFirestore()
    const id = pairId(from.publicId, to.publicId)
    const ref = doc(db, 'chatRequests', id)

    const payload = {
      fromPublicId: from.publicId,
      toPublicId: to.publicId,
      fromCodename: from.codename,
      fromAvatarId: from.avatarId,
      fromMood: from.mood,
      toCodename: to.codename,
      toAvatarId: to.avatarId,
      toMood: to.mood,
      status: 'pending' as const,
      roomId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // No pre-read needed: firestore.rules already routes this write to its `create` rule
    // for a brand-new pair or its `update` (re-open) rule for a finished one, and denies
    // it outright — surfaced here as a friendly message — while a request is still
    // pending or accepted. Reading first would need read access to a doc that may not
    // exist yet, which the rules correctly refuse to grant.
    try {
      await setDoc(ref, payload)
    } catch (err) {
      if (err instanceof FirestoreError && err.code === 'permission-denied') {
        throw new Error('มีคำขอที่ยังไม่ได้ตอบรับอยู่แล้ว')
      }
      throw err
    }
  }

  async cancelRequest(requestId: string): Promise<void> {
    const db = getFirebaseFirestore()
    await updateDoc(doc(db, 'chatRequests', requestId), {
      status: 'cancelled',
      roomId: null,
      updatedAt: serverTimestamp(),
    })
  }

  async acceptRequest(requestId: string): Promise<string> {
    const db = getFirebaseFirestore()
    const reqRef = doc(db, 'chatRequests', requestId)
    const snap = await getDoc(reqRef)
    if (!snap.exists()) throw new Error('ไม่พบคำขอนี้แล้ว')
    const data = snap.data()

    const roomId = requestId
    const roomRef = doc(db, 'chatRooms', roomId)
    const batch = writeBatch(db)
    batch.update(reqRef, { status: 'accepted', roomId, updatedAt: serverTimestamp() })
    batch.set(roomRef, {
      participants: [data.fromPublicId, data.toPublicId],
      profiles: {
        [data.fromPublicId]: { codename: data.fromCodename, avatarId: data.fromAvatarId ?? null },
        [data.toPublicId]: { codename: data.toCodename, avatarId: data.toAvatarId ?? null },
      },
      requestId,
      createdAt: serverTimestamp(),
    })
    await batch.commit()
    return roomId
  }

  async declineRequest(requestId: string): Promise<void> {
    const db = getFirebaseFirestore()
    await updateDoc(doc(db, 'chatRequests', requestId), {
      status: 'declined',
      roomId: null,
      updatedAt: serverTimestamp(),
    })
  }

  subscribeIncomingRequests(publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(
      collection(db, 'chatRequests'),
      where('toPublicId', '==', publicId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map(toRequestRecord)),
      (err) => console.error('[chat] subscribeIncomingRequests failed', err),
    )
  }

  subscribeSentRequests(publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(
      collection(db, 'chatRequests'),
      where('fromPublicId', '==', publicId),
      orderBy('updatedAt', 'desc'),
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map(toRequestRecord)),
      (err) => console.error('[chat] subscribeSentRequests failed', err),
    )
  }

  subscribeRoom(roomId: string, callback: (room: ChatRoomRecord | null) => void): () => void {
    const db = getFirebaseFirestore()
    return onSnapshot(
      doc(db, 'chatRooms', roomId),
      (snap) => {
        if (!snap.exists()) {
          callback(null)
          return
        }
        const data = snap.data()
        callback({
          id: snap.id,
          participants: data.participants ?? [],
          profiles: data.profiles ?? {},
          requestId: data.requestId,
        })
      },
      (err) => console.error('[chat] subscribeRoom failed', err),
    )
  }

  subscribeRoomMessages(roomId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(collection(db, 'chatRooms', roomId, 'messages'), orderBy('createdAt', 'asc'))
    return onSnapshot(
      q,
      (snap) =>
        callback(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              senderPublicId: data.senderPublicId,
              text: data.text,
              createdAtMs: toMillis(data.createdAt),
            }
          }),
        ),
      (err) => console.error('[chat] subscribeRoomMessages failed', err),
    )
  }

  async sendMessage(roomId: string, senderPublicId: string, text: string): Promise<void> {
    const db = getFirebaseFirestore()
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      senderPublicId,
      text,
      createdAt: serverTimestamp(),
    })
  }
}

class NoopPrivateChatBridge implements PrivateChatBridge {
  async sendRequest(): Promise<void> {}
  async cancelRequest(): Promise<void> {}
  async acceptRequest(): Promise<string> {
    return ''
  }
  async declineRequest(): Promise<void> {}
  subscribeIncomingRequests(_publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void {
    callback([])
    return () => {}
  }
  subscribeSentRequests(_publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void {
    callback([])
    return () => {}
  }
  subscribeRoom(_roomId: string, callback: (room: ChatRoomRecord | null) => void): () => void {
    callback(null)
    return () => {}
  }
  subscribeRoomMessages(_roomId: string, callback: (messages: ChatMessage[]) => void): () => void {
    callback([])
    return () => {}
  }
  async sendMessage(): Promise<void> {}
}

// Without a configured Firebase project there is no other real device to accept a
// request or receive a message, so every operation here is inert — see
// EchoSpacePage.tsx / EchoGardenPage.tsx which already tolerate an always-empty state.
export const privateChatBridge: PrivateChatBridge = firebaseConfigured
  ? new FirebasePrivateChatBridge()
  : new NoopPrivateChatBridge()
