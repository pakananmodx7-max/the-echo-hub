/**
 * THE ECHO HUB's 50-level progression system — the ONE centralized source of truth for
 * every level threshold, title, and badge. Every page/component that needs "what level is
 * this many points," "how far to the next level," or "which badges are unlocked" must go
 * through the helpers here — never re-derive or hardcode a threshold anywhere else.
 *
 * Levels are entirely DERIVED from `totalPoints` (see rewardsService.ts) — nothing about a
 * level, title, or badge is ever stored as its own field anywhere. That is a deliberate
 * security property, not an oversight: totalPoints is already the one value the reward
 * transaction (and firestore.rules) tightly bounds to legitimate, idempotent deltas, so a
 * pure function of it can never be forged independently of forging totalPoints itself —
 * there is no separate "currentLevel"/"badge" field a client could write directly to fake
 * a level or badge.
 */

/** Level 1's threshold is 0; level 50's is 9,450 — see LEVEL_THRESHOLDS below for the full
 * table. Every value here is copied verbatim from the project spec (not "approximate" in
 * practice — the spec's own worked boundary examples, e.g. "449 -> Level 9, 450 -> Level
 * 10", match these exactly), and cross-checked in levelConfig.test.ts against the tiered
 * per-level cost rule that generates them (50/100/150/250/400 points per level, in bands of
 * 10 levels, tier chosen by the DESTINATION level of each step). */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, 50, 100, 150, 200, 250, 300, 350, 400, 450, // levels 1-10
  550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, // levels 11-20
  1600, 1750, 1900, 2050, 2200, 2350, 2500, 2650, 2800, 2950, // levels 21-30
  3200, 3450, 3700, 3950, 4200, 4450, 4700, 4950, 5200, 5450, // levels 31-40
  5850, 6250, 6650, 7050, 7450, 7850, 8250, 8650, 9050, 9450, // levels 41-50
]

export const MAX_LEVEL = LEVEL_THRESHOLDS.length

interface LevelGroupDef {
  minLevel: number
  maxLevel: number
  emoji: string
  title: string
}

/** Milestone identity per 10-level band — "architecture should allow more titles later"
 * (spec §2): adding a finer-grained title only ever means inserting another band here, no
 * other file needs to change. */
const LEVEL_GROUPS: LevelGroupDef[] = [
  { minLevel: 1, maxLevel: 9, emoji: '🌱', title: 'ผู้เริ่มต้น' },
  { minLevel: 10, maxLevel: 19, emoji: '🌿', title: 'ECHO Listener' },
  { minLevel: 20, maxLevel: 29, emoji: '🤍', title: 'Heart Listener' },
  { minLevel: 30, maxLevel: 39, emoji: '✨', title: 'ECHO Connector' },
  { minLevel: 40, maxLevel: 49, emoji: '🌟', title: 'ECHO Guardian' },
  { minLevel: 50, maxLevel: 50, emoji: '👑', title: 'ECHO Master' },
]

export interface LevelTitle {
  emoji: string
  title: string
}

export interface BadgeDef {
  /** Stable, never-renamed id — this is what would ever be persisted/referenced (e.g. in
   * a future explicit "badges earned" analytics counter), never the emoji/title, which may
   * be re-worded later without invalidating anything. */
  id: string
  level: number
  emoji: string
  title: string
  /** Shown on the milestone celebration popup (spec §9). */
  celebrationMessage: string
}

/** One permanent badge every 10 levels (spec §3) — unlocking is derived purely from level
 * (itself derived from totalPoints), so a badge can never be self-granted. */
export const BADGES: readonly BadgeDef[] = [
  { id: 'echo_listener', level: 10, emoji: '🌿', title: 'ECHO Listener', celebrationMessage: 'ขอบคุณที่ตั้งใจฟังมาตลอด 🌿' },
  { id: 'heart_listener', level: 20, emoji: '🤍', title: 'Heart Listener', celebrationMessage: 'ขอบคุณที่เลือกฟังและเข้าใจ' },
  { id: 'echo_connector', level: 30, emoji: '✨', title: 'ECHO Connector', celebrationMessage: 'ทุกการเชื่อมต่อเริ่มจากความใส่ใจ ✨' },
  { id: 'echo_guardian', level: 40, emoji: '🌟', title: 'ECHO Guardian', celebrationMessage: 'คุณคือพื้นที่ปลอดภัยของใครหลายคน 🌟' },
  { id: 'echo_master', level: 50, emoji: '👑', title: 'ECHO Master', celebrationMessage: 'ทุกเสียงสะท้อนที่ดี\nเริ่มต้นจากการฟัง' },
]

