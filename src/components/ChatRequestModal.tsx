import { Modal } from './Modal'
import { Button } from './Button'
import type { UseChatRequest } from '../hooks/useChatRequest'

interface ChatRequestModalProps {
  chatRequest: UseChatRequest
}

/**
 * The one "ask to talk privately" modal used everywhere in the app —
 * ECHO SPACE, ECHO GARDEN avatars, the online member panel, and the
 * Private Bench all render this same component via `useChatRequest()`.
 */
export function ChatRequestModal({ chatRequest }: ChatRequestModalProps) {
  const { target, cancel, confirm, sending, isTargetSent } = chatRequest

  return (
    <Modal open={!!target} onClose={cancel}>
      {target ? (
        isTargetSent ? (
          <div className="text-center">
            <p className="text-3xl" aria-hidden>
              ✓
            </p>
            <p className="mt-2 font-semibold text-ink">ส่งคำขอแล้ว ✓</p>
            <Button fullWidth className="mt-5" onClick={cancel}>
              ปิด
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-ink">ส่งคำขอคุยให้ {target.codename}?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              "อีกฝ่ายจะเป็นคนเลือกว่าจะรับคำขอหรือไม่"
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button fullWidth onClick={confirm} disabled={sending}>
                ส่งคำขอ 🤍
              </Button>
              <Button fullWidth variant="ghost" onClick={cancel} disabled={sending}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )
      ) : null}
    </Modal>
  )
}
