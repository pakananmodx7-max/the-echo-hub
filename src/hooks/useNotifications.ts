import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatNotification } from '../features/chat/privateChatBridge'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

/** Live Notification Center feed for the current account, newest first. */
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<ChatNotification[]>([])

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setNotifications([])
      return
    }
    return privateChatBridge.subscribeNotifications(user.publicId, setNotifications)
  }, [user?.publicId])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markRead(notificationId: string): Promise<void> {
    await privateChatBridge.markNotificationRead(notificationId)
  }

  async function markAllRead(): Promise<void> {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    await privateChatBridge.markAllNotificationsRead(unreadIds)
  }

  return { notifications, unreadCount, markRead, markAllRead }
}
