import { describe, expect, it } from 'vitest'
import {
  BADGES,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  getLevelFromPoints,
  getLevelProgress,
  getLevelThreshold,
  getLevelTitle,
  getNewlyUnlockedBadges,
  getNextLevelThreshold,
  getPointsToNextLevel,
  getUnlockedBadges,
} from './levelConfig'

describe('LEVEL_THRESHOLDS', () => {
  it('has exactly 50 entries, level 1 at 0, level 50 at 9450', () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(50)
    expect(LEVEL_THRESHOLDS[0]).toBe(0)
    expect(LEVEL_THRESHOLDS[49]).toBe(9450)
    expect(MAX_LEVEL).toBe(50)
  })

  it('is strictly increasing (no duplicate or out-of-order thresholds)', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1])
    }
  })

  it('matches the exact spec table for every one of the 50 levels', () => {
    const expected = [
      0, 50, 100, 150, 200, 250, 300, 350, 400, 450,
      550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450,
      1600, 1750, 1900, 2050, 2200, 2350, 2500, 2650, 2800, 2950,
      3200, 3450, 3700, 3950, 4200, 4450, 4700, 4950, 5200, 5450,
      5850, 6250, 6650, 7050, 7450, 7850, 8250, 8650, 9050, 9450,
    ]
    expect([...LEVEL_THRESHOLDS]).toEqual(expected)
  })

  it('is consistent with the stated tiered per-level cost rule (50/100/150/250/400, chosen by the destination level of each step)', () => {
    function tierCostForLevel(level: number): number {
      if (level <= 10) return 50
      if (level <= 20) return 100
      if (level <= 30) return 150
      if (level <= 40) return 250
      return 400
    }
    const generated = [0]
    for (let level = 2; level <= 50; level++) {
      generated.push(generated[level - 2] + tierCostForLevel(level))
    }
    expect(generated).toEqual([...LEVEL_THRESHOLDS])
  })
})

describe('getLevelFromPoints — exact boundaries (spec §25)', () => {
  const cases: [number, number][] = [
    [0, 1],
    [49, 1],
    [50, 2],
    [449, 9],
    [450, 10],
    [549, 10],
    [550, 11],
    [1449, 19],
    [1450, 20],
    [2949, 29],
    [2950, 30],
    [5449, 39],
    [5450, 40],
    [9449, 49],
    [9450, 50],
    [10000, 50],
  ]
  for (const [points, expectedLevel] of cases) {
    it(`${points} points -> Level ${expectedLevel}`, () => {
      expect(getLevelFromPoints(points)).toBe(expectedLevel)
    })
  }

  it('additional worked examples from spec §12 (existing-user re-derivation)', () => {
    expect(getLevelFromPoints(0)).toBe(1)
    expect(getLevelFromPoints(275)).toBe(6)
    expect(getLevelFromPoints(780)).toBe(13)
    expect(getLevelFromPoints(1800)).toBe(22)
    expect(getLevelFromPoints(6000)).toBe(41) // Level 41 = 5850, Level 42 = 6250
    expect(getLevelFromPoints(9450)).toBe(50)
  })

  it('never returns below 1 or above 50, even for negative or absurdly large input', () => {
    expect(getLevelFromPoints(-100)).toBe(1)
    expect(getLevelFromPoints(1_000_000)).toBe(50)
  })
})

describe('getLevelThreshold / getNextLevelThreshold', () => {
  it('round-trips against LEVEL_THRESHOLDS', () => {
    for (let level = 1; level <= 50; level++) {
      expect(getLevelThreshold(level)).toBe(LEVEL_THRESHOLDS[level - 1])
    }
  })

  it('getNextLevelThreshold(50) is null (no Level 51 yet — spec §18)', () => {
    expect(getNextLevelThreshold(50)).toBeNull()
  })

  it('getNextLevelThreshold(17) is Level 18\'s threshold (1250)', () => {
    expect(getNextLevelThreshold(17)).toBe(1250)
  })
})

describe('getPointsToNextLevel', () => {
  it('is null at max level', () => {
    expect(getPointsToNextLevel(9450)).toBeNull()
    expect(getPointsToNextLevel(50000)).toBeNull()
  })

  it('matches the spirit of the spec §4 mockup (Level 17, 30 points short of Level 18) — the mockup\'s own "1,120" is illustrative UI copy, not aligned to the exact threshold table (1120 actually falls in Level 16\'s span); 1220 is the real point value at Level 17 with exactly 30 to go', () => {
    expect(getLevelFromPoints(1220)).toBe(17)
    expect(getPointsToNextLevel(1220)).toBe(30)
  })
})

