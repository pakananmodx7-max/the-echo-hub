/** Short Thai relative-time label for notification/message timestamps. */
export function formatRelativeTime(ms: number | null): string {
  if (ms === null) return 'เมื่อสักครู่'
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (diffSec < 60) return 'เมื่อสักครู่'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} วันที่แล้ว`
}
