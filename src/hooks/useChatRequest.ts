import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatRequestRecord, type ChatRequestTarget } from '../features/chat/privateChatBridge'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

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

  function alreadySentTo(id: string): boolean {
    if (!firebaseConfigured) return localSentIds.has(id)
    return sentRequests.some((r) => r.toPublicId === id && (r.status === 'pending' || r.status === 'accepted'))
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