/** The Bangkok-local calendar date this level system launched — not currently used to gate
 * anything (existing users are simply re-derived from their preserved totalPoints the next
 * time they load the app, per spec §12), kept only as a documented reference point. */
export const LEVEL_SYSTEM_LAUNCH_NOTE =
  'Existing totalPoints are preserved as-is; level/title/badges are re-derived from them on every read, never reset.'

/** The level for a given (already-validated, non-negative) total points value — the single
 * source of truth every other helper below builds on. */
export function getLevelFromPoints(totalPoints: number): number {
  const points = Number.isFinite(totalPoints) ? Math.max(0, totalPoints) : 0
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
      break
    }
  }
  return level
}

/** The cumulative points threshold AT which this level begins (level 1 -> 0). */
export function getLevelThreshold(level: number): number {
  const clamped = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL)
  return LEVEL_THRESHOLDS[clamped - 1]
}

/** The threshold of the NEXT level, or null if already at MAX_LEVEL (spec §18: no Level 51 yet). */
export function getNextLevelThreshold(level: number): number | null {
  const clamped = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL)
  if (clamped >= MAX_LEVEL) return null
  return LEVEL_THRESHOLDS[clamped] // index `clamped` is level (clamped+1)'s threshold
}

/** Points still needed to reach the next level, or null at MAX_LEVEL. Never negative. */
export function getPointsToNextLevel(totalPoints: number): number | null {
  const level = getLevelFromPoints(totalPoints)
  const next = getNextLevelThreshold(level)
  if (next === null) return null
  return Math.max(0, next - totalPoints)
}

export interface LevelProgress {
  level: number
  /** Points earned so far WITHIN the current level (never against the global 9,450 max —
   * spec §17's explicit "do not calculate progress against 9450 globally"). */
  pointsIntoLevel: number
  /** Total points required to clear the current level (0 at MAX_LEVEL — already maxed). */
  pointsSpanForLevel: number
  /** pointsIntoLevel / pointsSpanForLevel, clamped to [0,1]; 1 at MAX_LEVEL. */
  ratio: number
  /** Points still needed for the next level; null at MAX_LEVEL. */
  pointsToNextLevel: number | null
  isMaxLevel: boolean
}

/** Progress WITHIN the current level only — see the worked example in spec §17 (Level 17's
 * span is 1150->1250; a user at 1200 is 50/100 = 50% through Level 17, not ~13% of 9450). */
export function getLevelProgress(totalPoints: number): LevelProgress {
  const level = getLevelFromPoints(totalPoints)
  const base = getLevelThreshold(level)
  const next = getNextLevelThreshold(level)
  if (next === null) {
    return { level, pointsIntoLevel: 0, pointsSpanForLevel: 0, ratio: 1, pointsToNextLevel: null, isMaxLevel: true }
  }
  const span = next - base
  const intoLevel = Math.min(Math.max(totalPoints - base, 0), span)
  return {
    level,
    pointsIntoLevel: intoLevel,
    pointsSpanForLevel: span,
    ratio: span > 0 ? intoLevel / span : 1,
    pointsToNextLevel: Math.max(0, next - totalPoints),
    isMaxLevel: false,
  }
}

/** The milestone group (emoji + title) a level belongs to — e.g. Level 17 -> "🌿 ECHO Listener". */
export function getLevelTitle(level: number): LevelTitle {
  const clamped = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL)
  const group = LEVEL_GROUPS.find((g) => clamped >= g.minLevel && clamped <= g.maxLevel)
  return group ? { emoji: group.emoji, title: group.title } : { emoji: '🌱', title: 'ผู้เริ่มต้น' }
}

/** Every badge unlocked at (or before) this level — permanent once unlocked, per spec §3. */
export function getUnlockedBadges(level: number): BadgeDef[] {
  return BADGES.filter((b) => level >= b.level)
}

/** Badges newly crossed by going from `previousLevel` to `currentLevel` in one reward — used
 * to decide whether/which milestone celebration(s) to show (spec §9, §16: show the highest
 * one on a multi-level jump, never one popup per skipped level). */
export function getNewlyUnlockedBadges(previousLevel: number, currentLevel: number): BadgeDef[] {
  return BADGES.filter((b) => b.level > previousLevel && b.level <= currentLevel)
}
