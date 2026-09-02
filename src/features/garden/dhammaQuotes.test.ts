import { describe, expect, it } from 'vitest'
import {
  BELL_QUOTES,
  BENCH_QUOTES,
  BOARD_QUOTES,
  DHAMMA_QUOTES,
  PASSIVE_ZONE_QUOTES,
  SIGN_QUOTES,
  TREE_OF_GOODNESS_QUOTES,
  getDailyBellQuote,
  randomFrom,
} from './dhammaQuotes'

describe('DHAMMA_QUOTES dataset', () => {
  it('has 27 entries with unique ids', () => {
    expect(DHAMMA_QUOTES).toHaveLength(27)
    expect(new Set(DHAMMA_QUOTES.map((q) => q.id)).size).toBe(27)
  })

  it('never labels a quote as canonical scripture', () => {
    for (const q of DHAMMA_QUOTES) {
      expect(['ข้อคิดเตือนใจ', 'ธรรมะเพื่อการใช้ชีวิต']).toContain(q.title)
      expect(q.sourceType).toBe('reflection')
    }
  })

  it('gives every physical sign a fixed position', () => {
    for (const q of DHAMMA_QUOTES.filter((q) => q.placement === 'sign')) {
      expect(q.position).toBeDefined()
    }
  })
})

describe('surface groupings', () => {
  it('SIGN_QUOTES stays within the spec target of 12-18 physical signs', () => {
    expect(SIGN_QUOTES.length).toBeGreaterThanOrEqual(12)
    expect(SIGN_QUOTES.length).toBeLessThanOrEqual(18)
  })

  it('BOARD_QUOTES has at least one entry for the rotating board', () => {
    expect(BOARD_QUOTES.length).toBeGreaterThan(0)
  })

  it('PASSIVE_ZONE_QUOTES keys are distinct zones, one quote each', () => {
    const zones = Object.keys(PASSIVE_ZONE_QUOTES)
    expect(new Set(zones).size).toBe(zones.length)
    expect(zones.length).toBeGreaterThan(0)
  })

  it('BELL_QUOTES / BENCH_QUOTES / TREE_OF_GOODNESS_QUOTES are all non-empty', () => {
    expect(BELL_QUOTES.length).toBeGreaterThan(0)
    expect(BENCH_QUOTES.length).toBeGreaterThan(0)
    expect(TREE_OF_GOODNESS_QUOTES.length).toBeGreaterThan(0)
  })
})

describe('getDailyBellQuote', () => {
  it('is deterministic for the same date string', () => {
    expect(getDailyBellQuote('2026-09-02')).toBe(getDailyBellQuote('2026-09-02'))
  })

  it('always returns a quote from BELL_QUOTES', () => {
    const dates = ['2026-01-01', '2026-02-14', '2026-09-02', '2026-12-31']
    for (const d of dates) {
      expect(BELL_QUOTES).toContain(getDailyBellQuote(d))
    }
  })

  it('varies across at least some distinct dates', () => {
    const dates = Array.from({ length: 30 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)
    const seen = new Set(dates.map((d) => getDailyBellQuote(d).id))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('randomFrom', () => {
  it('returns the only item for a single-item list', () => {
    expect(randomFrom(['only'])).toBe('only')
  })

  it('always returns an item from the list', () => {
    const list = ['a', 'b', 'c']
    for (let i = 0; i < 20; i++) {
      expect(list).toContain(randomFrom(list))
    }
  })

  it('tends to avoid the given item when the list has alternatives', () => {
    const list = ['a', 'b']
    const results = Array.from({ length: 20 }, () => randomFrom(list, 'a'))
    expect(results).toContain('b')
  })
})
