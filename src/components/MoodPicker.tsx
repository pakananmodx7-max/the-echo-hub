import { MOODS } from '../data/moods'
import type { MoodId } from '../types'

interface MoodPickerProps {
  selected: MoodId | null
  onSelect: (mood: MoodId) => void
}

export function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      {MOODS.map((mood) => {
        const isSelected = selected === mood.id
        return (
          <button
            key={mood.id}
            type="button"
            onClick={() => onSelect(mood.id)}
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition ${
              isSelected
                ? 'border-lavender-400 bg-lavender-50 animate-pop-select'
                : 'border-transparent bg-white shadow-card hover:border-lavender-100'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {mood.emoji}
            </span>
            <span className="text-[15px] font-medium text-ink">{mood.label}</span>
          </button>
        )
      })}
    </div>
  )
}
