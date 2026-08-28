import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { gardenPublicChatService } from '../../../../features/garden/gardenPublicChatService'
import { randomListeningPrompt, randomGardenMission } from '../../../../data/gardenPrompts'

interface ListeningStoneModalProps {
  open: boolean
  onClose: () => void
  currentUser: { id: string; codename: string; avatarId: string | null }
}

export function ListeningStoneModal({ open, onClose, currentUser }: ListeningStoneModalProps) {
  const [prompt, setPrompt] = useState(() => randomListeningPrompt())
  const [mission, setMission] = useState(() => randomGardenMission())
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) {
      setPrompt(randomListeningPrompt())
      setMission(randomGardenMission())
      setSent(false)
    }
  }, [open])

  function handleSend() {
    void gardenPublicChatService.sendMessage({
      authorPublicId: currentUser.id,
      authorCodename: currentUser.codename,
      authorAvatarId: currentUser.avatarId ?? 'cloud',
      text: prompt,
    })
    setSent(true)
  }

  return (
    <Modal open={open} onClose={onClose}>
      <p className="text-3xl" aria-hidden>
        🪨
      </p>
      <h2 className="mt-1 text-lg font-bold text-ink">LISTENING STONE</h2>
      <p className="text-sm text-ink-soft">คำถามเล็ก ๆ ที่อาจเปิดบทสนทนาดี ๆ</p>

      <div className="mt-4 rounded-2xl bg-lavender-50 p-4 text-center">
        <p className="text-lg font-medium text-ink">"{prompt}"</p>
      </div>

      {sent ? (
        <p className="mt-3 text-center text-sm font-medium text-mint-text">ส่งคำถามไป Garden Chat แล้ว ✓</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2.5">
        <Button fullWidth onClick={handleSend} disabled={sent}>
          💬 ส่งคำถามไป Garden Chat
        </Button>
        <Button
          fullWidth
          variant="secondary"
          onClick={() => {
            setPrompt(randomListeningPrompt(prompt))
            setSent(false)
          }}
        >
          🎲 สุ่มใหม่
        </Button>
      </div>

      <div className="mt-5 rounded-2xl bg-mint/30 p-4">
        <p className="text-sm font-semibold text-ink">🎧 ภารกิจคนฟังวันนี้</p>
        <p className="mt-1 text-sm text-ink">{mission}</p>
        <p className="mt-1 text-xs text-ink-faint">แค่ลองทำเบา ๆ ไม่มีการให้คะแนน</p>
      </div>
    </Modal>
  )
}
