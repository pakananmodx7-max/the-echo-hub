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
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firebaseConfigured, getFirebaseAuth, getFirebaseFirestore } from '../../lib/firebase'
import { getStickerById } from '../../data/stickers'
import { getBangkokDateString } from '../../lib/thailandDate'
import type { MoodId } from '../../types'
import { CHAT_REQUEST_ERRORS, getEffectiveRequestStatus } from './chatRequestState'
import { isPublicProfileKnownToExist, markPublicProfileExists } from './publicProfileCache'

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
  respondedAtMs: number | null
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
  /** kind is implicit 'text' for every message written before stickers existed, and for
   * every ordinary text message since — only sticker messages set it explicitly. */
  kind: 'text' | 'sticker'
  text?: string
  /** Set only when kind === 'sticker' — an id from the fixed ECHO_STICKERS catalog (see
   * src/data/stickers.ts), never arbitrary content. */
  stickerId?: string
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
  /** Every request where this account is the receiver, in ANY status — unlike subscribeIncomingRequests (pending only), this resolves the Notification Center's real, current state for a request instead of trusting a possibly-stale notification snapshot. */
  subscribeReceivedRequests(publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void
  subscribeRoom(roomId: string, callback: (room: ChatRoomRecord | null) => void): () => void
  subscribeRoomMessages(roomId: string, callback: (messages: ChatMessage[]) => void): () => void
  sendMessage(roomId: string, senderPublicId: string, text: string): Promise<void>
  /** Sends a sticker message — stickerId must be one from the fixed ECHO_STICKERS catalog. */
  sendSticker(roomId: string, senderPublicId: string, stickerId: string): Promise<void>
  /** Ends an active room: the other side sees it end in realtime, and the pair is freed to request each other again later — see firestore.rules for exactly what this batch does. */
  endConversation(roomId: string, endedByPublicId: string): Promise<void>
  /** Rooms the given account is currently an active (not-yet-ended) participant of — powers the "you still have an unfinished conversation" reminder. */
  subscribeActiveRooms(publicId: string, callback: (rooms: ChatRoomRecord[]) => void): () => void
  subscribeNotifications(publicId: string, callback: (notifications: ChatNotification[]) => void): () => void
  markNotificationRead(notificationId: string): Promise<void>
  markAllNotificationsRead(notificationIds: string[]): Promise<void>
  /** Deletes one or more notifications (pass a single-id array for one card) —
   * Notification Center housekeeping only. Never touches the underlying chatRequests/
   * chatRooms doc, so an incoming request stays fully answerable from the Chat Requests
   * page even after its notification card is gone. */
  deleteNotifications(notificationIds: string[]): Promise<void>
}

/** Deterministic id for the (unordered) pair of two publicIds — mirrors firestore.rules pairId(). */
function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null
}

/** Thrown by acceptRequest/declineRequest/cancelRequest when the request is no longer pending by the time the write is attempted (already accepted/declined/cancelled/expired by a race, or a stale click on an old popup) — callers should show CHAT_REQUEST_ERRORS.staleRequest ("คำขอนี้สิ้นสุดแล้ว") rather than a generic failure. */
export class ChatRequestStaleError extends Error {
  constructor() {
    super(CHAT_REQUEST_ERRORS.staleRequest)
    this.name = 'ChatRequestStaleError'
  }
}

function toRequestRecordData(id: string, data: DocumentData): ChatRequestRecord {
  return {
    id,
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
    respondedAtMs: toMillis(data.respondedAt),
  }
}

