import {
  type DocumentData,
  type QueryDocumentSnapshot,
  FirestoreError,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firebaseConfigured, getFirebaseAuth, getFirebaseFirestore } from '../../lib/firebase'
import type { MoodId } from '../../types'

export type ChatRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
export type ChatRoomStatus = 'active' | 'ended'

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
  status: ChatRoomStatus
  endedAtMs: number | null
  endedBy: string | null
}

export interface ChatMessage {
  id: string
  senderPublicId: string
  text: string
  createdAtMs: number | null
}

export type NotificationType =
  | 'incoming_chat_request'
  | 'chat_request_accepted'
  | 'chat_request_declined'
  | 'new_message'

export interface ChatNotification {
  id: string
  type: NotificationType
  ownerPublicId: string
  fromPublicId: string
  fromCodename: string
  fromAvatarId: string | null
  requestId: string | null
  roomId: string | null
  preview: string | null
  read: boolean
  createdAtMs: number | null
}

/**
 * The single entry point for everything related to "ask to talk privately", the
 * resulting private chat and its lifecycle, and the Notification Center — ECHO SPACE,
 * ECHO GARDEN's avatar interactions, and the Private Bench all call `sendRequest` instead
 * of each rolling their own logic. Interface-first so a `FirebasePrivateChatBridge` can
 * back real Firestore-backed requests/rooms/messages/notifications while
 * `NoopPrivateChatBridge` keeps the app usable before a Firebase project is wired up,
 * exactly like every other Phase 2 service.
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
  /** Ends an active room: the other side sees it end in realtime, and the pair is freed to request each other again later — see firestore.rules for exactly what this batch does. */
  endConversation(roomId: string, endedByPublicId: string): Promise<void>
  /** Rooms the given account is currently an active (not-yet-ended) participant of — powers the "you still have an unfinished conversation" reminder. */
  subscribeActiveRooms(publicId: string, callback: (rooms: ChatRoomRecord[]) => void): () => void
  subscribeNotifications(publicId: string, callback: (notifications: ChatNotification[]) => void): () => void
  markNotificationRead(notificationId: string): Promise<void>
  markAllNotificationsRead(notificationIds: string[]): Promise<void>
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

function toRoomRecord(snap: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): ChatRoomRecord {
  const data = snap.data()
  return {
    id: snap.id,
    participants: data.participants ?? [],
    profiles: data.profiles ?? {},
    requestId: data.requestId,
    status: data.status ?? 'active',
    endedAtMs: toMillis(data.endedAt),
    endedBy: data.endedBy ?? null,
  }
}

function toNotificationRecord(snap: QueryDocumentSnapshot<DocumentData>): ChatNotification {
  const data = snap.data()
  return {
    id: snap.id,
    type: data.type,
    ownerPublicId: data.ownerPublicId,
    fromPublicId: data.fromPublicId,
    fromCodename: data.fromCodename,
    fromAvatarId: data.fromAvatarId ?? null,
    requestId: data.requestId ?? null,
    roomId: data.roomId ?? null,
    preview: data.preview ?? null,
    read: !!data.read,
    createdAtMs: toMillis(data.createdAt),
  }
}

/**
 * Finds the receiver's own still-unread `incoming_chat_request` notification(s) for this
 * request, so accepting/declining it (from the popup OR the Notification Center) clears
 * the matching bell entry too instead of leaving a stale actionable-looking card behind.
 * Filters client-side on a single-equality query so it needs no extra composite index.
 */
async function findUnreadNotificationIds(
  db: ReturnType<typeof getFirebaseFirestore>,
  ownerPublicId: string,
  matches: (data: DocumentData) => boolean,
): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'notifications'), where('ownerPublicId', '==', ownerPublicId)))
  return snap.docs.filter((d) => d.data().read === false && matches(d.data())).map((d) => d.id)
}

