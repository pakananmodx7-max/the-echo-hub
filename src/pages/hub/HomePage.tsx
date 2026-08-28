import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'
import { Modal } from '../../components/Modal'
import { MoodPicker } from '../../components/MoodPicker'
import { Button } from '../../components/Button'
import { NotificationBell } from '../../components/NotificationBell'
import { getMoodById } from '../../data/moods'
import { ONLINE_USERS } from '../../data/onlineUsers'
import { useGardenPlayers } from '../../hooks/useGardenPlayers'
import { useAuth } from '../../hooks/useAuth'
import { prefetchWhenIdle } from '../../lib/idlePrefetch'
import type { MoodId } from '../../types'

export function HomePage() {
  const { user, setMood } = useAuth()
  const [moodModalOpen, setMoodModalOpen] = useState(false)
  const [pendingMood, setPendingMood] = useState<MoodId | null>(user?.mood ?? null)
  const gardenMembers = useGardenPlayers()

  // Echo Space and Notifications are the two most likely next taps from Home — prefetching
  // their (already code-split, see App.tsx) chunks once the browser is idle makes that tap
  // feel instant instead of waiting on a fresh download. Garden is deliberately never
  // prefetched here — its 3D bundle is sizeable and should only load once actually opened,
  // especially on mobile/slow connections (see prefetchWhenIdle's own connection check).
  useEffect(() => {
    return prefetchWhenIdle(() => {
      void import('./EchoSpacePage')
      void import('./NotificationsPage')
    })
  }, [])

  if (!user) return null
  const mood = getMoodById(user.mood ?? undefined)
  const previewAvatars = ONLINE_USERS.slice(0, 5)
  const completedCount = user.completedActivityIds.length

  async function handleConfirmMood() {
    if (pendingMood) await setMood(pendingMood)
    setMoodModalOpen(false)
  }

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar avatarId={user.avatarId} size="lg" ring />
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-mint-deep" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{user.codename}</p>
          <button
            type="button"
            onClick={() => {
              setPendingMood(user.mood)
              setMoodModalOpen(true)
            }}
            className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-lavender-50 px-2.5 py-1 text-xs font-medium text-lavender-600"
          >
            <span aria-hidden>{mood?.emoji}</span>
            {mood?.label}
            <span className="text-ink-faint" aria-hidden>
              ›
            </span>
          </button>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-mint-text">
          <span className="h-2 w-2 rounded-full bg-mint-deep" aria-hidden /> Online
        </span>
        <NotificationBell />
      </div>

      <div className="mt-6">
        <h1 className="text-xl font-bold text-ink">สวัสดี {user.codename} 👋</h1>
        <p className="mt-1 text-sm text-ink-soft">"วันนี้อยากเริ่มจากตรงไหนดี?"</p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Card className="bg-gradient-to-br from-lavender-50 to-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-ink">💫 ECHO SPACE</p>
              <p className="mt-1 text-sm text-ink-soft">ตอนนี้ใครอยู่ตรงนี้บ้าง?</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex -space-x-3">
              {previewAvatars.map((u) => (
                <div key={u.id} className="ring-2 ring-white rounded-full">
                  <Avatar avatarId={u.avatarId} size="sm" />
                </div>
              ))}
            </div>
            <span className="text-sm text-ink-soft">{ONLINE_USERS.length} คนกำลังออนไลน์</span>
          </div>
          <Link to="/hub/space">
            <Button fullWidth variant="secondary" className="mt-4">
              เข้า Echo Space →
            </Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-mint/30 to-white">
          <p className="text-lg font-semibold text-ink">🌿 ECHO GARDEN</p>
          <p className="mt-1 text-sm text-ink-soft">พื้นที่เล็ก ๆ สำหรับพัก ฟัง และแบ่งปัน</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex -space-x-3">
              {gardenMembers.slice(0, 4).map((m) => (
                <div key={m.id} className="ring-2 ring-white rounded-full">
                  <Avatar avatarId={m.avatarId} size="sm" />
                </div>
              ))}
            </div>
            <span className="text-sm text-ink-soft">มี {gardenMembers.length} คนอยู่ในสวน</span>
          </div>
          <Link to="/hub/garden">
            <Button fullWidth variant="soft-mint" className="mt-4">
              เข้าสวน →
            </Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-pink-glow/40 to-white">
          <p className="text-lg font-semibold text-ink">🤍 HEAR WITH HEART</p>
          <p className="mt-1 text-sm text-ink-soft">ฟัง เข้าใจ และส่งต่อสิ่งดี ๆ</p>
          <p className="mt-3 text-sm font-medium text-pink-text">5 กิจกรรม</p>
          <Link to="/hub/activities">
            <Button fullWidth variant="soft-pink" className="mt-4">
              ดูกิจกรรม →
            </Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-lavender-100 to-white">
          <p className="text-lg font-semibold text-ink">🎨 วาด & ฟัง</p>
          <p className="mt-1 text-sm text-ink-soft">ใช้ภาพเป็นจุดเริ่มต้นของบทสนทนา</p>
          <Link to="/hub/draw">
            <Button fullWidth variant="secondary" className="mt-4">
              เริ่มวาด →
            </Button>
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-mint/40 to-white">
          <p className="text-lg font-semibold text-ink">🫶 FRIEND BOND</p>
          <p className="mt-1 text-sm text-ink-soft">เกมเล็ก ๆ ที่ทำให้เรารู้จักกันมากขึ้น</p>
          <p className="mt-3 text-sm font-medium text-mint-text">Friend Quest · Who Am I?</p>
          <Link to="/hub/friends">
            <Button fullWidth variant="soft-mint" className="mt-4">
              เล่นกับเพื่อน →
            </Button>
          </Link>
        </Card>

        <Card className="border border-lavender-100 bg-white/80">
          <p className="text-lg font-semibold text-ink">💬 SOMEONE TO TALK TO</p>
          <p className="mt-1 text-sm text-ink-soft">ถ้าวันนี้คุณอยากให้ใครสักคนฟัง</p>
          <Link to="/hub/talk">
            <Button fullWidth variant="secondary" className="mt-4">
              หาพื้นที่พูดคุย →
            </Button>
          </Link>
        </Card>

        <Card>
          <p className="text-lg font-semibold text-ink">🌱 MY ECHO</p>
          <p className="mt-1 text-sm text-ink-soft">เรื่องราวและกิจกรรมของฉัน</p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-ink-soft">
              <span>ความคืบหน้ากิจกรรม</span>
              <span className="font-semibold text-ink">{completedCount} / 5 activities completed</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-lavender-100">
              <div
                className="h-full rounded-full bg-lavender-500 transition-all"
                style={{ width: `${Math.min((completedCount / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      <Modal open={moodModalOpen} onClose={() => setMoodModalOpen(false)}>
        <h2 className="text-lg font-bold text-ink">วันนี้คุณรู้สึกเป็นอย่างไร?</h2>
        <p className="mt-1 text-sm text-ink-soft">เปลี่ยนโหมดความรู้สึกของคุณได้ทุกเมื่อ</p>
        <div className="mt-4 max-h-[50vh] overflow-y-auto">
          <MoodPicker selected={pendingMood} onSelect={setPendingMood} />
        </div>
        <Button fullWidth className="mt-4" onClick={handleConfirmMood} disabled={!pendingMood}>
          บันทึกความรู้สึก
        </Button>
      </Modal>
    </div>
  )
}
