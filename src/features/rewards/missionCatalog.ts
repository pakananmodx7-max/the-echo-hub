export type MissionId =
  | 'checkin'
  | 'garden'
  | 'journal'
  | 'friendbond'
  | 'kindword'
  | 'hearwithheart'
  | 'daily_journal'
  | 'know_me_better'
  | 'open_heart_question'
  | 'shared_memory'

export interface MissionDef {
  id: MissionId
  icon: string
  title: string
  points: number
  /** Route to send the student to when this mission isn't done yet. Empty for 'checkin', which opens the check-in modal directly instead of navigating. */
  ctaTo: string
  ctaLabel: string
}

/** Always shown every day — the two core habits this whole system exists to gently encourage. */
const CORE_MISSION_IDS: MissionId[] = ['checkin', 'garden']

/** The rest of the catalog, from which a few rotate in each day (see getTodaysMissionIds) — never all at once, so the daily list stays light or "3–5 missions/day" per spec. */
const ROTATING_MISSION_IDS: MissionId[] = [
  'journal',
  'friendbond',
  'kindword',
  'hearwithheart',
  'daily_journal',
  'know_me_better',
  'open_heart_question',
  'shared_memory',
]

const HOW_MANY_ROTATING_PER_DAY = 3

export const MISSION_CATALOG: Record<MissionId, MissionDef> = {
  checkin: {
    id: 'checkin',
    icon: '🌤️',
    title: 'เช็กอินความรู้สึกวันนี้',
    points: 5,
    ctaTo: '',
    ctaLabel: 'เช็กอินตอนนี้ →',
  },
  garden: {
    id: 'garden',
    icon: '🌿',
    title: 'เข้า ECHO GARDEN',
    points: 5,
    ctaTo: '/hub/garden',
    ctaLabel: 'ไป ECHO GARDEN →',
  },
  journal: {
    id: 'journal',
    icon: '🎨',
    title: 'วาดหรือบันทึกใน ECHO Journal',
    points: 10,
    ctaTo: '/hub/draw/journal',
    ctaLabel: 'ไปวาด →',
  },
  friendbond: {
    id: 'friendbond',
    icon: '🫶',
    title: 'ทำกิจกรรม Friend Bond',
    points: 10,
    ctaTo: '/hub/friends',
    ctaLabel: 'ไปทำกิจกรรม →',
  },
  kindword: {
    id: 'kindword',
    icon: '💜',
    title: 'พูดหรือส่งกำลังใจให้ใครสักคน',
    points: 5,
    ctaTo: '/hub/activities/say-it-today',
    ctaLabel: 'ไปทำกิจกรรม →',
  },
  hearwithheart: {
    id: 'hearwithheart',
    icon: '👂',
    title: 'ทำกิจกรรม Hear with Heart',
    points: 10,
    ctaTo: '/hub/activities/hear-someone',
    ctaLabel: 'ไปทำกิจกรรม →',
  },
  daily_journal: {
    id: 'daily_journal',
    icon: '📔',
    title: 'เขียนบันทึกของวันนี้',
    points: 5,
    ctaTo: '/hub/activities/daily-journal',
    ctaLabel: 'ไปเขียน →',
  },
  know_me_better: {
    id: 'know_me_better',
    icon: '🎯',
    title: 'เล่น "รู้จักกันแค่ไหน?" กับคนใกล้ตัว',
    points: 5,
    ctaTo: '/hub/activities/know-me-better',
    ctaLabel: 'ไปเล่น →',
  },
  open_heart_question: {
    id: 'open_heart_question',
    icon: '💬',
    title: 'ตอบคำถามเปิดใจวันนี้',
    points: 5,
    ctaTo: '/hub/activities/open-heart-question',
    ctaLabel: 'ไปดูคำถาม →',
  },
  shared_memory: {
    id: 'shared_memory',
    icon: '📸',
    title: 'เก็บความทรงจำดี ๆ ไว้สักหนึ่งอย่าง',
    points: 5,
    ctaTo: '/hub/activities/family-memory',
    ctaLabel: 'ไปเก็บความทรงจำ →',
  },
}

/** Every valid point value in the catalog — mirrored in firestore.rules to validate a reward's declared `points` matches its `type`. */
export const REWARD_POINTS: Record<MissionId, number> = Object.fromEntries(
  Object.values(MISSION_CATALOG).map((m) => [m.id, m.points]),
) as Record<MissionId, number>

/** Small deterministic PRNG (mulberry32-style) seeded from a string, so the same calendar date always produces the same rotation — no server round-trip needed to "resolve" today's mission list, and every device agrees without coordination. */
function seededRandom(seedStr: string): () => number {
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Today's mission list: the two core missions plus a deterministic rotating subset of the
 * rest, keyed purely by the Bangkok calendar date string — "Do not require every mission
 * every day" / "some missions may rotate" per spec, while staying identical across every
 * device/session without needing to persist which missions were "assigned" that day.
 */
export function getTodaysMissionIds(dateStr: string): MissionId[] {
  const rand = seededRandom(dateStr)
  const pool = [...ROTATING_MISSION_IDS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return [...CORE_MISSION_IDS, ...pool.slice(0, HOW_MANY_ROTATING_PER_DAY)]
}

export function getTodaysMissions(dateStr: string): MissionDef[] {
  return getTodaysMissionIds(dateStr).map((id) => MISSION_CATALOG[id])
}
