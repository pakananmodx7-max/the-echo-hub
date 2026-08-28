import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatRequestRecord } from '../features/chat/privateChatBridge'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

/**
 * Every chat request where the current account is the receiver, in ANY status — not just
 * still-pending ones (see useIncomingChatRequests for that). Lets the Notification Center
 * resolve a request's real, current state instead of trusting a possibly-stale
 * `incoming_chat_request` notification snapshot (a notification is written once, at send
 * time, and never updated afterwards).
 */
export function useReceivedChatRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<ChatRequestRecord[]>([])

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setRequests([])
      return
    }
    return privateChatBridge.subscribeReceivedRequests(user.publicId, setRequests)
  }, [user?.publicId])

  return requests
}
