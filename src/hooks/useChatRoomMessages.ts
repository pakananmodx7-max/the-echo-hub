import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatMessage, type ChatRoomRecord } from '../features/chat/privateChatBridge'
import { useAuth } from './useAuth'

/** Live message thread + room metadata for one open private chat room. */
export function useChatRoomMessages(roomId: string | undefined) {
  const { user } = useAuth()
  const [room, setRoom] = useState<ChatRoomRecord | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!roomId) {
      setRoom(null)
      return
    }
    return privateChatBridge.subscribeRoom(roomId, setRoom)
  }, [roomId])

  useEffect(() => {
    if (!roomId) {
      setMessages([])
      return
    }
    return privateChatBridge.subscribeRoomMessages(roomId, setMessages)
  }, [roomId])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!roomId || !user?.publicId || !trimmed) return
    setSending(true)
    try {
      await privateChatBridge.sendMessage(roomId, user.publicId, trimmed)
    } finally {
      setSending(false)
    }
  }

  return { room, messages, send, sending }
}
