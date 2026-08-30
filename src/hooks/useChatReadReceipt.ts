import { useEffect, useState } from 'react'
import { privateChatBridge } from '../features/chat/privateChatBridge'

/**
 * Realtime read receipts ("อ่านแล้ว") for one open private chat room.
 *
 * Two independent jobs:
 *  1. Subscribes to the OTHER participant's read cursor, so the caller can compare it
 *     against its own latest message to decide "ส่งแล้ว ✓" vs "อ่านแล้ว ✓✓".
 *  2. Marks MY OWN read cursor "caught up to now" — but only while all three of these
 *     genuinely hold at once: this hook is mounted (i.e. I'm actually on this room's
 *     PrivateChatPage, not elsewhere in the hub/Garden/Notification Center — navigating
 *     away unmounts the page and this hook with it), the browser tab is actually visible
 *     (not backgrounded/minimized), and the room is still active. A notification arriving,
 *     being "online" elsewhere, or the room having ended never mark anything as read — see
 *     firestore.rules' readState subcollection, which enforces the "room must be active"
 *     half of that as a real guarantee, not just a UI convention.
 *
 * Re-marks on every new message while these hold (messageCount changing re-runs the
 * effect) and again the instant the tab regains visibility after being backgrounded
 * mid-chat — exactly the two realtime triggers the spec calls for.
 */
export function useChatReadReceipt(
  roomId: string | undefined,
  myPublicId: string | null | undefined,
  partnerPublicId: string | null,
  roomActive: boolean,
  messageCount: number,
): number | null {
  const [partnerLastReadAtMs, setPartnerLastReadAtMs] = useState<number | null>(null)

  useEffect(() => {
    if (!roomId || !partnerPublicId) {
      setPartnerLastReadAtMs(null)
      return
    }
    return privateChatBridge.subscribeReadState(roomId, partnerPublicId, setPartnerLastReadAtMs)
  }, [roomId, partnerPublicId])

  useEffect(() => {
    if (!roomId || !myPublicId || !roomActive) return

    function markIfVisible() {
      if (document.visibilityState === 'visible') {
        void privateChatBridge.markRoomRead(roomId!, myPublicId!)
      }
    }

    markIfVisible()
    document.addEventListener('visibilitychange', markIfVisible)
    return () => document.removeEventListener('visibilitychange', markIfVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myPublicId, roomActive, messageCount])

  return partnerLastReadAtMs
}
