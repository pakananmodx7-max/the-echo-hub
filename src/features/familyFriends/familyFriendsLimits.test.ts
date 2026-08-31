import { describe, expect, it } from 'vitest'
import {
  MAX_MEMORY_DESCRIPTION_LENGTH,
  MAX_MEMORY_TITLE_LENGTH,
  MAX_OPEN_HEART_ANSWER_LENGTH,
  isMeaningfulText,
} from './familyFriendsLimits'

describe('isMeaningfulText', () => {
  it('rejects empty, whitespace-only, and too-short content', () => {
    expect(isMeaningfulText('')).toBe(false)
    expect(isMeaningfulText('   ')).toBe(false)
    expect(isMeaningfulText('hi')).toBe(false)
  })

  it('rejects emoji/punctuation-only content', () => {
    expect(isMeaningfulText('🤍🌷⭐🌙☁️')).toBe(false)
  })

  it('accepts real written Thai or English content', () => {
    expect(isMeaningfulText('วันนี้เป็นวันที่ดี')).toBe(true)
    expect(isMeaningfulText('today was good')).toBe(true)
  })
})

describe('limit constants', () => {
  it('match the firestore.rules size() checks (openHeartAnswers.answer <= 5000)', () => {
    expect(MAX_OPEN_HEART_ANSWER_LENGTH).toBe(5000)
  })

  it('match the firestore.rules size() checks (familyMemories.title <= 100, description <= 1000)', () => {
    expect(MAX_MEMORY_TITLE_LENGTH).toBe(100)
    expect(MAX_MEMORY_DESCRIPTION_LENGTH).toBe(1000)
  })
})
