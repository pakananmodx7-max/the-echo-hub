import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../../components/PageHeader'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { MonthCalendar } from '../../../components/MonthCalendar'
import {
  FAMILY_MEMORY_EMOJIS,
  DEFAULT_FAMILY_MEMORY_EMOJI,
  FAMILY_MEMORY_TAG_SUGGESTIONS,
  MAX_FAMILY_MEMORY_TAG_LENGTH,
} from '../../../data/familyMemoryOptions'
import {
  createFamilyMemory,
  deleteFamilyMemory,
  subscribeFamilyMemories,
  updateFamilyMemory,
  type FamilyMemoryDraft,
  type FamilyMemoryEntry,
} from '../../../features/familyFriends/familyMemoryService'
import { MAX_MEMORY_DESCRIPTION_LENGTH, MAX_MEMORY_TITLE_LENGTH } from '../../../features/familyFriends/familyFriendsLimits'
import { awardDailyMission } from '../../../features/rewards/rewardsService'
import { notifyRewardResult } from '../../../features/rewards/rewardPopupBus'
import { recordActivity } from '../../../features/analytics/analyticsService'
import { useAuth } from '../../../hooks/useAuth'
import { getBangkokDateString } from '../../../lib/thailandDate'

type View = 'timeline' | 'calendar'

function emptyDraft(today: string): FamilyMemoryDraft {
  return { date: today, title: '', description: '', emoji: DEFAULT_FAMILY_MEMORY_EMOJI, tag: '' }
}

function formatThaiDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function FamilyMemoryPage() {
  const { user, completeActivity } = useAuth()
  const today = getBangkokDateString()

  const [view, setView] = useState<View>('timeline')
  const [memories, setMemories] = useState<FamilyMemoryEntry[]>([])
  const [calYear, setCalYear] = useState(() => Number(today.slice(0, 4)))
  const [calMonth, setCalMonth] = useState(() => Number(today.slice(5, 7)))
  const [selectedDate, setSelectedDate] = useState(today)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FamilyMemoryDraft>(() => emptyDraft(today))
  const [deleteTarget, setDeleteTarget] = useState<FamilyMemoryEntry | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeFamilyMemories(user.id, setMemories)
  }, [user])

  const monthKey = `${calYear}-${String(calMonth).padStart(2, '0')}`
  const markedDates = useMemo(() => new Set(memories.filter((m) => m.date.startsWith(monthKey)).map((m) => m.date)), [memories, monthKey])
  const dayMemories = useMemo(() => memories.filter((m) => m.date === selectedDate), [memories, selectedDate])

  if (!user) return null

  function openCreateForm() {
    setEditingId(null)
    setDraft(emptyDraft(today))
    setFormOpen(true)
  }

  function openEditForm(memory: FamilyMemoryEntry) {
    setEditingId(memory.id)
    setDraft({ date: memory.date, title: memory.title, description: memory.description, emoji: memory.emoji, tag: memory.tag })
    setFormOpen(true)
  }

  async function submitForm() {
    if (!user || !draft.title.trim()) return
    if (editingId) {
      await updateFamilyMemory(user.id, editingId, draft)
    } else {
      const result = await createFamilyMemory(user.id, draft)
      if (result.ok) {
        // "Created" is the completion event, regardless of which date the memory itself
        // is about — this is what happened TODAY. Idempotent: creating several memories in
        // one day still only ever grants the day's +5 once (see awardDailyMission's ledger).
        const rewardResult = await awardDailyMission(user.id, 'shared_memory', today)
        notifyRewardResult(rewardResult, { icon: '📸', label: 'ความทรงจำของเรา' })
        if (rewardResult.granted) {
          void recordActivity('sharedMemoryCreated')
          void completeActivity('family-memory')
        }
      }
    }
    setFormOpen(false)
  }

  async function confirmDelete() {
    if (!user || !deleteTarget) return
    await deleteFamilyMemory(user.id, deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div>
      <PageHeader
        title="📸 ความทรงจำของเรา"
        subtitle="เก็บช่วงเวลาดี ๆ เอาไว้กลับมาเปิดดูอีกครั้ง"
        action={
          <button
            type="button"
            onClick={() => setView(view === 'timeline' ? 'calendar' : 'timeline')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-card text-sm text-ink-soft"
            aria-label={view === 'timeline' ? 'มุมมองปฏิทิน' : 'มุมมองไทม์ไลน์'}
          >
            {view === 'timeline' ? '🗓️' : '📜'}
          </button>
        }
      />

      <div className="flex flex-col gap-4 px-5 pb-6">
        <Button fullWidth onClick={openCreateForm}>
          + เพิ่มความทรงจำ
        </Button>

        {view === 'calendar' ? (
          <>
            <Card>
              <MonthCalendar
                year={calYear}
                month={calMonth}
                todayDate={today}
                selectedDate={selectedDate}
                markedDates={markedDates}
                onSelectDate={setSelectedDate}
                onChangeMonth={(y, m) => {
                  setCalYear(y)
                  setCalMonth(m)
                }}
              />
            </Card>
            <p className="text-sm font-semibold text-ink">{formatThaiDate(selectedDate)}</p>
            {dayMemories.length === 0 ? (
              <p className="text-sm text-ink-faint">ยังไม่มีความทรงจำในวันนี้</p>
            ) : (
              dayMemories.map((m) => (
                <MemoryCard key={m.id} memory={m} onEdit={() => openEditForm(m)} onDelete={() => setDeleteTarget(m)} />
              ))
            )}
          </>
        ) : memories.length === 0 ? (
          <Card className="text-center">
            <p className="text-3xl" aria-hidden>
              📸
            </p>
            <p className="mt-2 text-sm text-ink-soft">ยังไม่มีความทรงจำ ลองเพิ่มความทรงจำแรกของคุณดูสิ</p>
          </Card>
        ) : (
          memories.map((m) => (
            <MemoryCard key={m.id} memory={m} onEdit={() => openEditForm(m)} onDelete={() => setDeleteTarget(m)} />
          ))
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <h2 className="text-lg font-bold text-ink">{editingId ? 'แก้ไขความทรงจำ' : 'เพิ่มความทรงจำใหม่'}</h2>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">วันที่</span>
          <input
            type="date"
            value={draft.date}
            max={today}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            className="rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">ชื่อความทรงจำ</span>
          <input
            type="text"
            value={draft.title}
            maxLength={MAX_MEMORY_TITLE_LENGTH}
            placeholder="เช่น วันนี้กินข้าวพร้อมหน้ากัน"
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">รายละเอียดสั้น ๆ (ไม่บังคับ)</span>
          <textarea
            value={draft.description}
            maxLength={MAX_MEMORY_DESCRIPTION_LENGTH}
            rows={3}
            placeholder="เล่าเรื่องราวสั้น ๆ..."
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className="resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
          />
        </label>

        <p className="mt-3 text-sm font-semibold text-ink">อีโมจิ</p>
        <div className="mt-1.5 grid grid-cols-8 gap-1.5">
          {FAMILY_MEMORY_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, emoji }))}
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition ${
                draft.emoji === emoji ? 'bg-lavender-200' : 'bg-lavender-50'
              }`}
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">แท็ก (ไม่บังคับ)</span>
          <input
            type="text"
            value={draft.tag}
            maxLength={MAX_FAMILY_MEMORY_TAG_LENGTH}
            placeholder="เช่น ครอบครัว"
            onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))}
            className="rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-[15px] outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FAMILY_MEMORY_TAG_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, tag }))}
              className="rounded-full bg-lavender-50 px-3 py-1 text-xs font-medium text-lavender-600"
            >
              {tag}
            </button>
          ))}
        </div>

        <Button fullWidth className="mt-5" onClick={submitForm} disabled={!draft.title.trim()}>
          {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มความทรงจำ'}
        </Button>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h2 className="text-lg font-bold text-ink">ลบความทรงจำนี้?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          "{deleteTarget?.title}" จะถูกลบออกอย่างถาวรและไม่สามารถกู้คืนได้
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button fullWidth variant="soft-pink" onClick={confirmDelete}>
            ลบความทรงจำ
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setDeleteTarget(null)}>
            ยกเลิก
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function MemoryCard({ memory, onEdit, onDelete }: { memory: FamilyMemoryEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="bg-gradient-to-br from-mint/30 to-white">
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden>
          {memory.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{memory.title}</p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {formatThaiDate(memory.date)}
            {memory.tag ? ` · ${memory.tag}` : ''}
          </p>
          {memory.description ? <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{memory.description}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onEdit}>
          แก้ไข
        </Button>
        <Button variant="ghost" className="flex-1" onClick={onDelete}>
          ลบ
        </Button>
      </div>
    </Card>
  )
}
