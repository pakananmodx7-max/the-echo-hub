import { Card } from '../../../../../components/Card'
import { Button } from '../../../../../components/Button'
import { CATEGORY_GROUPS, allSubcategoryIds, countBySubcategory } from '../../../../../features/friendBond/whoAmI/data'
import type { MusicGuessMode } from '../../../../../features/friendBond/whoAmI/types'

interface CategorySelectStepProps {
  selected: string[]
  onChange: (ids: string[]) => void
  musicMode: MusicGuessMode
  onMusicModeChange: (mode: MusicGuessMode) => void
  onContinue: () => void
}

export function CategorySelectStep({ selected, onChange, musicMode, onMusicModeChange, onContinue }: CategorySelectStepProps) {
  const selectedSet = new Set(selected)

  function toggle(id: string) {
    onChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  function selectAllInGroup(groupIds: string[]) {
    const allSelected = groupIds.every((id) => selectedSet.has(id))
    if (allSelected) {
      onChange(selected.filter((s) => !groupIds.includes(s)))
    } else {
      onChange([...new Set([...selected, ...groupIds])])
    }
  }

  function selectMixAll() {
    onChange(allSubcategoryIds())
  }

  const musicSelected = CATEGORY_GROUPS.find((g) => g.id === 'music')?.subcategories.some((s) => selectedSet.has(s.id))

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <Card className="text-center">
        <p className="text-3xl" aria-hidden>
          ☑️
        </p>
        <p className="mt-2 font-semibold text-ink">เลือกหมวดที่อยากเล่น</p>
        <p className="mt-1 text-sm text-ink-soft">เลือกได้หลายหมวด ระบบจะรวมคำจากทุกหมวดที่เลือก</p>
      </Card>

      <button
        type="button"
        onClick={selectMixAll}
        className="rounded-3xl bg-gradient-to-br from-lavender-400 to-pink-deep p-4 text-center font-semibold text-white shadow-soft active:scale-[0.98]"
      >
        🎲 มั่วหมด! (สุ่มจากทุกหมวด)
      </button>

      {CATEGORY_GROUPS.map((group) => {
        const groupIds = group.subcategories.map((s) => s.id)
        const allOn = groupIds.every((id) => selectedSet.has(id))
        return (
          <Card key={group.id}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">
                <span aria-hidden>{group.emoji}</span> {group.label}
              </p>
              {group.subcategories.length > 1 ? (
                <button type="button" onClick={() => selectAllInGroup(groupIds)} className="text-xs font-semibold text-lavender-600">
                  {allOn ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.subcategories.map((sub) => {
                const on = selectedSet.has(sub.id)
                const count = countBySubcategory(sub.id)
                return (
                  <button
                    key={sub.id}
                    type="button"
                    disabled={count === 0}
                    onClick={() => toggle(sub.id)}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-40 ${
                      on ? 'bg-lavender-500 text-white' : 'bg-cream-deep text-ink-soft'
                    }`}
                  >
                    {on ? '☑️' : '☐'} {sub.emoji} {sub.label}
                    {count === 0 ? ' (เร็ว ๆ นี้)' : ''}
                  </button>
                )
              })}
            </div>
          </Card>
        )
      })}

      {musicSelected ? (
        <Card>
          <p className="text-sm font-semibold text-ink">🎵 โหมดทายเพลง</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onMusicModeChange('title')}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                musicMode === 'title' ? 'bg-lavender-500 text-white' : 'bg-cream-deep text-ink-soft'
              }`}
            >
              🎵 ทายชื่อเพลง
            </button>
            <button
              type="button"
              onClick={() => onMusicModeChange('artist')}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                musicMode === 'artist' ? 'bg-lavender-500 text-white' : 'bg-cream-deep text-ink-soft'
              }`}
            >
              🎤 ทายศิลปิน
            </button>
          </div>
        </Card>
      ) : null}

      <Button fullWidth disabled={selected.length === 0} onClick={onContinue}>
        ต่อไป
      </Button>
      {selected.length === 0 ? <p className="text-center text-xs text-ink-faint">เลือกอย่างน้อยหนึ่งหมวดก่อนไปต่อ</p> : null}
    </div>
  )
}
