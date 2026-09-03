import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminHeader } from '../../components/AdminHeader'
import { Card } from '../../components/Card'
import { useCounselorInbox } from '../../hooks/useCounselorInbox'
import { formatRelativeTime } from '../../lib/relativeTime'
import type { CounselorThread } from '../../features/counselor/counselorBridge'

type FilterTab = 'all' | 'unread' | 'answered'

const TAB_LABEL: Record<FilterTab, string> = {
  all: 'ทั้งหมด',
  unread: 'ยังไม่ได้อ่าน',
  answered: 'ตอบแล้ว',
}

function matchesTab(t: CounselorThread, tab: FilterTab): boolean {
  if (tab === 'unread') return t.unreadForAdmin
  if (tab === 'answered') return t.status === 'waiting_student'
  return true
}

/**
 * The admin counselor inbox (/admin/counselor) — one shared realtime listener over every
 * thread (see useCounselorInbox), filtered/sorted purely client-side for the optional tabs
 * so this never needs a second query or a composite index. Never shows a student's email,
 * uid, or any content outside what they sent into this specific thread.
 */
export function AdminCounselorInboxPage() {
  const navigate = useNavigate()
  const { threads, unreadCount, loaded } = useCounselorInbox()
  const [tab, setTab] = useState<FilterTab>('all')

  const visible = useMemo(() => threads.filter((t) => matchesTab(t, tab)), [threads, tab])

  return (
    <div className="min-h-svh bg-cream">
      <div className="mx-auto max-w-md pb-10">
        <AdminHeader
          title="👩‍🏫 ECHO Counselor"
          subtitle="กล่องข้อความปรึกษา"
          hideBack
          action={
            unreadCount > 0 ? (
              <span className="shrink-0 rounded-full bg-pink-glow px-2.5 py-1 text-xs font-semibold text-pink-text">
                {unreadCount} ใหม่
              </span>
            ) : undefined
          }
        />

        <div className="px-5 pb-4">
          <div className="mt-2 flex gap-2">
            {(Object.keys(TAB_LABEL) as FilterTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  tab === t ? 'bg-lavender-500 text-white' : 'bg-white text-ink-soft border border-lavender-100'
                }`}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {!loaded ? (
              <p className="mt-10 text-center text-sm text-ink-faint">กำลังโหลด...</p>
            ) : visible.length === 0 ? (
              <p className="mt-10 text-center text-sm text-ink-faint">
                {tab === 'all' ? 'ยังไม่มีข้อความปรึกษา' : 'ไม่มีรายการในหมวดนี้'}
              </p>
            ) : (
              visible.map((t) => (
                <Card
                  key={t.studentUid}
                  onClick={() => navigate(`/admin/counselor/${t.studentUid}`)}
                  className={`cursor-pointer border transition hover:shadow-soft ${
                    t.unreadForAdmin ? 'border-2 border-lavender-200 bg-lavender-50' : 'border-lavender-100 bg-white/90'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {t.unreadForAdmin ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                    ) : (
                      <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-ink">{t.studentDisplayName}</p>
                        <span className="shrink-0 text-xs text-ink-faint">{formatRelativeTime(t.lastMessageAtMs)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-ink-soft">{t.lastMessagePreview}</p>
                      {t.unreadForAdmin ? (
                        <p className="mt-1 text-xs font-medium text-pink-text">ยังไม่ได้อ่าน</p>
                      ) : t.status === 'waiting_student' ? (
                        <p className="mt-1 text-xs text-mint-text">ตอบแล้ว</p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
