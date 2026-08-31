import { describe, expect, it } from 'vitest'
import { dateStringFor, getMonthGrid, isFutureMonth, shiftMonth } from './calendarMath'

describe('getMonthGrid', () => {
  it('produces rows of exactly 7 cells', () => {
    const grid = getMonthGrid(2026, 8)
    for (const row of grid) expect(row).toHaveLength(7)
  })

  it('includes every day of the month exactly once, in order', () => {
    const grid = getMonthGrid(2026, 8) // August 2026 has 31 days
    const days = grid.flat().filter((d): d is string => d !== null)
    expect(days).toHaveLength(31)
    expect(days[0]).toBe('2026-08-01')
    expect(days[days.length - 1]).toBe('2026-08-31')
  })

  it('pads the first row so the 1st lands on its real Monday-first weekday', () => {
    // 2026-08-01 is a Saturday -> Monday-first index 5 -> 5 leading blanks.
    const grid = getMonthGrid(2026, 8)
    expect(grid[0].slice(0, 5)).toEqual([null, null, null, null, null])
    expect(grid[0][5]).toBe('2026-08-01')
  })

  it('handles February in a leap year', () => {
    const grid = getMonthGrid(2028, 2)
    const days = grid.flat().filter((d): d is string => d !== null)
    expect(days).toHaveLength(29)
  })
})

describe('shiftMonth', () => {
  it('moves forward within a year', () => {
    expect(shiftMonth(2026, 8, 1)).toEqual({ year: 2026, month: 9 })
  })

  it('moves backward within a year', () => {
    expect(shiftMonth(2026, 8, -1)).toEqual({ year: 2026, month: 7 })
  })

  it('wraps forward across a year boundary', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('wraps backward across a year boundary', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
})

describe('isFutureMonth', () => {
  it('is false for the current month and every past month', () => {
    expect(isFutureMonth(2026, 8, '2026-08-30')).toBe(false)
    expect(isFutureMonth(2026, 7, '2026-08-30')).toBe(false)
    expect(isFutureMonth(2025, 12, '2026-08-30')).toBe(false)
  })

  it('is true for a later month in the same year, and for a later year', () => {
    expect(isFutureMonth(2026, 9, '2026-08-30')).toBe(true)
    expect(isFutureMonth(2027, 1, '2026-08-30')).toBe(true)
  })
})

describe('dateStringFor', () => {
  it('zero-pads month and day', () => {
    expect(dateStringFor(2026, 3, 5)).toBe('2026-03-05')
  })
})
