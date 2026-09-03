import {
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getFirebaseFirestore } from '../../lib/firebase'
import type { NotificationType } from '../chat/privateChatBridge'

export type CounselorThreadStatus = 'waiting_admin' | 'waiting_student' | 'closed'
export type CounselorSenderRole = 'student' | 'admin'

export interface CounselorThread {
  studentUid: string
  studentPublicId: string
  studentDisplayName: string
  status: CounselorThreadStatus
  createdAtMs: number | null
  updatedAtMs: number | null
  lastMessageAtMs: number | null
  lastStudentMessageAtMs: number | null
  lastAdminReplyAtMs: number | null
  unreadForAdmin: boolean
  unreadForStudent: boolean
  lastMessagePreview: string
}

export interface CounselorMessage {
  id: string
  senderUid: string
  senderRole: CounselorSenderRole
  text: string
  createdAtMs: number | null
}

/** Matches the exact `text.slice(0, 80)` truncation privateChatBridge.ts already uses for
 * notification/inbox previews — kept here so the two conventions never silently diverge. */
function previewOf(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null
}

function toThread(snap: { id: string; data: () => DocumentData }): CounselorThread {
  const data = snap.data()
  return {
    studentUid: data.studentUid,
    studentPublicId: data.studentPublicId,
    studentDisplayName: data.studentDisplayName,
    status: data.status,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
    lastMessageAtMs: toMillis(data.lastMessageAt),
    lastStudentMessageAtMs: toMillis(data.lastStudentMessageAt),
    lastAdminReplyAtMs: toMillis(data.lastAdminReplyAt),
    unreadForAdmin: !!data.unreadForAdmin,
    unreadForStudent: !!data.unreadForStudent,
    lastMessagePreview: data.lastMessagePreview ?? '',
  }
}

function toMessage(snap: QueryDocumentSnapshot<DocumentData>): CounselorMessage {
  const data = snap.data()
  return {
    id: snap.id,
    senderUid: data.senderUid,
    senderRole: data.senderRole,
    text: data.text,
    createdAtMs: toMillis(data.createdAt),
  }
}

const MESSAGE_PAGE_SIZE = 50

/**
 * The single entry point for the persistent ครูแนะแนว (Counselor) messaging system —
 * asynchronous, never expires, admin need not be online. Mirrors privateChatBridge.ts's
 * shape/conventions (Firestore-backed, realtime subscriptions, best-effort notification
 * writes) but is a fully separate collection/lifecycle — a counselor thread is never a
 * chatRooms session, never has a "จบการสนทนา" end action, and survives across logins.
 */
