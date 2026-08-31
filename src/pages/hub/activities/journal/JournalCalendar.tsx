import {
  JOURNAL_WEEKDAY_ABBR_MON_FIRST,
  getMonthGrid,
  isFutureMonth,
  shiftMonth,
} from '../../../../features/dailyJournal/journalCalendarMath'

interface JournalCalendarProps {
  year: number
  month: number
  todayDate: string
  selectedDate: string
  entryDates: Set<string>
  onSelectDate: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
}

export function JournalCalendar({
  year,
  month,
  todayDate,
  selectedDate,
  entryDates,
  onSelectDate,
  onChangeMonth,
}: JournalCalendarProps) {
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
          style={{ color: 'var(--journal-text-soft)' }}
        >
          ‹
        </button>
        <p className="text-sm font-semibold" style={{ color: 'var(--journal-text)' }}>
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
          style={{ color: 'var(--journal-text-soft)' }}
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium" style={{ color: 'var(--journal-text-soft)' }}>
        {JOURNAL_WEEKDAY_ABBR_MON_FIRST.map((d) => (
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
              const hasEntry = entryDates.has(date)
              return (
                <button
                  key={date}
                  type="button"
                  disabled={isFuture}
                  onClick={() => onSelectDate(date)}
                  className="relative flex aspect-square items-center justify-center rounded-xl text-sm transition disabled:opacity-30"
                  style={{
                    background: isSelected ? 'var(--journal-accent)' : isToday ? 'color-mix(in srgb, var(--journal-accent) 20%, transparent)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--journal-text)',
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}
                >
                  {day}
                  {hasEntry ? (
                    <span
                      aria-hidden
                      className="absolute bottom-0.5 h-1 w-1 rounded-full"
                      style={{ background: isSelected ? '#fff' : 'var(--journal-accent)' }}
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
