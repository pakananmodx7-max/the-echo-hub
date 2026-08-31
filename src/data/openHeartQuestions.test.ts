import { describe, expect, it } from 'vitest'
import { OPEN_HEART_CATEGORY_LABELS, OPEN_HEART_QUESTIONS, getOpenHeartQuestionById } from './openHeartQuestions'

describe('OPEN_HEART_QUESTIONS', () => {
  it('has at least 100 curated questions (spec)', () => {
    expect(OPEN_HEART_QUESTIONS.length).toBeGreaterThanOrEqual(100)
  })

  it('has no duplicate ids', () => {
    const ids = OPEN_HEART_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has no duplicate question text', () => {
    const texts = OPEN_HEART_QUESTIONS.map((q) => q.text)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('covers every one of the 7 spec categories with at least a handful of questions each', () => {
    const categories = Object.keys(OPEN_HEART_CATEGORY_LABELS)
    expect(categories).toHaveLength(7)
    for (const category of categories) {
      const count = OPEN_HEART_QUESTIONS.filter((q) => q.category === category).length
      expect(count).toBeGreaterThanOrEqual(10)
    }
  })

  it('every question belongs to a labeled category', () => {
    for (const q of OPEN_HEART_QUESTIONS) {
      expect(OPEN_HEART_CATEGORY_LABELS[q.category]).toBeTruthy()
    }
  })
})

describe('getOpenHeartQuestionById', () => {
  it('finds a known question by id', () => {
    const first = OPEN_HEART_QUESTIONS[0]
    expect(getOpenHeartQuestionById(first.id)).toEqual(first)
  })

  it('returns undefined for an unknown id', () => {
    expect(getOpenHeartQuestionById('does-not-exist')).toBeUndefined()
  })
})
