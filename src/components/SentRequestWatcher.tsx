import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { privateChatBridge, type ChatRequestStatus } from '../features/chat/privateChatBridge'
import { useAuth } from '../hooks/useAuth'

/**
 * Mounted once in HubLayout, invisible. Watches the current account's own sent chat
 * requests in realtime and auto-enters the private chat room the moment the other
 * person accepts — fixing the bug where the sender stayed on their old page after
 * acceptance. The `chat_request_accepted` notification written alongside the room (see
 * acceptRequest in privateChatBridge.ts) is the durable fallback for whenever this
 * live auto-navigate can't reach the sender (a different device, or the tab was closed).
 */
export function SentRequestWatcher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const lastStatusRef = useRef<Map<string, ChatRequestStatus>>(new Map())
  const initializedRef = useRef(false)

  useEffect(() => {
    lastStatusRef.current = new Map()
    initializedRef.current = false
    if (!user?.publicId) return

    return privateChatBridge.subscribeSentRequests(user.publicId, (requests) => {
      const isFirstSnapshot = !initializedRef.current
      initializedRef.current = true

      for (const r of requests) {
        const prevStatus = lastStatusRef.current.get(r.id)
        lastStatusRef.current.set(r.id, r.status)

        // Only react to a transition witnessed live (pending -> accepted) — never to
        // whatever the request already was on the first snapshot after mount/reload,
        // which would otherwise force-navigate back into an old, already-seen room.
        if (!isFirstSnapshot && prevStatus === 'pending' && r.status === 'accepted' && r.roomId) {
          navigate(`/hub/talk/chat/${r.roomId}`)
        }
      }
    })
  }, [user?.publicId, navigate])

  return null
}
