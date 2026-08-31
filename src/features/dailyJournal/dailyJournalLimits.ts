/** Max characters for one Daily Journal entry — mirrored exactly in firestore.rules'
 * dailyJournal content.size() check, so a client-side "too long" state and the server's
 * actual write rule can never disagree. */
export const MAX_JOURNAL_CONTENT_LENGTH = 20000

const MIN_MEANINGFUL_LENGTH = 5

/**
 * True when the trimmed entry reads as actual written content — not empty, not just
 * whitespace, and not emoji/punctuation-only (at least one letter or digit in any language
 * must be present). This is the client-side gate for "first MEANINGFUL journal save of the
 * day" (ECHO Points + the daily mission + analytics) — a one- or two-character autosave
 * draft must never trigger any of those, only opening the page never does either.
 */
export function isMeaningfulJournalEntry(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < MIN_MEANINGFUL_LENGTH) return false
  return /[\p{L}\p{N}]/u.test(trimmed)
}
