/** Curated emoji set for "ความทรงจำของเรา" (Family Memory) — one required per memory, from
 * this fixed list only, so firestore.rules can validate it with `in [...]`. Keep this array
 * and the matching list literal in firestore.rules' familyMemories rule in sync. */
export const FAMILY_MEMORY_EMOJIS: string[] = [
  '🍚', '🏠', '👨‍👩‍👧‍👦', '🎂', '🚗', '📚', '☀️', '🌙', '🎉', '🧸', '🐶', '🎵', '❤️', '😊', '🌳', '🎈',
]

export const DEFAULT_FAMILY_MEMORY_EMOJI = FAMILY_MEMORY_EMOJIS[0]

/** Short suggestion chips for the optional free-text tag — not an enforced enum (the field
 * stays a short free string in firestore.rules), just a quick-tap starting point. */
export const FAMILY_MEMORY_TAG_SUGGESTIONS: string[] = ['ครอบครัว', 'เพื่อน', 'พี่น้อง', 'คุณยาย/คุณตา', 'พ่อแม่', 'ทั่วไป']

export const MAX_FAMILY_MEMORY_TAG_LENGTH = 30
