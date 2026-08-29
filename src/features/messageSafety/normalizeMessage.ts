/**
 * Turns a raw chat draft into two working copies used only for safety *checking* — the
 * text the user actually typed is never modified or replaced anywhere in the app.
 *
 * - `standard`: Unicode-normalized, invisible/zero-width characters stripped, whitespace
 *   collapsed, Latin letters lowercased. Good for matching multi-word phrase/contextual
 *   patterns, where real spacing between words still matters.
 * - `compact`: `standard` with all whitespace and common "separator" punctuation removed,
 *   plus runs of 3+ identical characters collapsed to one. This is what exact-term
 *   substring matching runs against, so common evasion still gets caught:
 *     ค ำ ห ย า บ   -> คำหยาบ
 *     ค.ำ.ห.ย.า.บ    -> คำหยาบ
 *     ค-ำ-ห-ย-า-บ    -> คำหยาบ
 *     โงงงง่ๆๆๆ      -> โง่ (repeats collapsed)
 */

export interface NormalizedMessage {
  original: string
  standard: string
  compact: string
}

// Zero-width space/joiners, bidi control marks, BOM — invisible characters sometimes
// inserted between letters specifically to dodge substring filters.
const ZERO_WIDTH_RE = /[​-‏‪-‮⁠﻿]/g

// Whitespace and punctuation commonly used as an inserted separator between letters to
// dodge a filter — deliberately does NOT include Thai tone/vowel marks or ๆ, which are
// part of real words and already tolerated by substring ("includes") matching anyway.
const SEPARATOR_RE = /[\s.\-_*~^`"'“”‘’·•=+|:;,!?()[\]{}<>/\\@#$%&]+/g

/** Collapses a run of 3+ identical characters down to one (keeps doubled letters, which
 * are common in normal spelling — only "ลากเสียง" style elongation gets flattened). */
function collapseElongation(text: string): string {
  return text.replace(/(.)\1{2,}/gu, '$1')
}

export function normalizeMessage(text: string): NormalizedMessage {
  const original = text
  const cleaned = text.normalize('NFC').replace(ZERO_WIDTH_RE, '')
  const standard = cleaned.replace(/\s+/g, ' ').trim().toLowerCase()
  const compact = collapseElongation(standard.replace(SEPARATOR_RE, ''))
  return { original, standard, compact }
}

/** Same pipeline applied to a short rule term, so a term like "ไป ตาย" (if ever authored
 * with a space) still compares correctly against a fully-compacted message. */
export function normalizeTermForCompactMatch(term: string): string {
  return collapseElongation(term.normalize('NFC').toLowerCase().replace(SEPARATOR_RE, ''))
}
