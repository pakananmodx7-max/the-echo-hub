/** Curated built-in sticker set for Daily Journal decoration — a fixed, app-controlled list
 * (never arbitrary text/emoji), so firestore.rules can validate a saved entry's `stickers`
 * against this exact set with `hasOnly(...)`. Keep this array and the matching list literal
 * in firestore.rules' dailyJournal rule in sync if it ever changes. */
export const JOURNAL_STICKERS: string[] = ['🤍', '🌷', '⭐', '🌙', '☁️', '🌿', '🦋', '✨', '🫶', '🎧', '📚', '☕', '🌧️', '🌈']

/** How many stickers a single entry may carry — enough to decorate without becoming a
 * full design editor; mirrored in firestore.rules' stickers.size() check. */
export const MAX_JOURNAL_STICKERS = 6
