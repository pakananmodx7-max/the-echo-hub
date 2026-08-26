import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { useAuth } from '../../hooks/useAuth'

interface ActivityDef {
  id: string
  icon: string
  title: string
  description: string
  ctaLabel: string
  to: string
  accent: 'lavender' | 'pink' | 'mint'
}

const ACTIVITIES: ActivityDef[] = [
  {
    id: 'send-song',
    icon: '🎧',
    title: 'SEND A SONG',
    description: 'ส่งเพลงหนึ่งเพลง เพื่อบอกใครสักคนว่าเราเป็นห่วง',
    ctaLabel: 'เริ่มกิจกรรม',
    to: '/hub/activities/send-song',
    accent: 'lavender',
  },
  {
    id: 'say-it-today',
    icon: '💬',
    title: 'SAY IT TODAY',
    description: 'วันนี้คุณพูดสิ่งดี ๆ กับใครแล้วหรือยัง?',
    ctaLabel: 'สุ่มภารกิจ',
    to: '/hub/activities/say-it-today',
    accent: 'pink',
  },
  {
    id: 'hear-someone',
    icon: '👂',
    title: 'HEAR SOMEONE',
    description: 'วันนี้ลองฟังใครสักคนโดยไม่รีบตัดสิน',
    ctaLabel: 'สุ่มภารกิจ',
    to: '/hub/activities/hear-someone',
    accent: 'mint',
  },
  {
    id: 'someone-to-talk-to',
    icon: '🤍',
    title: 'SOMEONE TO TALK TO',
    description: 'บางครั้งคนที่ต้องการคนฟัง อาจเป็นตัวเราเอง',
    ctaLabel: 'ดูตัวเลือก',
    to: '/hub/talk',
    accent: 'lavender',
  },
  {
    id: 'friend-bond',
    icon: '🫶',
    title: 'FRIEND BOND',
    description: 'Friend Quest และ Who Am I? เกมที่ทำให้เรารู้จักกันมากขึ้น',
    ctaLabel: 'เล่นกับเพื่อน',
    to: '/hub/friends',
    accent: 'mint',
  },
]

const ACCENT_CLASSES: Record<ActivityDef['accent'], string> = {
  lavender: 'from-lavender-50',
  pink: 'from-pink-glow/40',
  mint: 'from-mint/40',
}

export function ActivitiesPage() {
  const { user } = useAuth()
  const completed = new Set(user?.completedActivityIds ?? [])

  return (
    <div>
      <PageHeader title="🤍 HEAR WITH HEART" subtitle="ฟัง เข้าใจ และส่งต่อสิ่งดี ๆ" hideBack />

      <div className="flex flex-col gap-4 px-5 pb-4">
        {ACTIVITIES.map((activity) => (
          <Card key={activity.id} className={`bg-gradient-to-br to-white ${ACCENT_CLASSES[activity.accent]}`}>
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden>
                {activity.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold tracking-wide text-ink">{activity.title}</p>
                  {completed.has(activity.id) ? (
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-mint-text">
                      สำเร็จแล้ว
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{activity.description}</p>
              </div>
            </div>
            <Link to={activity.to}>
              <Button fullWidth variant="secondary" className="mt-4">
                {activity.ctaLabel}
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
