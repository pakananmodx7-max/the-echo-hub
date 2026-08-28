import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { useAuth } from '../hooks/useAuth'
import { useDailyProgress } from '../hooks/useDailyProgress'
import { fetchProgressForDates, type DailyProgress } from '../features/rewards/rewardsService'
import { getTodaysMissions } from '../features/rewards/missionCatalog'
import { getBangkokDateString, getLastNDateStrings, getWeekdayIndex, THAI_WEEKDAY_ABBR } from '../lib/thailandDate'

const HISTORY_DAYS = 14

interface EchoPointsSectionProps {
  /** Lets the daily check-in mission's CTA reopen the same mood-edit flow ProfilePage already has, instead of a second parallel UI for the same action. */
  onOpenCheckin: () => void
}

/**
 * "✨ วันนี้ของฉัน" / "📋 ภารกิจประจำวัน" / weekly view / history — the Me-tab home of the
 * whole daily check-in + ECHO Points + missions system (see the 16-section spec). Reads
 * `user.totalPoints`/`currentStreak` straight off the realtime AuthContext user (already
 * kept in sync by the reward transaction's write to users/{uid}); today's mission
 * checklist is a live subscription; the weekly/history views are lightweight one-shot
 * fetches by known date, refreshed whenever today's own progress changes.
 */
export function EchoPointsSection({ onOpenCheckin }: EchoPointsSectionProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const today = getBangkokDateString()
  const todaysMissions = useMemo(() => getTodaysMissions(today), [today])
  const progress = useDailyProgress(user?.id, today)
  const weekDates = useMemo(() => getLastNDateStrings(7, today), [today])
  const [weekProgress, setWeekProgress] = useState<DailyProgress[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<DailyProgress[] | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchProgressForDates(user.id, weekDates).then((result) => {
      if (!cancelled) setWeekProgress(result)
    })
    return () => {
      cancelled = true
    }
    // Re-fetches whenever today's own points change, so "this week" stays current
    // without needing 7 separate live listeners for what is a personal-reflection view.
  }, [user?.id, weekDates, progress.pointsEarned])

  useEffect(() => {
    if (!historyOpen || !user?.id) return
    let cancelled = false
    fetchProgressForDates(user.id, getLastNDateStrings(HISTORY_DAYS, today)).then((result) => {
      if (!cancelled) setHistory(result.slice().reverse())
    })
    return () => {
      cancelled = true
    }
  }, [historyOpen, user?.id, today])

  if (!user) return null

  const weekByDate = new Map(weekProgress.map((d) => [d.date, d]))
  const doneCount = todaysMissions.filter((m) => progress.missionsCompleted.includes(m.id)).length
  const totalCount = todaysMissions.length
  const weekPoints = weekProgress.reduce((sum, d) => sum + d.pointsEarned, 0)
  const streak = user.currentStreak ?? 0
  const historyDays = history?.filter((d) => d.missionsCompleted.length > 0) ?? []

  return (
    <>
      <Card>
        <p className="font-semibold text-ink">✨ วันนี้ของฉัน</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatTile icon="✨" label="แต้มทั้งหมด" value={`${user.totalPoints ?? 0} แต้ม`} />
          <StatTile
            icon="🔥"
            label="เช็กอินต่อเนื่อง"
            value={streak > 0 ? `${streak} วัน` : 'เริ่มใหม่ได้ทุกวัน 🌱'}
          />
          <StatTile icon="🎯" label="ภารกิจวันนี้" value={`${doneCount}/${totalCount}`} />
          <StatTile icon="🏆" label="สัปดาห์นี้" value={`${weekPoints} แต้ม`} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span>วันนี้</span>
            <span className="font-semibold text-ink">
              ทำภารกิจแล้ว {doneCount}/{totalCount}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-lavender-100">
            <div
              className="h-full rounded-full bg-lavender-500 transition-all"
              style={{ width: `${totalCount ? Math.min((doneCount / totalCount) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-semibold text-ink">📋 ภารกิจประจำวัน</p>
        <div className="mt-3 flex flex-col gap-2">
          {todaysMissions.map((mission) => {
            const done = progress.missionsCompleted.includes(mission.id)
            return (
              <div
                key={mission.id}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 transition ${done ? 'bg-mint/30' : 'bg-cream-deep/60'}`}
              >
                <span className="text-lg" aria-hidden>
                  {done ? '✅' : '⬜'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${done ? 'text-ink-soft' : 'text-ink'}`}>
                    <span aria-hidden className="mr-1">
                      {mission.icon}
                    </span>
                    {mission.title}
                  </p>
                  <p className={`text-xs ${done ? 'text-mint-text' : 'text-ink-faint'}`}>
                    {done ? `ได้รับ +${mission.points} แต้ม` : `+${mission.points} แต้ม`}
                  </p>
                </div>
                {!done ? (
                  <button
                    type="button"
                    onClick={() => (mission.ctaTo ? navigate(mission.ctaTo) : onOpenCheckin())}
                    className="shrink-0 text-xs font-semibold text-lavender-600"
                  >
                    {mission.ctaLabel}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <p className="font-semibold text-ink">สัปดาห์นี้</p>
        <div className="mt-3 flex justify-between">
          {weekDates.map((date) => {
            const d = weekByDate.get(date)
            return (
              <div key={date} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-ink-faint">{THAI_WEEKDAY_ABBR[getWeekdayIndex(date)]}</span>
                <span className="text-lg" aria-hidden>
                  {d?.checkinCompleted ? '✅' : '⬜'}
                </span>
              </div>
            )
          })}
        </div>
        <button type="button" onClick={() => setHistoryOpen(true)} className="mt-4 text-sm font-semibold text-lavender-600">
          ดูประวัติ →
        </button>
      </Card>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)}>
        <h2 className="text-lg font-bold text-ink">ประวัติของฉัน</h2>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {history === null ? (
            <p className="text-sm text-ink-faint">กำลังโหลด...</p>
          ) : historyDays.length === 0 ? (
            <p className="text-sm text-ink-faint">ยังไม่มีประวัติ ลองทำภารกิจแรกของคุณดูสิ</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {historyDays.map((d) => (
                <div key={d.date} className="flex items-center justify-between rounded-2xl bg-cream-deep/60 px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{formatThaiShortDate(d.date)}</p>
                    <p className="text-xs text-ink-soft">{d.missionsCompleted.length} ภารกิจ</p>
                  </div>
                  <p className="text-sm font-semibold text-lavender-600">+{d.pointsEarned} แต้ม</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button fullWidth variant="secondary" className="mt-4" onClick={() => setHistoryOpen(false)}>
          ปิด
        </Button>
      </Modal>
    </>
  )
}

function StatTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-lavender-50/70 px-3.5 py-3">
      <p className="text-xs text-ink-soft">
        <span aria-hidden>{icon}</span> {label}
      </p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  )
}

function formatThaiShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
