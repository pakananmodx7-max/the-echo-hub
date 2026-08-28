import type { ChatRequestRecord, ChatRequestStatus } from './privateChatBridge'

/**
 * A `pending` request older than this is treated as expired everywhere in the client —
 * production had 21-hour-old pending requests permanently blocking a pair, since nothing
 * ever flipped their status. Must stay in sync with the matching `duration.value(60, 'm')`
 * window in firestore.rules' stale-pending reopen branch, or the client and server would
 * disagree about whether a given request still blocks a new one.
 */
export const PENDING_EXPIRY_MS = 60 * 60 * 1000

/** The single source of truth for "how old is this request" — falls back to updatedAt for a legacy doc that predates createdAt being set. */
function referenceMs(request: ChatRequestRecord): number | null {
  return request.createdAtMs ?? request.updatedAtMs ?? null
}

/** A `pending` request old enough that nobody is realistically going to answer it. */
export function isStalePendingRequest(request: ChatRequestRecord, now: number = Date.now()): boolean {
  if (request.status !== 'pending') return false
  const ref = referenceMs(request)
  if (ref == null) return false
  return now - ref > PENDING_EXPIRY_MS
}

/**
 * True only for a request that is genuinely live right now — the one status that should
 * ever block a new request between the same pair, show live Accept/Decline buttons, or
 * keep a sender's button reading "ส่งคำขอแล้ว". Every other status (and a stale pending
 * one) must immediately stop blocking the pair — see the 16-section chat lifecycle spec.
 */
export function isPendingRequest(request: ChatRequestRecord, now: number = Date.now()): boolean {
  return request.status === 'pending' && !isStalePendingRequest(request, now)
}

export function isFinalRequest(request: ChatRequestRecord, now: number = Date.now()): boolean {
  return !isPendingRequest(request, now)
}

/** The status a request should be TREATED as right now — folds a stale pending doc into 'expired' for display/logic without requiring a write first. */
export function getEffectiveRequestStatus(request: ChatRequestRecord, now: number = Date.now()): ChatRequestStatus {
  return isStalePendingRequest(request, now) ? 'expired' : request.status
}

/** Exact Thai copy for the Notification Center / request review UI, keyed by effective status. */
export const REQUEST_STATUS_LABEL: Record<ChatRequestStatus, string> = {
  pending: 'รอการตอบรับ',
  accepted: 'รับคำขอแล้ว',
  declined: 'ปฏิเสธคำขอแล้ว',
  cancelled: 'คำขอนี้ถูกยกเลิกแล้ว',
  expired: 'คำขอนี้หมดอายุแล้ว',
}

/**
 * User-facing Thai error copy for the chat-request lifecycle — never show a raw Firestore
 * error ("Missing or insufficient permissions.") to a student. Detailed category stays in
 * the paired `[chatRequest]` console diagnostics only.
 */
export const CHAT_REQUEST_ERRORS = {
  permissionDenied: 'ส่งคำขอคุยไม่สำเร็จ กรุณาลองอีกครั้ง',
  duplicatePending: 'คุณส่งคำขอคุยให้อีกฝ่ายแล้ว',
  activeConversation: 'คุณกำลังสนทนากับอีกฝ่ายอยู่แล้ว',
  staleRequest: 'คำขอนี้สิ้นสุดแล้ว',
  network: 'การเชื่อมต่อมีปัญหา กรุณาลองอีกครั้ง',
} as const