export const counselorBridge = {
  /** Live view of the caller's own thread — null until their first message ever creates it. */
  subscribeMyThread(studentUid: string, callback: (thread: CounselorThread | null) => void): () => void {
    const db = getFirebaseFirestore()
    return onSnapshot(
      doc(db, 'counselorThreads', studentUid),
      (snap) => callback(snap.exists() ? toThread(snap) : null),
      (err) => console.error('[counselor] subscribeMyThread failed', err),
    )
  },

  /** Every thread, most-recently-active first — the whole admin inbox in ONE listener (no
   * per-thread listeners), matching the "no realtime listener explosion" requirement. Capped
   * generously; a school-scale counselor inbox never approaches this in practice. */
  subscribeInbox(callback: (threads: CounselorThread[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(collection(db, 'counselorThreads'), orderBy('lastMessageAt', 'desc'), limit(200))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => toThread(d))),
      (err) => console.error('[counselor] subscribeInbox failed', err),
    )
  },

  /** Realtime view of the most recent MESSAGE_PAGE_SIZE messages, oldest first (ready to
   * render directly) — older history is fetched on demand via loadOlderMessages, never kept
   * in a second live listener. */
  subscribeRecentMessages(studentUid: string, callback: (messages: CounselorMessage[]) => void): () => void {
    const db = getFirebaseFirestore()
    const q = query(
      collection(db, 'counselorThreads', studentUid, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(MESSAGE_PAGE_SIZE),
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => toMessage(d)).reverse()),
      (err) => console.error('[counselor] subscribeRecentMessages failed', err),
    )
  },

  /** One-shot fetch of up to MESSAGE_PAGE_SIZE messages older than `beforeCreatedAtMs` —
   * powers "โหลดข้อความก่อนหน้า". Returns them oldest-first, plus whether a further page
   * might still exist (a full page came back). */
  async loadOlderMessages(
    studentUid: string,
    beforeCreatedAtMs: number,
  ): Promise<{ messages: CounselorMessage[]; hasMore: boolean }> {
    const db = getFirebaseFirestore()
    const q = query(
      collection(db, 'counselorThreads', studentUid, 'messages'),
      orderBy('createdAt', 'desc'),
      startAfter(Timestamp.fromMillis(beforeCreatedAtMs)),
      limit(MESSAGE_PAGE_SIZE),
    )
    const snap = await getDocs(q)
    const messages = snap.docs.map((d) => toMessage(d)).reverse()
    return { messages, hasMore: snap.docs.length === MESSAGE_PAGE_SIZE }
  },

  /** Creates the thread on the student's very first message, or updates it (and always
   * reopens it to waiting_admin, from any prior status) on every message after — one
   * transaction, so the thread's own state and the new message can never land only half-done. */
  async sendStudentMessage(studentUid: string, studentPublicId: string, studentDisplayName: string, text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed) return
    const db = getFirebaseFirestore()
    const threadRef = doc(db, 'counselorThreads', studentUid)
    const messageRef = doc(collection(db, 'counselorThreads', studentUid, 'messages'))
    const preview = previewOf(trimmed)

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(threadRef)
      if (!snap.exists()) {
        tx.set(threadRef, {
          studentUid,
          studentPublicId,
          studentDisplayName,
          status: 'waiting_admin' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastStudentMessageAt: serverTimestamp(),
          lastAdminReplyAt: null,
          unreadForAdmin: true,
          unreadForStudent: false,
          lastMessagePreview: preview,
        })
      } else {
        tx.update(threadRef, {
          status: 'waiting_admin' as const,
          updatedAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastStudentMessageAt: serverTimestamp(),
          unreadForAdmin: true,
          lastMessagePreview: preview,
        })
      }
      tx.set(messageRef, {
        senderUid: studentUid,
        senderRole: 'student' as const,
        text: trimmed,
        createdAt: serverTimestamp(),
        readAt: null,
      })
    })
  },

  /** The admin's reply — the thread must already exist (the admin never starts a thread for
   * a student who hasn't written in first). `adminPublicId` is the admin account's own
   * publicId (from AuthContext's `user.publicId` — every account, admin included, gets one
   * on first login; see firebaseAuthService.createUserDoc), needed as the notification's
   * `fromPublicId` to satisfy firestore.rules' `fromPublicId == myPublicId()` check, exactly
   * like every other notification write in this app. Best-effort notification write
   * afterward, mirroring privateChatBridge's own "never fail the send itself" convention. */
  async sendAdminReply(studentUid: string, adminUid: string, adminPublicId: string, text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed) return
    const db = getFirebaseFirestore()
    const threadRef = doc(db, 'counselorThreads', studentUid)
    const messageRef = doc(collection(db, 'counselorThreads', studentUid, 'messages'))
    const preview = previewOf(trimmed)

    let studentPublicId: string | null = null
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(threadRef)
      if (!snap.exists()) throw new Error('ไม่พบบทสนทนานี้')
      studentPublicId = snap.data().studentPublicId ?? null
      tx.update(threadRef, {
        status: 'waiting_student' as const,
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastAdminReplyAt: serverTimestamp(),
        unreadForStudent: true,
        lastMessagePreview: preview,
      })
      tx.set(messageRef, {
        senderUid: adminUid,
        senderRole: 'admin' as const,
        text: trimmed,
        createdAt: serverTimestamp(),
        readAt: null,
      })
    })

    if (!studentPublicId) return
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'counselor_reply' satisfies NotificationType,
        ownerPublicId: studentPublicId,
        fromPublicId: adminPublicId,
        fromCodename: 'ครูแนะแนว',
        requestId: null,
        roomId: null,
        counselorThreadId: studentUid,
        preview,
        read: false,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('[counselor] counselor_reply notification write failed', err)
    }
  },

  /** Marks the caller's OWN side "caught up to now" — student opens their thread, or admin
   * opens a student's thread. Best-effort, matching markRoomRead's own convention. */
  async markThreadOpened(studentUid: string, role: CounselorSenderRole): Promise<void> {
    const db = getFirebaseFirestore()
    try {
      await setDoc(doc(db, 'counselorThreads', studentUid, 'readState', role), { lastReadAt: serverTimestamp() })
    } catch (err) {
      console.error('[counselor] markThreadOpened failed', { studentUid, role, message: err instanceof Error ? err.message : String(err) })
    }

    // Clears the thread-level unread badge for this side (inbox dot / student's own
    // "unread reply" flag) — a SEPARATE, narrower write than the readState cursor above
    // (see firestore.rules: each is its own single-field-only update).
    try {
      const field = role === 'student' ? 'unreadForStudent' : 'unreadForAdmin'
      await updateDoc(doc(db, 'counselorThreads', studentUid), { [field]: false })
    } catch (err) {
      console.error('[counselor] clearing unread flag failed', { studentUid, role, message: err instanceof Error ? err.message : String(err) })
    }
  },

  /** Live read-cursor for one side of a thread ('student' or 'admin') — null means that
   * side hasn't opened this thread yet. Used to derive "อ่านแล้ว" by comparing against a
   * message's own createdAtMs, same convention as chatRooms/readState. */
  subscribeReadState(studentUid: string, role: CounselorSenderRole, callback: (lastReadAtMs: number | null) => void): () => void {
    const db = getFirebaseFirestore()
    return onSnapshot(
      doc(db, 'counselorThreads', studentUid, 'readState', role),
      (snap) => callback(snap.exists() ? toMillis(snap.data()?.lastReadAt) : null),
      (err) => console.error('[counselor] subscribeReadState failed', err),
    )
  },

  /** Every student thread that currently belongs to the given publicId — used only to
   * resolve a student's own thread existence check quickly where needed; the primary
   * student-side read is subscribeMyThread (keyed by uid directly). */
  async findThreadByStudentPublicId(studentPublicId: string): Promise<CounselorThread | null> {
    const db = getFirebaseFirestore()
    const snap = await getDocs(query(collection(db, 'counselorThreads'), where('studentPublicId', '==', studentPublicId), limit(1)))
    if (snap.empty) return null
    return toThread(snap.docs[0])
  },
}
