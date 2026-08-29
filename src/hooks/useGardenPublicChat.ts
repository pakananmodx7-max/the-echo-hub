import { useEffect, useState } from 'react'
import { gardenPublicChatService } from '../features/garden/gardenPublicChatService'
import type { GardenChatMessage } from '../features/garden/types'

/** Live feed of Garden Public Chat — everyone currently inside the garden sees the same messages. */
export function useGardenPublicChat() {
  const [messages, setMessages] = useState<GardenChatMessage[]>([])

  useEffect(() => gardenPublicChatService.subscribe(setMessages), [])

  return {
    messages,
    sendMessage: gardenPublicChatService.sendMessage.bind(gardenPublicChatService),
    sendSticker: gardenPublicChatService.sendSticker.bind(gardenPublicChatService),
    reportMessage: gardenPublicChatService.reportMessage.bind(gardenPublicChatService),
  }
}
