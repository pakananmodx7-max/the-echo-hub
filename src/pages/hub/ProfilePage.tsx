import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'
import { Modal } from '../../components/Modal'
import { Button } from '../../components/Button'
import { MoodPicker } from '../../components/MoodPicker'
import { EchoPointsSection } from '../../components/EchoPointsSection'
import { AVATARS } from '../../data/avatars'
import { generateCodename } from '../../data/codenames'
import { getMoodById } from '../../data/moods'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import type { EchoTheme } from '../../context/ThemeContext'
import { getBangkokDateString } from '../../lib/thailandDate'
import type { MoodId } from '../../types'

const THEME_OPTIONS: { id: EchoTheme; emoji: string; label: string }[] = [
  { id: 'light', emoji: '☀️', label: 'สว่าง' },
  { id: 'dark', emoji: '🌙', label: 'มืด' },
  { id: 'system', emoji: '⚙️', label: 'ตามระบบ' },
]

const ALL_ACTIVITIES = [
  { id: 'say-it-today', label: 'Say It Today' },
  { id: 'hear-someone', label: 'Hear Someone' },
  { id: 'someone-to-talk-to', label: 'Someone to Talk To' },
  { id: 'friend-bond', label: 'Friend Bond' },
]

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, setCodename, setMood, completeDailyCheckin, resetDemoData } = useAuth()
  const { theme, setTheme } = useTheme()
  const [editOpen, setEditOpen] = useState(false)
  const [moodOpen, setMoodOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const [draftName, setDraftName] = useState(user?.codename ?? '')
  const [draftAvatar, setDraftAvatar] = useState(user?.avatarId ?? AVATARS[0].id)
  const [pendingMood, setPendingMood] = useState<MoodId | null>(user?.mood ?? null)

  if (!user) return null
  const mood = getMoodById(user.mood ?? undefined)

  function openEdit() {
    setDraftName(user!.codename ?? '')
    setDraftAvatar(user!.avatarId ?? AVATARS[0].id)
    setEditOpen(true)
  }

  async function handleSaveCodename() {
    const trimmed = draftName.trim()
    if (trimmed.length < 3) return
    await setCodename(trimmed, draftAvatar)
    setEditOpen(false)
  }

  async function handleSaveMood() {
    if (!pendingMood) return
    // If today's daily check-in hasn't happened yet, saving a mood here also completes
    // it (same +5 points / streak as the dedicated check-in modal) — one mood-selection
    // action, not two separate flows asking the same question.
    if (user!.lastCheckinDate !== getBangkokDateString()) await completeDailyCheckin(pendingMood)
    else await setMood(pendingMood)
    setMoodOpen(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function handleResetDemo() {
    resetDemoData()
    navigate('/')
  }

  return (
    <div>
      <PageHeader title="โปรไฟล์ของฉัน" hideBack />

      <div className="flex flex-col gap-4 px-5 pb-6">
        <Card className="flex flex-col items-center text-center">
          <Avatar avatarId={user.avatarId} size="xl" ring />
          <p className="mt-3 text-lg font-semibold text-ink">{user.codename}</p>
          <button
            type="button"
            onClick={() => {
              setPendingMood(user.mood)
              setMoodOpen(true)
            }}
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-lavender-50 px-3 py-1 text-sm font-medium text-lavender-600"
          >
            <span aria-hidden>{mood?.emoji}</span> {mood?.label}
          </button>
          <Button variant="secondary" className="mt-4" onClick={openEdit}>
            แก้ไข Codename และ Avatar
          </Button>
        </Card>

        <EchoPointsSection
          onOpenCheckin={() => {
            setPendingMood(user.mood)
            setMoodOpen(true)
          }}
        />

        <Card>
          <p className="font-semibold text-ink">🌱 กิจกรรมของฉัน</p>
          <ul className="mt-3 flex flex-col gap-2">
            {ALL_ACTIVITIES.map((a) => {
              const done = user.completedActivityIds.includes(a.id)
              return (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{a.label}</span>
                  <span className={done ? 'font-semibold text-mint-text' : 'text-ink-faint'}>
                    {done ? '✓ สำเร็จแล้ว' : 'ยังไม่ได้ทำ'}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card
          onClick={() => setPrivacyOpen(true)}
          className="cursor-pointer flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-ink">🔒 ความเป็นส่วนตัว</p>
            <p className="mt-0.5 text-sm text-ink-soft">เราปกป้องตัวตนของคุณอย่างไร</p>
          </div>
          <span className="text-ink-faint" aria-hidden>
            ›
          </span>
        </Card>

        <Card
          onClick={() => setThemeOpen(true)}
          className="cursor-pointer flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-ink">🎨 ธีมการแสดงผล</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {THEME_OPTIONS.find((t) => t.id === theme)?.emoji} {THEME_OPTIONS.find((t) => t.id === theme)?.label}
            </p>
          </div>
          <span className="text-ink-faint" aria-hidden>
            ›
          </span>
        </Card>

        <Button variant="secondary" fullWidth onClick={handleLogout}>
          ออกจากระบบ
        </Button>

        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="text-center text-xs text-ink-faint underline underline-offset-2"
        >
          รีเซ็ตข้อมูลทดลองทั้งหมด
        </button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <h2 className="text-lg font-bold text-ink">แก้ไข Codename</h2>
        <div className="mt-4 flex justify-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
              AVATARS.find((a) => a.id === draftAvatar)?.bg ?? 'bg-lavender-100'
            }`}
          >
            <span aria-hidden>{AVATARS.find((a) => a.id === draftAvatar)?.emoji}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => setDraftAvatar(avatar.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition ${avatar.bg} ${
                draftAvatar === avatar.id ? 'ring-2 ring-lavender-500 scale-110' : 'opacity-70'
              }`}
            >
              <span aria-hidden>{avatar.emoji}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
        />
        <button
          type="button"
          onClick={() => setDraftName(generateCodename())}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-lavender-600"
        >
          สุ่มชื่อให้ฉัน 🎲
        </button>
        <Button fullWidth className="mt-4" onClick={handleSaveCodename}>
          บันทึก
        </Button>
      </Modal>

      <Modal open={moodOpen} onClose={() => setMoodOpen(false)}>
        <h2 className="text-lg font-bold text-ink">เปลี่ยนความรู้สึกวันนี้</h2>
        <div className="mt-4 max-h-[50vh] overflow-y-auto">
          <MoodPicker selected={pendingMood} onSelect={setPendingMood} />
        </div>
        <Button fullWidth className="mt-4" onClick={handleSaveMood} disabled={!pendingMood}>
          บันทึกความรู้สึก
        </Button>
      </Modal>

      <Modal open={privacyOpen} onClose={() => setPrivacyOpen(false)}>
        <h2 className="text-lg font-bold text-ink">🔒 ความเป็นส่วนตัวของคุณ</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          THE ECHO HUB ไม่แสดงชื่อจริง อีเมล เบอร์โทรศัพท์ หรือรหัสนักเรียนของคุณให้ผู้อื่นเห็น
          คนอื่นจะรู้จักคุณผ่าน Codename และ Avatar เท่านั้น ข้อมูลในเวอร์ชันนี้เป็นข้อมูลทดลอง
          (Demo) และถูกเก็บไว้ในเครื่องของคุณเท่านั้น
        </p>
        <Button fullWidth className="mt-4" onClick={() => setPrivacyOpen(false)}>
          เข้าใจแล้ว
        </Button>
      </Modal>

      <Modal open={themeOpen} onClose={() => setThemeOpen(false)}>
        <h2 className="text-lg font-bold text-ink">🎨 ธีมการแสดงผล</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">เลือกโหมดสีที่ต้องการให้ THE ECHO HUB แสดงผล</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setTheme(opt.id)
                setThemeOpen(false)
              }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] font-semibold transition ${
                theme === opt.id
                  ? 'border-lavender-500 bg-lavender-50 text-lavender-600'
                  : 'border-lavender-100 text-ink-soft'
              }`}
            >
              <span className="text-xl" aria-hidden>
                {opt.emoji}
              </span>
              <span className="flex-1">{opt.label}</span>
              {theme === opt.id ? (
                <span className="text-lavender-500" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)}>
        <h2 className="text-lg font-bold text-ink">รีเซ็ตข้อมูลทดลอง?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          การกระทำนี้จะลบบัญชีทดลอง Codename Avatar และความคืบหน้ากิจกรรมทั้งหมดบนเครื่องนี้
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button fullWidth variant="soft-pink" onClick={handleResetDemo}>
            ลบข้อมูลทั้งหมด
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setResetOpen(false)}>
            ยกเลิก
          </Button>
        </div>
      </Modal>
    </div>
  )
}
