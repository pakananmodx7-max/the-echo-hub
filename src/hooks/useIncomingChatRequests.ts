import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatRequestRecord } from '../features/chat/privateChatBridge'
import { isPendingRequest } from '../features/chat/chatRequestState'
import { createSharedSubscription } from '../lib/sharedSubscription'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

// The global incoming-request popup (IncomingChatRequestModal, mounted in HubLayout), the
// pending-requests review page, and TalkPage's own "you have N requests" summary all call
// this at once — shared so they open exactly one real Firestore listener between them.
const subscribeShared = createSharedSubscription<ChatRequestRecord[]>(
  (publicId, callback) => privateChatBridge.subscribeIncomingRequests(publicId, callback),
  [],
)

/**
 * Live list of pending chat requests addressed to the current account, newest last.
 * Powers both the global incoming-request popup and the "pending requests" review page.
 */
export function useIncomingChatRequests() {
  const { user } = useAuth()
  const [rawRequests, setRawRequests] = useState<ChatRequestRecord[]>([])
  // Re-filters on a minute-scale tick, not just on a new Firestore snapshot — a request
  // that ages past PENDING_EXPIRY_MS without anyone touching it must still stop being
  // actionable (Accept/Decline) on its own, per the pending-expiry policy.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setRawRequests([])
      return
    }
    return subscribeShared(user.publicId, setRawRequests)
  }, [user?.publicId])

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  // The Firestore query already filters status == 'pending' server-side, but that alone
  // can't tell a live request from a stale legacy one (e.g. 21 hours old) — this client
  // filter is what actually stops a request from being actionable once it's aged out.
  const requests = rawRequests.filter((r) => isPendingRequest(r))

  async function accept(requestId: string): Promise<string> {
    return privateChatBridge.acceptRequest(requestId)
  }

  async function decline(requestId: string): Promise<void> {
    await privateChatBridge.declineRequest(requestId)
  }

  return { requests, accept, decline }
}
