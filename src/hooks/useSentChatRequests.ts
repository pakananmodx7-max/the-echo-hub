import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatRequestRecord } from '../features/chat/privateChatBridge'
import { createSharedSubscription } from '../lib/sharedSubscription'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

// SentRequestWatcher (global, HubLayout), useChatRequest (Echo Space / Garden), the
// pending-requests review page, and the Notification Center all need the current
// account's own sent chatRequests at once — shared so they open exactly one real
// Firestore listener between them instead of each opening its own.
const subscribeShared = createSharedSubscription<ChatRequestRecord[]>(
  (publicId, callback) => privateChatBridge.subscribeSentRequests(publicId, callback),
  [],
)

/** Live list of chat requests the current account has sent, any status, newest-updated first. */
export function useSentChatRequests(): ChatRequestRecord[] {
  const { user } = useAuth()
  const [sentRequests, setSentRequests] = useState<ChatRequestRecord[]>([])

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setSentRequests([])
      return
    }
    return subscribeShared(user.publicId, setSentRequests)
  }, [user?.publicId])

  return sentRequests
}
