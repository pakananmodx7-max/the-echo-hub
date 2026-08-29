import { useEffect, useState } from 'react'
import { privateChatBridge, type ChatNotification } from '../features/chat/privateChatBridge'
import { createSharedSubscription } from '../lib/sharedSubscription'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'

// NewMessageToast (mounted globally in HubLayout), NotificationBell (Home), the
// Notification Center page, and PrivateChatPage all call useNotifications() for the same
// account at once — shared so they open exactly one real Firestore listener between them.
const subscribeShared = createSharedSubscription<ChatNotification[]>(
  (publicId, callback) => privateChatBridge.subscribeNotifications(publicId, callback),
  [],
)

/** Live Notification Center feed for the current account, newest first. */
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<ChatNotification[]>([])

  useEffect(() => {
    if (!firebaseConfigured || !user?.publicId) {
      setNotifications([])
      return
    }
    return subscribeShared(user.publicId, setNotifications)
  }, [user?.publicId])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markRead(notificationId: string): Promise<void> {
    await privateChatBridge.markNotificationRead(notificationId)
  }

  async function markAllRead(): Promise<void> {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    await privateChatBridge.markAllNotificationsRead(unreadIds)
  }

  /** Deletes one or more notifications (pass a single-id array for one card) —
   * Notification Center housekeeping only, never touches the underlying chatRequests/
   * chatRooms doc (see privateChatBridge.deleteNotifications). The live subscription above
   * removes them from `notifications`/`unreadCount` automatically. */
  async function deleteNotifications(notificationIds: string[]): Promise<void> {
    await privateChatBridge.deleteNotifications(notificationIds)
  }

  return { notifications, unreadCount, markRead, markAllRead, deleteNotifications }
}
