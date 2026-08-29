export const MIN_REFLECTION_LENGTH = 5
export const MAX_REFLECTION_LENGTH = 500

/**
 * True when the trimmed reflection reads as actual written content — not empty, not just
 * whitespace, not too long, and not emoji/punctuation-only (at least one letter or digit in
 * any language must be present). Deliberately gentle: no profanity/format checks, just
 * "did you write something in your own words."
 */
export function isMeaningfulReflection(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < MIN_REFLECTION_LENGTH || trimmed.length > MAX_REFLECTION_LENGTH) return false
  return /[\p{L}\p{N}]/u.test(trimmed)
}