class FirebasePrivateChatBridge implements PrivateChatBridge {
  async sendRequest(from: ChatParticipant, to: ChatParticipant): Promise<void> {
    const db = getFirebaseFirestore()

    // Prerequisite check, before ever touching chatRequests: the create rule requires
    // `fromPublicId` to equal `myPublicId()` (read fresh from users/{uid}.publicId on the
    // server). Log which piece is missing — publicId is the intentionally-shareable id,
    // never uid/email — so a real gap is visible in the console instead of surfacing only
    // as an opaque "Missing or insufficient permissions." from Firestore.
    if (!from.publicId || !to.publicId) {
      console.error('[chat] sendRequest blocked before write: incomplete participant data', {
        hasFromPublicId: !!from.publicId,
        hasToPublicId: !!to.publicId,
      })
      throw new Error('ส่งคำขอคุยไม่สำเร็จ ลองใหม่อีกครั้ง')
    }

    // Confirms the id we were handed as "the other person" actually resolves to a real,
    // currently-published account before ever writing a chatRequests doc. Every onboarded
    // account keeps publicProfiles/{publicId} in sync (see syncPublicProfile in
    // firebaseAuthService.ts), so a miss here means whatever called sendRequest resolved
    // the wrong identifier for its target (e.g. something other than that person's real
    // publicId) — never the publicId/uid itself, just whether it resolved.
    const targetProfileSnap = await getDoc(doc(db, 'publicProfiles', to.publicId))
    if (!targetProfileSnap.exists()) {
      console.error('[chat] sendRequest blocked: target identity did not resolve to a published profile', {
        targetProfileFound: false,
      })
      throw new Error('ส่งคำขอคุยไม่สำเร็จ ลองใหม่อีกครั้ง')
    }

    // Self-diagnosing: confirm the publicId we're about to send as `fromPublicId` still
    // matches what's canonically stored on our own account right now. This is the one
    // prerequisite mismatch that would make the rules' `fromPublicId == myPublicId()`
    // check fail even though the write looks correct client-side (e.g. a stale cached
    // profile after switching accounts) — and this read is always self-permitted, so it
    // can never itself throw permission-denied the way the chatRequests write can.
    const authUid = getFirebaseAuth().currentUser?.uid
    if (authUid) {
      const ownSnap = await getDoc(doc(db, 'users', authUid))
      const canonicalPublicId = ownSnap.exists() ? (ownSnap.data().publicId as string | undefined) : undefined
      if (canonicalPublicId !== from.publicId) {
        console.error('[chat] sendRequest blocked: own publicId is stale vs. users/{uid}', {
          ownUserDocExists: ownSnap.exists(),
          ownUserDocHasPublicId: !!canonicalPublicId,
          publicIdsMatch: canonicalPublicId === from.publicId,
        })
        throw new Error('โปรไฟล์ไม่ตรงกัน กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่')
      }
    }

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

    // No pre-read needed for the happy path: firestore.rules already routes this write to
    // its `create` rule for a brand-new pair or its `update` (re-open) rule for a finished
    // one. On denial we do one follow-up read (see below) purely to log which case this
    // was — it can never widen what the rules themselves allow.
    try {
      await setDoc(ref, payload)
    } catch (err) {
      const code = err instanceof FirestoreError ? err.code : 'unknown'
      console.error('[chat] sendRequest write denied', {
        category: code === 'permission-denied' ? 'permission_denied' : 'unknown_write_error',
        code,
        message: err instanceof Error ? err.message : String(err),
        requestId: id,
      })

      if (code === 'permission-denied') {
        try {
          const existing = await getDoc(ref)
          const existingStatus = existing.exists() ? (existing.data().status as string | undefined) : null
          if (existingStatus === 'pending' || existingStatus === 'accepted') {
            console.error('[chat] sendRequest denied: duplicate pending request already exists for this pair', {
              category: 'duplicate_pending_request',
              existingStatus,
            })
            throw new Error('มีคำขอที่ยังไม่ได้ตอบรับอยู่แล้ว')
          }
          // Ruled out "a live request already exists" — the follow-up read itself succeeded
          // (so read access and the prerequisite profile fields are fine), meaning the
          // create was denied for some other reason — most likely the live Firestore rules
          // don't yet match firestore.rules in this repo. Surfaced here, not in the UI.
          console.error('[chat] sendRequest denied for a reason other than an existing pending/accepted request', {
            category: 'permission_denied_other',
            existingDocExists: existing.exists(),
            existingStatus,
          })
        } catch (readErr) {
          if (readErr instanceof Error && readErr.message === 'มีคำขอที่ยังไม่ได้ตอบรับอยู่แล้ว') throw readErr
          console.error('[chat] sendRequest follow-up read also failed', { category: 'followup_read_failed', readErr })
        }
        throw new Error('ส่งคำขอคุยไม่สำเร็จ ลองใหม่อีกครั้ง')
      }
      throw err
    }

    // Best-effort, separate write: the notifications create rule needs to read the
    // chatRequests doc above via get() to confirm it's legitimate, which only sees state
    // committed BEFORE this call started — so it can't be batched with the create above
    // for a brand-new pair. A failure here must never fail sendRequest itself; the
    // realtime popup (driven directly off chatRequests) is the primary, already-proven
    // notification path — this is purely an additional convenience.
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'incoming_chat_request' satisfies NotificationType,
        ownerPublicId: to.publicId,
        fromPublicId: from.publicId,
        fromCodename: from.codename,
        fromAvatarId: from.avatarId,
        requestId: id,
        roomId: null,
        preview: null,
        read: false,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('[chat] incoming_chat_request notification write failed', err)
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

    // A fresh, unique id per conversation session — NOT the deterministic pairId — so
    // ending this room later can never block the same two people from starting a brand
    // new session (a second room at the same id would be an update, not a create, and
    // chatRooms' update rule only ever allows active -> ended, never a revived room).
    const roomId = doc(collection(db, 'chatRooms')).id
    const roomRef = doc(db, 'chatRooms', roomId)
    const notificationRef = doc(collection(db, 'notifications'))
    const staleIds = await findUnreadNotificationIds(
      db,
      data.toPublicId,
      (n) => n.type === 'incoming_chat_request' && n.requestId === requestId,
    )
    const batch = writeBatch(db)
    batch.update(reqRef, { status: 'accepted', roomId, updatedAt: serverTimestamp() })
    for (const id of staleIds) batch.update(doc(db, 'notifications', id), { read: true })
    batch.set(roomRef, {
      participants: [data.fromPublicId, data.toPublicId],
      profiles: {
        [data.fromPublicId]: { codename: data.fromCodename, avatarId: data.fromAvatarId ?? null },
        [data.toPublicId]: { codename: data.toCodename, avatarId: data.toAvatarId ?? null },
      },
      requestId,
      status: 'active' as const,
      endedAt: null,
      endedBy: null,
      createdAt: serverTimestamp(),
    })
    // Notifies the original sender that their request was accepted — created here, in
    // the same atomic batch as the accept + room creation, so it can never exist without
    // a real accepted request/room behind it.
    batch.set(notificationRef, {
      type: 'chat_request_accepted' satisfies NotificationType,
      ownerPublicId: data.fromPublicId,
      fromPublicId: data.toPublicId,
      fromCodename: data.toCodename,
      fromAvatarId: data.toAvatarId ?? null,
      requestId,
      roomId,
      preview: null,
      read: false,
      createdAt: serverTimestamp(),
    })
    await batch.commit()
    return roomId
  }

