/**
 * "Today" for the whole daily check-in/points/mission system is always Bangkok-local
 * (Asia/Bangkok, UTC+7, no DST) regardless of the device's own timezone or clock — so a
 * student traveling, or simply with a misconfigured device clock, still gets exactly one
 * check-in per real Thailand calendar day, consistent across every device they log in on.
 * This is deliberately computed fresh from the current time on every call rather than
 * cached — the source of truth for "was today's check-in done" is the server-stored
 * `lastCheckinDate` field (see rewardsService.ts), never localStorage.
 */
const BANGKOK_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Returns the Bangkok-local calendar date as YYYY-MM-DD (en-CA locale formats exactly this way). */
export function getBangkokDateString(date: Date = new Date()): string {
  return BANGKOK_DATE_FORMATTER.format(date)
}

/** The YYYY-MM-DD immediately before the given YYYY-MM-DD, for streak continuity checks. */
export function getPreviousDateString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Noon UTC avoids any DST/rounding edge case tipping the date the wrong way.
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

/** The 7 most recent Bangkok calendar dates ending today, oldest first — used for the weekly view. */
export function getLastNDateStrings(n: number, today: string = getBangkokDateString()): string[] {
  const dates = [today]
  for (let i = 1; i < n; i++) dates.unshift(getPreviousDateString(dates[0]))
  return dates
}

/** Thai weekday abbreviations, indexed like JS Date#getDay() (0 = Sunday). */
export const THAI_WEEKDAY_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

/** Day-of-week (0 = Sunday, matching THAI_WEEKDAY_ABBR) for a YYYY-MM-DD Bangkok date string. */
export function getWeekdayIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}
