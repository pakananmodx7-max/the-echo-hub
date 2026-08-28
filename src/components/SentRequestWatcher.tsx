import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ChatRequestStatus } from '../features/chat/privateChatBridge'
import { useAuth } from '../hooks/useAuth'
import { useSentChatRequests } from '../hooks/useSentChatRequests'

/**
 * Mounted once in HubLayout, invisible. Watches the current account's own sent chat
 * requests in realtime (via the shared useSentChatRequests subscription — Echo Space and
 * Garden's own useChatRequest() already keep the same one open whenever they're mounted)
 * and auto-enters the private chat room the moment the other person accepts — fixing the
 * bug where the sender stayed on their old page after acceptance. The
 * `chat_request_accepted` notification written alongside the room (see acceptRequest in
 * privateChatBridge.ts) is the durable fallback for whenever this live auto-navigate can't
 * reach the sender (a different device, or the tab was closed).
 */
export function SentRequestWatcher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const sentRequests = useSentChatRequests()
  const lastStatusRef = useRef<Map<string, ChatRequestStatus>>(new Map())
  const initializedRef = useRef(false)

  useEffect(() => {
    lastStatusRef.current = new Map()
    initializedRef.current = false
  }, [user?.publicId])

  useEffect(() => {
    const isFirstSnapshot = !initializedRef.current
    initializedRef.current = true

    for (const r of sentRequests) {
      const prevStatus = lastStatusRef.current.get(r.id)
      lastStatusRef.current.set(r.id, r.status)

      // Only react to a transition witnessed live (pending -> accepted) — never to
      // whatever the request already was on the first snapshot after mount/reload,
      // which would otherwise force-navigate back into an old, already-seen room.
      if (!isFirstSnapshot && prevStatus === 'pending' && r.status === 'accepted' && r.roomId) {
        navigate(`/hub/talk/chat/${r.roomId}`)
      }
    }
  }, [sentRequests, navigate])

  return null
}
