import { describe, expect, it } from 'vitest'
import { KNOW_ME_BETTER_FEEDBACK, KNOW_ME_BETTER_FOLLOW_UPS, KNOW_ME_BETTER_QUESTIONS } from './knowMeBetterQuestions'

describe('KNOW_ME_BETTER_QUESTIONS', () => {
  it('has at least 50 curated questions (spec: 50-100)', () => {
    expect(KNOW_ME_BETTER_QUESTIONS.length).toBeGreaterThanOrEqual(50)
  })

  it('has no more than 100 (spec range)', () => {
    expect(KNOW_ME_BETTER_QUESTIONS.length).toBeLessThanOrEqual(100)
  })

  it('has no duplicate ids', () => {
    const ids = KNOW_ME_BETTER_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no duplicate question text', () => {
    const texts = KNOW_ME_BETTER_QUESTIONS.map((q) => q.text)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('every question ends with a question mark', () => {
    for (const q of KNOW_ME_BETTER_QUESTIONS) expect(q.text.trim().endsWith('?')).toBe(true)
  })
})

describe('KNOW_ME_BETTER_FEEDBACK / KNOW_ME_BETTER_FOLLOW_UPS', () => {
  it('are non-empty pools', () => {
    expect(KNOW_ME_BETTER_FEEDBACK.length).toBeGreaterThan(0)
    expect(KNOW_ME_BETTER_FOLLOW_UPS.length).toBeGreaterThan(0)
  })

  it('never contains a numeric score or harsh/judgmental wording', () => {
    for (const line of KNOW_ME_BETTER_FEEDBACK) {
      expect(line).not.toMatch(/\d+\s*\/\s*\d+|แพ้|โง่|ไม่รู้จัก/)
    }
  })
})
