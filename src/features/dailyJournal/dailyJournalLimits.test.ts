import { describe, expect, it } from 'vitest'
import { MAX_JOURNAL_CONTENT_LENGTH, isMeaningfulJournalEntry } from './dailyJournalLimits'

describe('isMeaningfulJournalEntry', () => {
  it('rejects empty and whitespace-only content', () => {
    expect(isMeaningfulJournalEntry('')).toBe(false)
    expect(isMeaningfulJournalEntry('    ')).toBe(false)
    expect(isMeaningfulJournalEntry('\n\n  \t')).toBe(false)
  })

  it('rejects a too-short draft, even with a real word', () => {
    expect(isMeaningfulJournalEntry('hi')).toBe(false)
  })

  it('rejects emoji/punctuation-only content of any length', () => {
    expect(isMeaningfulJournalEntry('🤍🌷⭐🌙☁️🌿🦋✨')).toBe(false)
    expect(isMeaningfulJournalEntry('!!!...???---')).toBe(false)
  })

  it('accepts real written Thai content', () => {
    expect(isMeaningfulJournalEntry('วันนี้เป็นวันที่ดีมาก')).toBe(true)
  })

  it('accepts real written English content', () => {
    expect(isMeaningfulJournalEntry('today was a good day')).toBe(true)
  })

  it('accepts mixed Thai/English/emoji content as long as it has real letters', () => {
    expect(isMeaningfulJournalEntry('today ดีมาก 🤍')).toBe(true)
  })

  it('trims surrounding whitespace before judging length', () => {
    expect(isMeaningfulJournalEntry('   hello   ')).toBe(true)
    expect(isMeaningfulJournalEntry('   hi   ')).toBe(false)
  })

  it('MAX_JOURNAL_CONTENT_LENGTH matches the firestore.rules content.size() limit (20000)', () => {
    expect(MAX_JOURNAL_CONTENT_LENGTH).toBe(20000)
  })
})
