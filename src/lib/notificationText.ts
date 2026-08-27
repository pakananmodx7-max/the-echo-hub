import type { ChatNotification } from '../features/chat/privateChatBridge'

/** Thai display copy for a Notification Center card, per notification type. */
export function notificationText(n: ChatNotification): string {
  switch (n.type) {
    case 'incoming_chat_request':
      return `${n.fromCodename} อยากคุยกับคุณ`
    case 'chat_request_accepted':
      return `${n.fromCodename} รับคำขอคุยของคุณแล้ว`
    case 'chat_request_declined':
      return `${n.fromCodename} ยังไม่สะดวกคุยตอนนี้`
    case 'new_message':
      return `💬 ${n.fromCodename} ส่งข้อความใหม่ถึงคุณ`
    default:
      return ''
  }
}
