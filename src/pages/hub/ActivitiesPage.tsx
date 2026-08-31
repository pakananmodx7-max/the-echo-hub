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
  {
    id: 'daily-journal',
    icon: '📔',
    title: 'DAILY JOURNAL',
    description: 'บันทึกเรื่องราว ความรู้สึก และช่วงเวลาของวันนี้',
    ctaLabel: 'เขียนบันทึก',
    to: '/hub/activities/daily-journal',
    accent: 'lavender',
  },
]

const FAMILY_ACTIVITIES: ActivityDef[] = [
  {
    id: 'know-me-better',
    icon: '🎯',
    title: 'รู้จักกันแค่ไหน?',
    description: 'ลองทายใจคนใกล้ตัว แล้วดูว่าเรารู้จักกันแค่ไหน',
    ctaLabel: 'เล่นเลย',
    to: '/hub/activities/know-me-better',
    accent: 'lavender',
  },
  {
    id: 'open-heart-question',
    icon: '💬',
    title: 'คำถามเปิดใจวันนี้',
    description: 'บางบทสนทนาเริ่มต้นได้ด้วยคำถามดี ๆ เพียงหนึ่งข้อ',
    ctaLabel: 'สุ่มคำถาม',
    to: '/hub/activities/open-heart-question',
    accent: 'pink',
  },
  {
    id: 'family-memory',
    icon: '📸',
    title: 'ความทรงจำของเรา',
    description: 'เก็บช่วงเวลาดี ๆ เอาไว้กลับมาเปิดดูอีกครั้ง',
    ctaLabel: 'เพิ่มความทรงจำ',
    to: '/hub/activities/family-memory',
    accent: 'mint',
  },
]

const ACCENT_CLASSES: Record<ActivityDef['accent'], string> = {
  lavender: 'from-lavender-50',
  pink: 'from-pink-glow/40',
  mint: 'from-mint/40',
}

function ActivityList({ activities, completed }: { activities: ActivityDef[]; completed: Set<string> }) {
  return (
    <div className="flex flex-col gap-4">
      {activities.map((activity) => (
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
  )
}

export function ActivitiesPage() {
  const { user } = useAuth()
  const completed = new Set(user?.completedActivityIds ?? [])

  return (
    <div>
      <PageHeader title="🤍 HEAR WITH HEART" subtitle="ฟัง เข้าใจ และส่งต่อสิ่งดี ๆ" hideBack />

      <div className="px-5 pb-4">
        <ActivityList activities={ACTIVITIES} completed={completed} />
      </div>

      <div className="mt-2 px-5 pb-2">
        <h2 className="text-lg font-bold text-ink">🏠 FAMILY & FRIENDS</h2>
        <p className="mt-0.5 text-sm text-ink-soft">กิจกรรมเล็ก ๆ ที่ช่วยให้เราเข้าใจกันมากขึ้น</p>
      </div>
      <div className="px-5 pb-6">
        <ActivityList activities={FAMILY_ACTIVITIES} completed={completed} />
      </div>
    </div>
  )
}
