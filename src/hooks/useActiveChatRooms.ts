import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatRoomRecord } from '../features/chat/privateChatBridge'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

/** Rooms the current account is still an active (not-yet-ended) participant of. */
export function useActiveChatRooms() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatRoomRecord[]>([])

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setRooms([])
      return
    }
    return privateChatBridge.subscribeActiveRooms(user.publicId, setRooms)
  }, [user?.publicId])

  return rooms
}
