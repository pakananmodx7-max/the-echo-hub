import { WEEKDAY_ABBR_MON_FIRST, getMonthGrid, isFutureMonth, shiftMonth } from '../lib/calendarMath'

interface MonthCalendarProps {
  year: number
  month: number
  todayDate: string
  selectedDate: string
  /** Dates (YYYY-MM-DD) that should show a small dot indicator. */
  markedDates: Set<string>
  onSelectDate: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
  /** Color overrides — default to the app's normal light/dark-aware tokens; Daily Journal
   * passes its own `.journal-scope` CSS variables instead so the calendar reads correctly
   * inside its independent paper-color theme. */
  textColor?: string
  textSoftColor?: string
  accentColor?: string
}

/**
 * Reusable Monday-first month calendar grid — shared by Daily Journal and Family Memory's
 * calendar views (both "which days have an entry" browsers). Purely presentational: date
 * math lives in lib/calendarMath.ts, data comes from the caller via `markedDates`.
 */
export function MonthCalendar({
  year,
  month,
  todayDate,
  selectedDate,
  markedDates,
  onSelectDate,
  onChangeMonth,
  textColor = 'var(--color-ink)',
  textSoftColor = 'var(--color-ink-soft)',
  accentColor = 'var(--color-lavender-500)',
}: MonthCalendarProps) {
  const grid = getMonthGrid(year, month)
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const nextMonth = shiftMonth(year, month, 1)
  const nextDisabled = isFutureMonth(nextMonth.year, nextMonth.month, todayDate)

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="เดือนก่อนหน้า"
          onClick={() => {
            const prev = shiftMonth(year, month, -1)
            onChangeMonth(prev.year, prev.month)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
          style={{ color: textSoftColor }}
        >
          ‹
        </button>
        <p className="text-sm font-semibold" style={{ color: textColor }}>
          {monthLabel}
        </p>
        <button
          type="button"
          aria-label="เดือนถัดไป"
          disabled={nextDisabled}
          onClick={() => {
            const next = shiftMonth(year, month, 1)
            onChangeMonth(next.year, next.month)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-30"
          style={{ color: textSoftColor }}
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium" style={{ color: textSoftColor }}>
        {WEEKDAY_ABBR_MON_FIRST.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-1">
        {grid.map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {row.map((date, j) => {
              if (!date) return <span key={j} />
              const day = Number(date.slice(-2))
              const isToday = date === todayDate
              const isSelected = date === selectedDate
              const isFuture = date > todayDate
              const isMarked = markedDates.has(date)
              return (
                <button
                  key={date}
                  type="button"
                  disabled={isFuture}
                  onClick={() => onSelectDate(date)}
                  className="relative flex aspect-square items-center justify-center rounded-xl text-sm transition disabled:opacity-30"
                  style={{
                    background: isSelected ? accentColor : isToday ? `color-mix(in srgb, ${accentColor} 20%, transparent)` : 'transparent',
                    color: isSelected ? '#fff' : textColor,
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}
                >
                  {day}
                  {isMarked ? (
                    <span
                      aria-hidden
                      className="absolute bottom-0.5 h-1 w-1 rounded-full"
                      style={{ background: isSelected ? '#fff' : accentColor }}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
