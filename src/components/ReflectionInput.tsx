import { MAX_REFLECTION_LENGTH } from '../lib/reflection'

interface ReflectionInputProps {
  title: string
  prompt: string
  placeholder: string
  helper?: string
  value: string
  onChange: (value: string) => void
  /** Shown only when the student tried to submit before writing anything meaningful. */
  showHint?: boolean
}

/**
 * A short, private "what would you say or do?" reflection field used before a Hear with
 * Heart / Friend Bond mission can be marked complete. Never persisted or shown to anyone
 * else — it exists purely to make the student pause and put the mission into their own
 * words before submitting (see RandomMissionCard and SendSongPage).
 */
export function ReflectionInput({ title, prompt, placeholder, helper, value, onChange, showHint }: ReflectionInputProps) {
  return (
    <div className="mt-5 rounded-2xl bg-lavender-50/70 p-4 text-left">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{prompt}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_REFLECTION_LENGTH}
        placeholder={placeholder}
        rows={3}
        className="mt-3 w-full resize-none rounded-2xl border border-lavender-100 bg-white px-4 py-3 text-base leading-relaxed text-ink outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-100"
      />
      {helper ? <p className="mt-1.5 text-xs text-ink-faint">{helper}</p> : null}
      {showHint ? <p className="mt-1.5 text-xs font-medium text-pink-text">ลองเขียนสิ่งที่คุณจะพูดหรือทำก่อนนะ 💜</p> : null}
    </div>
  )
}
