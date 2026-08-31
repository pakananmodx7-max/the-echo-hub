/** Monday-first weekday header for the journal calendar grid — deliberately separate from
 * thailandDate.ts's THAI_WEEKDAY_ABBR (Sunday-first, matching JS Date#getDay(), and already
 * used elsewhere) since the calendar mock in the spec ("จ อ พ พฤ ศ ส อา") starts on Monday. */
export const JOURNAL_WEEKDAY_ABBR_MON_FIRST = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** YYYY-MM-DD for a given Gregorian year/month(1-12)/day, no timezone ambiguity (pure string math). */
export function dateStringFor(year: number, month1to12: number, day: number): string {
  return `${year}-${pad2(month1to12)}-${pad2(day)}`
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate()
}

/** 0 (Monday) .. 6 (Sunday) for the 1st of the given Gregorian year/month. */
function firstWeekdayMondayFirst(year: number, month1to12: number): number {
  const jsDay = new Date(Date.UTC(year, month1to12 - 1, 1)).getUTCDay() // 0=Sunday..6=Saturday
  return (jsDay + 6) % 7
}

/**
 * The calendar grid for a Gregorian year/month as rows of 7 (Monday-first), padded with
 * `null` before day 1 and after the last day so every row has exactly 7 cells — ready to
 * `.map()` straight into a 7-column grid. Each non-null cell is that day's YYYY-MM-DD.
 */
export function getMonthGrid(year: number, month1to12: number): (string | null)[][] {
  const total = daysInMonth(year, month1to12)
  const leadingBlanks = firstWeekdayMondayFirst(year, month1to12)
  const cells: (string | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: total }, (_, i) => dateStringFor(year, month1to12, i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

/** The previous/next Gregorian (year, month) pair, wrapping across a year boundary. */
export function shiftMonth(year: number, month1to12: number, delta: -1 | 1): { year: number; month: number } {
  const zeroBased = month1to12 - 1 + delta
  const year2 = year + Math.floor(zeroBased / 12)
  const month2 = ((zeroBased % 12) + 12) % 12
  return { year: year2, month: month2 + 1 }
}

/** True when (year, month) is strictly after today's Bangkok (year, month) — used to disable
 * navigating the calendar into a future month a journal entry could never exist in. */
export function isFutureMonth(year: number, month1to12: number, todayDateStr: string): boolean {
  const [ty, tm] = todayDateStr.split('-').map(Number)
  return year > ty || (year === ty && month1to12 > tm)
}