describe('getLevelProgress — within-level only, never against the global 9450 max (spec §17)', () => {
  it('Level 17 at 1200 points is 50/100 = 50% (not ~13% of 9450)', () => {
    const progress = getLevelProgress(1200)
    expect(progress.level).toBe(17)
    expect(progress.pointsIntoLevel).toBe(50)
    expect(progress.pointsSpanForLevel).toBe(100)
    expect(progress.ratio).toBeCloseTo(0.5)
    expect(progress.pointsToNextLevel).toBe(50)
    expect(progress.isMaxLevel).toBe(false)
  })

  it('is 0% right at a level\'s own threshold', () => {
    const progress = getLevelProgress(450) // Level 10's threshold
    expect(progress.level).toBe(10)
    expect(progress.pointsIntoLevel).toBe(0)
    expect(progress.ratio).toBe(0)
  })

  it('reports isMaxLevel at Level 50 with no next-level requirement', () => {
    const progress = getLevelProgress(9450)
    expect(progress.level).toBe(50)
    expect(progress.isMaxLevel).toBe(true)
    expect(progress.pointsToNextLevel).toBeNull()
    expect(progress.ratio).toBe(1)
  })

  it('continues to report Level 50 / maxed even with points far beyond 9450 (spec §18: keep storing totalPoints, UI stays Level 50)', () => {
    const progress = getLevelProgress(50000)
    expect(progress.level).toBe(50)
    expect(progress.isMaxLevel).toBe(true)
  })
})

describe('getLevelTitle — milestone groups (spec §2)', () => {
  const cases: [number, string, string][] = [
    [1, '🌱', 'ผู้เริ่มต้น'],
    [9, '🌱', 'ผู้เริ่มต้น'],
    [10, '🌿', 'ECHO Listener'],
    [17, '🌿', 'ECHO Listener'],
    [19, '🌿', 'ECHO Listener'],
    [20, '🤍', 'Heart Listener'],
    [29, '🤍', 'Heart Listener'],
    [30, '✨', 'ECHO Connector'],
    [39, '✨', 'ECHO Connector'],
    [40, '🌟', 'ECHO Guardian'],
    [49, '🌟', 'ECHO Guardian'],
    [50, '👑', 'ECHO Master'],
  ]
  for (const [level, emoji, title] of cases) {
    it(`Level ${level} -> ${emoji} ${title}`, () => {
      expect(getLevelTitle(level)).toEqual({ emoji, title })
    })
  }
})

describe('BADGES / getUnlockedBadges / getNewlyUnlockedBadges (spec §3)', () => {
  it('has exactly the 5 milestone badges at levels 10/20/30/40/50', () => {
    expect(BADGES.map((b) => b.level)).toEqual([10, 20, 30, 40, 50])
    expect(BADGES.map((b) => b.id)).toEqual(['echo_listener', 'heart_listener', 'echo_connector', 'echo_guardian', 'echo_master'])
  })

  it('getUnlockedBadges is empty below Level 10, grows permanently at each milestone', () => {
    expect(getUnlockedBadges(9)).toHaveLength(0)
    expect(getUnlockedBadges(10)).toHaveLength(1)
    expect(getUnlockedBadges(25)).toHaveLength(2)
    expect(getUnlockedBadges(50)).toHaveLength(5)
  })

  it('getNewlyUnlockedBadges finds a single crossed milestone for a normal level-up', () => {
    expect(getNewlyUnlockedBadges(9, 10).map((b) => b.id)).toEqual(['echo_listener'])
    expect(getNewlyUnlockedBadges(10, 11)).toHaveLength(0)
  })

  it('getNewlyUnlockedBadges finds every milestone crossed in a multi-level jump (spec §16)', () => {
    // A big one-time reward jumps a user from Level 8 straight to Level 22 — both the
    // Level 10 and Level 20 badges are newly crossed in this single reward.
    const unlocked = getNewlyUnlockedBadges(8, 22)
    expect(unlocked.map((b) => b.id)).toEqual(['echo_listener', 'heart_listener'])
  })

  it('getNewlyUnlockedBadges is empty when no milestone was crossed', () => {
    expect(getNewlyUnlockedBadges(15, 16)).toHaveLength(0)
  })
})
