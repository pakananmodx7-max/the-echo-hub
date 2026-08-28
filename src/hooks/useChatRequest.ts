import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatRequestRecord, type ChatRequestTarget } from '../features/chat/privateChatBridge'
import { isPendingRequest } from '../features/chat/chatRequestState'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

/**
 * Forces isPendingRequest's clock-based staleness check to be re-evaluated periodically
 * even when Firestore hasn't pushed a new snapshot — otherwise a sender's "ส่งคำขอแล้ว ✓"
 * button would only reset once *something else* re-renders the component, not the moment
 * the request actually crosses the expiry window. A minute-scale tick is precise enough
 * for a 60-minute expiry window without re-rendering on every request.
 */
function useStalenessTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])
}

/**
 * Drives the shared "ask to talk privately" flow — ECHO SPACE, ECHO GARDEN's avatar
 * interactions, and the Private Bench all share one instance of this per page via
 * `ChatRequestModal`. Backed by a live `chatRequests` subscription (sender's own sent
 * requests) once Firebase is configured, so `isTargetSent`/`alreadySentTo` reflect real
 * accept/decline changes in real time; falls back to local optimistic state otherwise so
 * the pre-Firebase demo UX is unchanged.
 */
export function useChatRequest() {
  const { user } = useAuth()
  const [target, setTarget] = useState<ChatRequestTarget | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentRequests, setSentRequests] = useState<ChatRequestRecord[]>([])
  const [localSentIds, setLocalSentIds] = useState<Set<string>>(new Set())
  useStalenessTick()

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setSentRequests([])
      return
    }
    return privateChatBridge.subscribeSentRequests(user.publicId, setSentRequests)
  }, [user?.publicId])

  function request(nextTarget: ChatRequestTarget) {
    setError(null)
    setTarget(nextTarget)
  }

  function cancel() {
    setTarget(null)
  }

  async function confirm() {
    if (!target) return
    if (!user?.publicId || !user.codename) {
      console.error('[chat] confirm blocked: current user profile incomplete', {
        hasPublicId: !!user?.publicId,
        hasCodename: !!user?.codename,
      })
      setError('โปรไฟล์ของคุณยังโหลดไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง')
      return
    }
    setSending(true)
    setError(null)
    try {
      await privateChatBridge.sendRequest(
        { publicId: user.publicId, codename: user.codename, avatarId: user.avatarId, mood: user.mood },
        {
          publicId: target.id,
          codename: target.codename,
          avatarId: target.avatarId ?? null,
          mood: target.mood ?? null,
        },
      )
      if (!firebaseConfigured) {
        setLocalSentIds((prev) => new Set(prev).add(target.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ส่งคำขอคุยไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSending(false)
    }
  }

  // Only a genuinely still-`pending`, non-stale request counts as "already sent" — an
  // accepted/declined/cancelled/expired request (or a `pending` one that's aged past
  // PENDING_EXPIRY_MS) must never keep this stuck on "ส่งคำขอแล้ว ✓" forever. sendRequest
  // itself still refuses a duplicate send while genuinely mid-conversation (status
  // 'accepted') — this button just no longer disables itself for that case.
  function alreadySentTo(id: string): boolean {
    if (!firebaseConfigured) return localSentIds.has(id)
    return sentRequests.some((r) => r.toPublicId === id && isPendingRequest(r))
  }

  return {
    target,
    request,
    cancel,
    confirm,
    sending,
    error,
    alreadySentTo,
    isTargetSent: target ? alreadySentTo(target.id) : false,
    sentRequests,
  }
}

export type UseChatRequest = ReturnType<typeof useChatRequest>
