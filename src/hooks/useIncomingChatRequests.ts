import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatRequestRecord } from '../features/chat/privateChatBridge'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

/**
 * Live list of pending chat requests addressed to the current account, newest last.
 * Powers both the global incoming-request popup and the "pending requests" review page.
 */
export function useIncomingChatRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<ChatRequestRecord[]>([])

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setRequests([])
      return
    }
    return privateChatBridge.subscribeIncomingRequests(user.publicId, setRequests)
  }, [user?.publicId])

  async function accept(requestId: string): Promise<string> {
    return privateChatBridge.acceptRequest(requestId)
  }

  async function decline(requestId: string): Promise<void> {
    await privateChatBridge.declineRequest(requestId)
  }

  return { requests, accept, decline }
}
