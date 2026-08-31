/** Max characters for one Open Heart Question answer — a single-prompt response, so smaller
 * than Daily Journal's full-entry limit, but still generous enough for "short or long"
 * per spec. Mirrored in firestore.rules' openHeartAnswers content.size() check. */
export const MAX_OPEN_HEART_ANSWER_LENGTH = 5000

/** Max characters for a Family Memory's title / short description — mirrored in
 * firestore.rules' familyMemories title/description size() checks. */
export const MAX_MEMORY_TITLE_LENGTH = 100
export const MAX_MEMORY_DESCRIPTION_LENGTH = 1000

const MIN_MEANINGFUL_LENGTH = 5

/**
 * True when the trimmed text reads as actual written content — not empty, not just
 * whitespace, and not emoji/punctuation-only (at least one letter or digit in any language
 * must be present). Shared by the Open Heart answer autosave gate and the Family Memory
 * "meaningful title" gate for awarding a daily mission — never a bare page view or an
 * empty/near-empty draft.
 */
export function isMeaningfulText(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < MIN_MEANINGFUL_LENGTH) return false
  return /[\p{L}\p{N}]/u.test(trimmed)
}