function toRequestRecord(snap: QueryDocumentSnapshot<DocumentData>): ChatRequestRecord {
  return toRequestRecordData(snap.id, snap.data())
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
    console.log('[chatRequest] send_started', { hasFromPublicId: !!from.publicId, hasToPublicId: !!to.publicId })
    const db = getFirebaseFirestore()

    // Prerequisite check, before ever touching chatRequests: the create rule requires
    // `fromPublicId` to equal `myPublicId()` (read fresh from users/{uid}.publicId on the
    // server). Log which piece is missing — publicId is the intentionally-shareable id,
    // never uid/email — so a real gap is visible in the console instead of surfacing only
    // as an opaque "Missing or insufficient permissions." from Firestore.
    if (!from.publicId || !to.publicId || !from.codename || !to.codename || from.publicId === to.publicId) {
      console.error('[chatRequest] invalid_payload', {
        hasFromPublicId: !!from.publicId,
        hasToPublicId: !!to.publicId,
        hasFromCodename: !!from.codename,
        hasToCodename: !!to.codename,
        isSelfRequest: !!from.publicId && from.publicId === to.publicId,
      })
      throw new Error(CHAT_REQUEST_ERRORS.permissionDenied)
    }

    // Confirms the id we were handed as "the other person" actually resolves to a real,
    // currently-published account before ever writing a chatRequests doc. Every onboarded
    // account keeps publicProfiles/{publicId} in sync (see syncPublicProfile in
    // firebaseAuthService.ts), so a miss here means whatever called sendRequest resolved
    // the wrong identifier for its target (e.g. something other than that person's real
    // publicId) — never the publicId/uid itself, just whether it resolved.
    // publicProfiles are effectively append-only (never deleted), so once we've confirmed
    // a given target exists this session there's no reason to spend another Firestore
    // read re-confirming it — e.g. resending to the same person after a decline, or
    // opening the confirm modal for someone already resolved earlier this session.
    if (!isPublicProfileKnownToExist(to.publicId)) {
      const targetProfileSnap = await getDoc(doc(db, 'publicProfiles', to.publicId))
      if (!targetProfileSnap.exists()) {
        console.error('[chatRequest] profile_not_found', {})
        throw new Error(CHAT_REQUEST_ERRORS.permissionDenied)
      }
      markPublicProfileExists(to.publicId)
    }
    console.log('[chatRequest] target_profile_ok', {})

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
        console.error('[chatRequest] invalid_payload', {
          reason: 'stale_own_public_id',
          ownUserDocExists: ownSnap.exists(),
          ownUserDocHasPublicId: !!canonicalPublicId,
        })
        throw new Error('โปรไฟล์ไม่ตรงกัน กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่')
      }
    }

    const id = pairId(from.publicId, to.publicId)
    const ref = doc(db, 'chatRequests', id)

    // Resolves the CURRENT real state before ever attempting a write — this is what lets
    // us tell a genuine still-live request apart from a stale/legacy pending one that
    // should be treated as expired (see getEffectiveRequestStatus/PENDING_EXPIRY_MS),
    // instead of guessing a category from a denied write after the fact.
    let existingSnap
    try {
      existingSnap = await getDoc(ref)
    } catch (err) {
      console.error('[chatRequest] unexpected_error', {
        phase: 'preflight_read',
        message: err instanceof Error ? err.message : String(err),
      })
      throw new Error(CHAT_REQUEST_ERRORS.permissionDenied)
    }

    if (existingSnap.exists()) {
      const existing = toRequestRecordData(existingSnap.id, existingSnap.data())
      const effectiveStatus = getEffectiveRequestStatus(existing)
      if (effectiveStatus === 'pending') {
        console.error('[chatRequest] duplicate_pending', { requestId: id })
        throw new Error(CHAT_REQUEST_ERRORS.duplicatePending)
      }
      if (effectiveStatus === 'accepted') {
        console.error('[chatRequest] duplicate_pending', { requestId: id, reason: 'active_conversation' })
        throw new Error(CHAT_REQUEST_ERRORS.activeConversation)
      }
    }
    console.log('[chatRequest] payload_valid', { requestId: id, isReopen: existingSnap.exists() })

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

    // firestore.rules routes this write to its `create` rule for a brand-new pair, its
    // reopen-from-terminal-state branch for a finished one, or (for a pair whose only
    // existing doc is a stale-but-technically-still-pending one, per the check above) the
    // stale-pending reopen branch — see firestore.rules for the exact conditions each
    // requires. A denial here past our own pre-checks means the deployed rules don't yet
    // match this repo's firestore.rules.
    try {
      await setDoc(ref, payload)
    } catch (err) {
      const code = err instanceof FirestoreError ? err.code : 'unknown'
      if (code === 'unavailable' || code === 'deadline-exceeded') {
        console.error('[chatRequest] unexpected_error', { category: 'network', code, requestId: id })
        throw new Error(CHAT_REQUEST_ERRORS.network)
      }
      if (code === 'permission-denied') {
        console.error('[chatRequest] permission_denied', { code, requestId: id, wasReopenAttempt: existingSnap.exists() })
      } else {
        console.error('[chatRequest] unexpected_error', {
          code,
          requestId: id,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      throw new Error(CHAT_REQUEST_ERRORS.permissionDenied)
    }

    console.log('[chatRequest] send_success', { requestId: id })

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
    try {
      await updateDoc(doc(db, 'chatRequests', requestId), {
        status: 'cancelled',
        roomId: null,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      const code = err instanceof FirestoreError ? err.code : 'unknown'
      if (code === 'permission-denied') {
        // The only way cancelling a request you sent gets denied is that it's no longer
        // pending (the other side just accepted/declined it, or you already cancelled it
        // from another tab) — a stale UI action, not a real failure.
        console.log('[chatRequest] cancel_stale', { requestId })
        throw new ChatRequestStaleError()
      }
      console.error('[chatRequest] unexpected_error', {
        phase: 'cancel',
        requestId,
        code,
        message: err instanceof Error ? err.message : String(err),
      })
      throw new Error(CHAT_REQUEST_ERRORS.permissionDenied)
    }
  }

  async acceptRequest(requestId: string): Promise<string> {
    const db = getFirebaseFirestore()
    const reqRef = doc(db, 'chatRequests', requestId)
    console.log('[chatRequest] accept_started', { requestId })

    // A fresh, unique id per conversation session — NOT the deterministic pairId — so
    // ending this room later can never block the same two people from starting a brand
    // new session (a second room at the same id would be an update, not a create, and
    // chatRooms' update rule only ever allows active -> ended, never a revived room).
    const roomId = doc(collection(db, 'chatRooms')).id
    const roomRef = doc(db, 'chatRooms', roomId)
    const notificationRef = doc(collection(db, 'notifications'))
    // Aggregate-only usage stat (see analyticsService.ts) — one room, one count, in the
    // SAME transaction as the room's own create-once creation above so it can never fire
    // without a real new room behind it. analyticsChatStartMarkers/{roomId} is keyed by the
    // fresh per-session roomId (never the deterministic pairId), so a later, genuinely new
    // session between the same two people is counted again, exactly like the room itself.
    const analyticsStartMarkerRef = doc(db, 'analyticsChatStartMarkers', roomId)
    const analyticsDailyRef = doc(db, 'analyticsDaily', getBangkokDateString())

    let requestData: DocumentData
    try {
      requestData = await runTransaction(db, async (tx) => {
        // Reading and re-checking status inside the transaction (rather than a plain
        // getDoc before a writeBatch) is what actually prevents a race between two
        // near-simultaneous accept/decline attempts on the same request: Firestore retries
        // a transaction whose read set changed before it committed, so only one of two
        // concurrent accepts ever wins — the other sees status already flipped and fails
        // cleanly here instead of creating a second room.
        const snap = await tx.get(reqRef)
        if (!snap.exists() || snap.data().status !== 'pending') throw new ChatRequestStaleError()
        const data = snap.data()
        tx.update(reqRef, { status: 'accepted', roomId, respondedAt: serverTimestamp(), updatedAt: serverTimestamp() })
        tx.set(roomRef, {
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
        // Notifies the original sender that their request was accepted — written in the
        // same transaction as the accept + room creation, so it can never exist without a
        // real accepted request/room behind it.
        tx.set(notificationRef, {
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
        tx.set(analyticsStartMarkerRef, { requestId, createdAt: serverTimestamp() })
        tx.set(analyticsDailyRef, { chatSessionsStarted: increment(1) }, { merge: true })
        return data
      })
    } catch (err) {
      if (err instanceof ChatRequestStaleError) {
        console.log('[chatRequest] accept_stale', { requestId })
        throw err
      }
      const code = err instanceof FirestoreError ? err.code : 'unknown'
      if (code === 'permission-denied') {
        console.error('[chatRequest] accept_permission_denied', { requestId })
      } else {
        console.error('[chatRequest] unexpected_error', {
          phase: 'accept',
          requestId,
          code,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      throw new Error(CHAT_REQUEST_ERRORS.permissionDenied)
    }

    console.log('[chatRequest] accept_success', { requestId, roomId })
    await this.clearStaleIncomingNotification(db, requestData.toPublicId, requestId)
    return roomId
  }

  async declineRequest(requestId: string): Promise<void> {
    const db = getFirebaseFirestore()
    const reqRef = doc(db, 'chatRequests', requestId)
    console.log('[chatRequest] decline_started', { requestId })
    const notificationRef = doc(collection(db, 'notifications'))

    let requestData: DocumentData
    try {
      requestData = await runTransaction(db, async (tx) => {
        const snap = await tx.get(reqRef)
        if (!snap.exists() || snap.data().status !== 'pending') throw new ChatRequestStaleError()
        const data = snap.data()
        tx.update(reqRef, { status: 'declined', roomId: null, respondedAt: serverTimestamp(), updatedAt: serverTimestamp() })
        tx.set(notificationRef, {
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
        return data
      })
    } catch (err) {
      if (err instanceof ChatRequestStaleError) {
        console.log('[chatRequest] decline_stale', { requestId })
        throw err
      }
      const code = err instanceof FirestoreError ? err.code : 'unknown'
      if (code === 'permission-denied') {
        console.error('[chatRequest] decline_permission_denied', { requestId })
      } else {
        console.error('[chatRequest] unexpected_error', {
          phase: 'decline',
          requestId,
          code,
          message: err instanceof Error ? err.message : String(err),
        })
      }
      throw new Error(CHAT_REQUEST_ERRORS.permissionDenied)
    }

    console.log('[chatRequest] decline_success', { requestId })
    await this.clearStaleIncomingNotification(db, requestData.toPublicId, requestId)
  }

  /** Best-effort: marks the receiver's own now-answered incoming_chat_request bell entry read. Never allowed to fail the accept/decline itself — the realtime chatRequests listener is already the primary, already-proven source of truth for the popup/buttons. */
  private async clearStaleIncomingNotification(
    db: ReturnType<typeof getFirebaseFirestore>,
    receiverPublicId: string,
    requestId: string,
  ): Promise<void> {
    try {
      const staleIds = await findUnreadNotificationIds(
        db,
        receiverPublicId,
        (n) => n.type === 'incoming_chat_request' && n.requestId === requestId,
      )
      if (staleIds.length === 0) return
      const batch = writeBatch(db)
      for (const id of staleIds) batch.update(doc(db, 'notifications', id), { read: true })
      await batch.commit()
    } catch (err) {
      console.error('[chat] failed to clear stale incoming_chat_request notification', err)
    }
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

  subscribeReceivedRequests(publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(
      collection(db, 'chatRequests'),
      where('toPublicId', '==', publicId),
      orderBy('updatedAt', 'desc'),
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map(toRequestRecord)),
      (err) => console.error('[chat] subscribeReceivedRequests failed', err),
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
              kind: data.kind === 'sticker' ? 'sticker' : 'text',
              text: data.text,
              stickerId: data.stickerId,
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
    await this.notifyNewMessage(db, roomId, senderPublicId, text.length > 80 ? `${text.slice(0, 80)}…` : text)
  }

  async sendSticker(roomId: string, senderPublicId: string, stickerId: string): Promise<void> {
    const db = getFirebaseFirestore()
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      senderPublicId,
      kind: 'sticker' as const,
      stickerId,
      createdAt: serverTimestamp(),
    })
    const sticker = getStickerById(stickerId)
    await this.notifyNewMessage(db, roomId, senderPublicId, sticker ? `${sticker.emoji} สติกเกอร์` : 'ส่งสติกเกอร์')
  }

  /** Best-effort, separate write (same reasoning as the incoming_chat_request notification
   * in sendRequest): notifies the other participant so they see a toast/bell entry even
   * while elsewhere in the app. Never fails the message send itself. Shared by
   * sendMessage/sendSticker — only the preview text differs. */
  private async notifyNewMessage(
    db: ReturnType<typeof getFirebaseFirestore>,
    roomId: string,
    senderPublicId: string,
    preview: string,
  ): Promise<void> {
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
        preview,
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
    // Aggregate-only usage stat (see analyticsService.ts), same batch as the room's own
    // active -> ended transition above — analyticsChatEndMarkers/{roomId} is create-once,
    // so even a retry of this exact call (see the already-ended no-op check above) can
    // never double-count the same room being ended.
    batch.set(doc(db, 'analyticsChatEndMarkers', roomId), { createdAt: serverTimestamp() })
    batch.set(doc(db, 'analyticsDaily', getBangkokDateString()), { chatSessionsEnded: increment(1) }, { merge: true })

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
    // Bounded to the most recent 50: the bell/toast/Notification Center only ever surface
    // recent activity, so without a limit this listener would keep re-fetching and
    // re-diffing an ever-growing history on every single new notification as an account
    // accumulates months of activity — the same reasoning as gardenChat's limitToLast(50).
    const q = query(
      collection(db, 'notifications'),
      where('ownerPublicId', '==', publicId),
      orderBy('createdAt', 'desc'),
      limit(50),
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

  async deleteNotifications(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return
    const db = getFirebaseFirestore()
    // Firestore batches cap at 500 writes — the Notification Center only ever loads the
    // most recent 50 (see subscribeNotifications), so a single batch always suffices here.
    const batch = writeBatch(db)
    for (const id of notificationIds) {
      batch.delete(doc(db, 'notifications', id))
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
  subscribeReceivedRequests(_publicId: string, callback: (requests: ChatRequestRecord[]) => void): () => void {
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
  async sendSticker(): Promise<void> {}
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
  async deleteNotifications(): Promise<void> {}
}

// Without a configured Firebase project there is no other real device to accept a
// request or receive a message, so every operation here is inert — see
// EchoSpacePage.tsx / EchoGardenPage.tsx which already tolerate an always-empty state.
export const privateChatBridge: PrivateChatBridge = firebaseConfigured
  ? new FirebasePrivateChatBridge()
  : new NoopPrivateChatBridge()