  async declineRequest(requestId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const reqRef = doc(db, 'chatRequests', requestId)
    const snap = await getDoc(reqRef)
    if (!snap.exists()) throw new Error('ไม่พบคำขอนี้แล้ว')
    const data = snap.data()

    const notificationRef = doc(collection(db, 'notifications'))
    const staleIds = await findUnreadNotificationIds(
      db,
      data.toPublicId,
      (n) => n.type === 'incoming_chat_request' && n.requestId === requestId,
    )
    const batch = writeBatch(db)
    batch.update(reqRef, { status: 'declined', roomId: null, updatedAt: serverTimestamp() })
    for (const id of staleIds) batch.update(doc(db, 'notifications', id), { read: true })
    batch.set(notificationRef, {
      type: 'chat_request_declined' satisfies NotificationType,
      ownerPublicId: data.fromPublicId,
      fromPublicId: data.toPublicId,
      fromCodename: data.toCodename,
      fromAvatarId: data.toAvatarId ?? null,
      requestId,
      roomId: null,
      preview: null,
      read: false,
      createdAt: serverTimestamp(),
    })
    await batch.commit()
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
        callback(toRoomRecord(snap))
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

    // Best-effort, separate write (same reasoning as the incoming_chat_request notification
    // in sendRequest): notifies the other participant so they see a toast/bell entry even
    // while elsewhere in the app. Never fails the message send itself.
    try {
      const roomSnap = await getDoc(doc(db, 'chatRooms', roomId))
      if (!roomSnap.exists()) return
      const room = roomSnap.data()
      const otherPublicId = (room.participants as string[]).find((p) => p !== senderPublicId)
      if (!otherPublicId) return
      const senderProfile = room.profiles?.[senderPublicId]
      await addDoc(collection(db, 'notifications'), {
        type: 'new_message' satisfies NotificationType,
        ownerPublicId: otherPublicId,
        fromPublicId: senderPublicId,
        fromCodename: senderProfile?.codename ?? '',
        fromAvatarId: senderProfile?.avatarId ?? null,
        requestId: null,
        roomId,
        preview: text.length > 80 ? `${text.slice(0, 80)}…` : text,
        read: false,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('[chat] new_message notification write failed', err)
    }
  }

  async endConversation(roomId: string, endedByPublicId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const roomRef = doc(db, 'chatRooms', roomId)

    let roomSnap
    try {
      roomSnap = await getDoc(roomRef)
    } catch (err) {
      const code = err instanceof FirestoreError ? err.code : 'unknown'
      if (code === 'permission-denied') {
        console.error('[endConversation] permission_denied', { roomId, phase: 'read' })
      } else {
        console.error('[endConversation] unexpected_error', {
          roomId,
          phase: 'read',
          code,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      throw new Error('จบการสนทนาไม่สำเร็จ กรุณาลองอีกครั้ง')
    }

    if (!roomSnap.exists()) {
      console.error('[endConversation] room_not_found', { roomId })
      throw new Error('ไม่พบห้องสนทนานี้แล้ว')
    }

    const room = roomSnap.data()
    if (room.status !== 'active') {
      // Already ended — most commonly because the other participant ended it a moment
      // earlier, or this is a stale retry of a click that already succeeded. The desired
      // end state already holds and the realtime room listener already reflects it, so
      // this is a benign no-op, not a failure — never surfaced to the user as an error.
      console.log('[endConversation] invalid_room_state', { roomId, status: room.status })
      return
    }
    if (typeof room.requestId !== 'string' || !room.requestId) {
      console.error('[endConversation] invalid_room_state', { roomId, hasRequestId: false })
      throw new Error('จบการสนทนาไม่สำเร็จ กรุณาลองอีกครั้ง')
    }

    const batch = writeBatch(db)
    batch.update(roomRef, { status: 'ended', endedAt: serverTimestamp(), endedBy: endedByPublicId })
    // Freeing the underlying request lets this pair send/receive a brand new request later
    // (see the reopen-from-terminal-states rule in firestore.rules) — the room itself, and
    // its message history, is left in place rather than deleted or reused. roomId is
    // deliberately left untouched (the rule requires it stay equal to its current value).
    batch.update(doc(db, 'chatRequests', room.requestId), {
      status: 'expired',
      updatedAt: serverTimestamp(),
    })

    console.log('[endConversation] write_started', { roomId })
    try {
      await batch.commit()
    } catch (err) {
      const code = err instanceof FirestoreError ? err.code : 'unknown'
      if (code === 'permission-denied') {
        console.error('[endConversation] permission_denied', { roomId, phase: 'write' })
      } else {
        console.error('[endConversation] unexpected_error', {
          roomId,
          phase: 'write',
          code,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      throw new Error('จบการสนทนาไม่สำเร็จ กรุณาลองอีกครั้ง')
    }
    console.log('[endConversation] success', { roomId })
  }

  subscribeActiveRooms(publicId: string, callback: (rooms: ChatRoomRecord[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', publicId),
      where('status', '==', 'active'),
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => toRoomRecord(d))),
      (err) => console.error('[chat] subscribeActiveRooms failed', err),
    )
  }

  subscribeNotifications(publicId: string, callback: (notifications: ChatNotification[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(
      collection(db, 'notifications'),
      where('ownerPublicId', '==', publicId),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map(toNotificationRecord)),
      (err) => console.error('[chat] subscribeNotifications failed', err),
    )
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const db = getFirebaseFirestore()
    await updateDoc(doc(db, 'notifications', notificationId), { read: true })
  }

  async markAllNotificationsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return
    const db = getFirebaseFirestore()
    const batch = writeBatch(db)
    for (const id of notificationIds) {
      batch.update(doc(db, 'notifications', id), { read: true })
    }
    await batch.commit()
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
  async endConversation(): Promise<void> {}
  subscribeActiveRooms(_publicId: string, callback: (rooms: ChatRoomRecord[]) => void): () => void {
    callback([])
    return () => {}
  }
  subscribeNotifications(_publicId: string, callback: (notifications: ChatNotification[]) => void): () => void {
    callback([])
    return () => {}
  }
  async markNotificationRead(): Promise<void> {}
  async markAllNotificationsRead(): Promise<void> {}
}

// Without a configured Firebase project there is no other real device to accept a
// request or receive a message, so every operation here is inert — see
// EchoSpacePage.tsx / EchoGardenPage.tsx which already tolerate an always-empty state.
export const privateChatBridge: PrivateChatBridge = firebaseConfigured
  ? new FirebasePrivateChatBridge()
  : new NoopPrivateChatBridge()
