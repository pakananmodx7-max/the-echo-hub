import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { useIncomingChatRequests } from '../../hooks/useIncomingChatRequests'

interface TalkOption {
  id: string
  icon: string
  title: string
  description: string
  info: string
}

const OPTIONS: TalkOption[] = [
  {
    id: 'space',
    icon: '💬',
    title: 'พื้นที่พูดคุย',
    description: 'คุยกับคนที่พร้อมรับฟัง',
    info: 'ในเวอร์ชันเต็ม ระบบจะจับคู่คุณกับเพื่อนที่กำลัง "พร้อมรับฟัง" ใน Echo Space โดยไม่เปิดเผยตัวตนจริง ตอนนี้เป็นการสาธิต UI เท่านั้น',
  },
  {
    id: 'counselor',
    icon: '👩‍🏫',
    title: 'ครูแนะแนว',
    description: 'พูดคุยกับผู้ใหญ่ที่พร้อมช่วยเหลือ',
    info: 'มีเรื่องอยากปรึกษาไหม?\n\nคุณสามารถฝากข้อความไว้ได้ตลอด\nครูแนะแนวจะเข้ามาตอบเมื่อพร้อม',
  },
  {
    id: 'trusted',
    icon: '🫶',
    title: 'คนที่ฉันไว้ใจ',
    description: 'เพื่อน ครอบครัว หรือผู้ใหญ่ที่คุณรู้สึกปลอดภัยที่จะคุยด้วย',
    info: 'ในเวอร์ชันเต็ม คุณจะสามารถบันทึกรายชื่อคนที่ไว้ใจ และส่งข้อความถึงพวกเขาได้อย่างรวดเร็ว ตอนนี้เป็นการสาธิต UI เท่านั้น',
  },
]

export function TalkPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState<TalkOption | null>(null)
  const { requests } = useIncomingChatRequests()

  return (
    <div>
      <PageHeader title="อยากมีใครสักคนฟังไหม? 🤍" />

      <div className="px-5 pb-4">
        <p className="text-sm leading-relaxed text-ink-soft">
          "คุณไม่จำเป็นต้องจัดการทุกอย่างคนเดียว"
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <Card
            onClick={() => navigate('/hub/talk/requests')}
            className="cursor-pointer border border-lavender-100 bg-white/90 transition hover:shadow-soft"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                💌
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">คำขอคุยที่ค้างอยู่</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {requests.length > 0 ? `มีคำขอใหม่ ${requests.length} รายการ` : 'ดูคำขอที่คุณส่งและได้รับ'}
                </p>
              </div>
              <span className="text-ink-faint" aria-hidden>
                ›
              </span>
            </div>
          </Card>
          {OPTIONS.map((option) => (
            <Card
              key={option.id}
              onClick={() => setActive(option)}
              className="cursor-pointer border border-lavender-100 bg-white/90 transition hover:shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  {option.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{option.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{option.description}</p>
                </div>
                <span className="text-ink-faint" aria-hidden>
                  ›
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={!!active} onClose={() => setActive(null)}>
        {active && active.id === 'counselor' ? (
          <div className="text-center">
            <p className="text-3xl" aria-hidden>
              {active.icon}
            </p>
            <p className="mt-2 font-semibold text-ink">{active.title}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{active.info}</p>
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              ข้อความนี้ไม่ใช่บริการฉุกเฉิน และครูอาจไม่ได้ตอบทันที
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button fullWidth onClick={() => navigate('/hub/counselor')}>
                💬 ส่งข้อความถึงครูแนะแนว
              </Button>
              <Button fullWidth variant="ghost" onClick={() => setActive(null)}>
                ปิด
              </Button>
            </div>
          </div>
        ) : active ? (
          <div className="text-center">
            <p className="text-3xl" aria-hidden>
              {active.icon}
            </p>
            <p className="mt-2 font-semibold text-ink">{active.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{active.info}</p>
            <Button fullWidth className="mt-5" onClick={() => setActive(null)}>
              เข้าใจแล้ว
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
