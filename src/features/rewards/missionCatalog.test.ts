import { describe, expect, it } from 'vitest'
import { MISSION_CATALOG, REWARD_POINTS, getTodaysMissionIds, getTodaysMissions } from './missionCatalog'

describe('daily_journal mission', () => {
  it('is worth 5 points, matching the firestore.rules rewards-ledger 5-point group', () => {
    expect(MISSION_CATALOG.daily_journal.points).toBe(5)
    expect(REWARD_POINTS.daily_journal).toBe(5)
  })

  it('points to the Daily Journal route', () => {
    expect(MISSION_CATALOG.daily_journal.ctaTo).toBe('/hub/activities/daily-journal')
  })

  it('can appear in a given day\'s rotating mission list', () => {
    // Try enough distinct dates that the deterministic rotation is bound to include it at
    // least once — this only fails if daily_journal was dropped from the rotating pool.
    const appeared = Array.from({ length: 60 }, (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, '0')}`).some(
      (date) => getTodaysMissionIds(date).includes('daily_journal'),
    )
    expect(appeared).toBe(true)
  })
})

describe('getTodaysMissions', () => {
  it('always includes the two core missions plus 3 rotating ones (5 total)', () => {
    const missions = getTodaysMissions('2026-08-30')
    expect(missions).toHaveLength(5)
    expect(missions.map((m) => m.id)).toEqual(expect.arrayContaining(['checkin', 'garden']))
  })

  it('is deterministic for the same date', () => {
    expect(getTodaysMissionIds('2026-08-30')).toEqual(getTodaysMissionIds('2026-08-30'))
  })
})
