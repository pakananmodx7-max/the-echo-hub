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

describe('FAMILY & FRIENDS missions', () => {
  const ids = ['know_me_better', 'open_heart_question', 'shared_memory'] as const

  it('are each worth 5 points, matching the firestore.rules rewards-ledger 5-point group', () => {
    for (const id of ids) {
      expect(MISSION_CATALOG[id].points).toBe(5)
      expect(REWARD_POINTS[id]).toBe(5)
    }
  })

  it('point to their own activity routes', () => {
    expect(MISSION_CATALOG.know_me_better.ctaTo).toBe('/hub/activities/know-me-better')
    expect(MISSION_CATALOG.open_heart_question.ctaTo).toBe('/hub/activities/open-heart-question')
    expect(MISSION_CATALOG.shared_memory.ctaTo).toBe('/hub/activities/family-memory')
  })

  it('can each appear in a given day\'s rotating mission list', () => {
    const dates = Array.from({ length: 90 }, (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, '0')}-${i}`)
    for (const id of ids) {
      const appeared = dates.some((date) => getTodaysMissionIds(date).includes(id))
      expect(appeared).toBe(true)
    }
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
