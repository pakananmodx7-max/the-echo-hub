/**
 * ECHO ธรรมอุทยาน — the ONE centralized source of every reflection shown anywhere in the
 * Garden (physical signs, the central rotating board, passive zone overlays, the
 * Mindfulness Bell, mindfulness benches, and the Tree of Goodness). Nothing scatters a
 * quote string directly into a component — every surface reads from here.
 *
 * `sourceType: 'reflection'` on every entry is deliberate: these are user-provided life
 * reflections, not verified canonical scripture. UI copy must label them "ข้อคิดเตือนใจ" or
 * "ธรรมะเพื่อการใช้ชีวิต" — never "พุทธวจน" / "พระพุทธเจ้าตรัสว่า" — until a verified
 * canonical source is provided for a specific line.
 */

export type DhammaCategory = 'release' | 'compassion' | 'presence' | 'giving' | 'learning'

export const DHAMMA_CATEGORY_LABEL: Record<DhammaCategory, string> = {
  release: '🌿 การปล่อยวางและความพอใจ',
  compassion: '🤍 เมตตาและการไม่เบียดเบียน',
  presence: '🌅 การอยู่กับปัจจุบัน',
  giving: '🌱 การให้และการทำความดี',
  learning: '🧠 การเรียนรู้จากปัญหา',
}

/** Where a quote is used — a single quote may be reused across surfaces (e.g. a 'sign'
 * quote can also appear on the rotating 'board'); this only marks its PRIMARY placement. */
export type DhammaPlacement = 'sign' | 'board' | 'passive' | 'bell' | 'bench' | 'tree'

export interface DhammaQuote {
  id: string
  category: DhammaCategory
  /** Shown as the small heading above the quote — always the non-canonical framing. */
  title: 'ข้อคิดเตือนใจ' | 'ธรรมะเพื่อการใช้ชีวิต'
  text: string
  /** Which Garden zone this reflection is thematically tied to (for signs/passive overlays). */
  zone:
    | 'entrance'
    | 'path'
    | 'waterfall'
    | 'pond'
    | 'seating'
    | 'central-tree'
    | 'pavilion'
    | 'stage'
    | 'bell'
    | 'tree-of-goodness'
    | 'plaza'
  placement: DhammaPlacement
  /** A physical sign's fixed world position — only present for placement: 'sign'. */
  position?: [number, number]
  sourceType: 'reflection'
}

/** The 27 source reflections, each tagged with a category, a primary placement, and (for
 * physical signs) a fixed Garden position — every position was checked against the real
 * obstacle/table layout in gardenLayout.ts before being assigned here (signs themselves
 * are non-colliding decoration, so placement only had to avoid looking buried inside
 * another prop, not avoid blocking movement). */
export const DHAMMA_QUOTES: DhammaQuote[] = [
  {
    id: 'q01',
    category: 'presence',
    title: 'ข้อคิดเตือนใจ',
    text: 'ไม่ต้องไปหาความสุข ความสมบูรณ์แบบที่ไหนไกล\nแค่ใจเราสงบ นั่นแหละคือชีวิตที่ดีแล้ว',
    zone: 'entrance',
    placement: 'sign',
    position: [0, 8.0],
    sourceType: 'reflection',
  },
  {
    id: 'q02',
    category: 'release',
    title: 'ข้อคิดเตือนใจ',
    text: 'การไม่อยากได้ ไม่อยากมี ไม่อยากเป็นเจ้าของต่อสิ่งใด ๆ\nสิ่งนั้นอาจช่วยให้ใจเราเป็นสุขขึ้น',
    zone: 'path',
    placement: 'sign',
    position: [0.3, 6.0],
    sourceType: 'reflection',
  },
  {
    id: 'q03',
    category: 'giving',
    title: 'ข้อคิดเตือนใจ',
    text: 'ไม่ว่าคุณจะเป็นใคร\nถ้าคุณเริ่มเป็นผู้ให้\nคุณก็สามารถเป็นคนที่ยิ่งใหญ่ในสายตาของผู้อื่นได้',
    zone: 'path',
    placement: 'sign',
    position: [-0.3, 4.0],
    sourceType: 'reflection',
  },
  {
    id: 'q04',
    category: 'learning',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'อย่ามองว่าทุกปัญหาที่เข้ามาเป็นเรื่องทุกข์\nลองมองว่าเป็นสิ่งธรรมดาที่ชีวิตต้องพบเจอ',
    zone: 'plaza',
    placement: 'sign',
    position: [0.9, -1.6],
    sourceType: 'reflection',
  },
  {
    id: 'q05',
    category: 'giving',
    title: 'ข้อคิดเตือนใจ',
    text: 'ไม่ต้องไขว่คว้าทุกสิ่งในโลก\nหมั่นทำความดีและดูแลสิ่งที่อยู่ตรงหน้า',
    zone: 'tree-of-goodness',
    placement: 'tree',
    sourceType: 'reflection',
  },
  {
    id: 'q06',
    category: 'learning',
    title: 'ข้อคิดเตือนใจ',
    text: 'ไม่มีใครได้ทุกอย่างดั่งใจหวัง\nและไม่มีใครผิดหวังไปเสียทุกอย่าง',
    zone: 'seating',
    placement: 'bench',
    sourceType: 'reflection',
  },
  {
    id: 'q07',
    category: 'giving',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'เสริมบุญอย่าให้หมด\nส่วนบาปก็ลดอย่าให้เพิ่ม',
    zone: 'pavilion',
    placement: 'sign',
    position: [1.8, -4.9],
    sourceType: 'reflection',
  },
  {
    id: 'q08',
    category: 'giving',
    title: 'ข้อคิดเตือนใจ',
    text: 'โชคอยู่ที่การแสวงหา\nวาสนาอยู่ที่การกระทำ',
    zone: 'pavilion',
    placement: 'sign',
    position: [3.5, -3.8],
    sourceType: 'reflection',
  },
  {
    id: 'q09',
    category: 'compassion',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'พึงชนะผู้น้อยด้วยการให้\nพึงชนะผู้ใหญ่ด้วยความอ่อนโยน',
    zone: 'plaza',
    placement: 'board',
    sourceType: 'reflection',
  },
  {
    id: 'q10',
    category: 'learning',
    title: 'ข้อคิดเตือนใจ',
    text: 'ความสุขจะสอนให้เรารักคนอื่น\nความทุกข์จะสอนให้เรารู้จักดูแลตัวเอง',
    zone: 'waterfall',
    placement: 'passive',
    sourceType: 'reflection',
  },
  {
    id: 'q11',
    category: 'presence',
    title: 'ข้อคิดเตือนใจ',
    text: 'ไม่มีใครกำหนดชีวิตเรา\nได้ดีกว่าตัวเราเอง',
    zone: 'plaza',
    placement: 'board',
    sourceType: 'reflection',
  },
  {
    id: 'q12',
    category: 'presence',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'อดีตล่วงไปแล้ว\nอนาคตก็ยังมาไม่ถึง\nจงทำปัจจุบันให้ดีที่สุด',
    zone: 'central-tree',
    placement: 'sign',
    position: [3.0, 2.6],
    sourceType: 'reflection',
  },
  {
    id: 'q13',
    category: 'presence',
    title: 'ข้อคิดเตือนใจ',
    text: 'อดีตคือไฟฉาย\nที่ช่วยส่องทางให้เรา',
    zone: 'plaza',
    placement: 'board',
    sourceType: 'reflection',
  },
  {
    id: 'q14',
    category: 'release',
    title: 'ข้อคิดเตือนใจ',
    text: 'ปล่อยความทุกข์ทิ้งไป\nเก็บความสุขไว้ในใจดีกว่า',
    zone: 'seating',
    placement: 'bench',
    sourceType: 'reflection',
  },
  {
    id: 'q15',
    category: 'compassion',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'ถ้าคุณทำได้ จงช่วยผู้อื่น\nถ้าคุณทำไม่ได้ อย่างน้อยจงอย่าทำร้ายผู้อื่น',
    // Tagged 'stage' (not 'pond') so the two passive placements cover two genuinely
    // distinct physical regions — waterfall/pond are ~0.6 units apart in gardenLayout.ts
    // (effectively one zone), so a second "entered pond" trigger right next to the
    // waterfall one would fire almost simultaneously and feel like spam.
    zone: 'stage',
    placement: 'passive',
    sourceType: 'reflection',
  },
  {
    id: 'q16',
    category: 'presence',
    title: 'ข้อคิดเตือนใจ',
    text: 'เมื่อวานจบไปแล้ว\nวันนี้เริ่มใหม่ได้เสมอ',
    zone: 'bell',
    placement: 'bell',
    sourceType: 'reflection',
  },
  {
    id: 'q17',
    category: 'giving',
    title: 'ข้อคิดเตือนใจ',
    text: 'ความสำเร็จอยู่ในมือเรา\nอยู่ที่เราจะลงมือทำหรือไม่',
    zone: 'stage',
    placement: 'sign',
    position: [-1.0, -9.2],
    sourceType: 'reflection',
  },
  {
    id: 'q18',
    category: 'presence',
    title: 'ข้อคิดเตือนใจ',
    text: 'มุมที่ดีอยู่ที่เรามอง\nใจที่ดีอยู่ที่เราเลือก',
    zone: 'stage',
    placement: 'sign',
    position: [1.0, -12.0],
    sourceType: 'reflection',
  },
  {
    id: 'q19',
    category: 'giving',
    title: 'ข้อคิดเตือนใจ',
    text: 'ทำความดีอยู่คนเดียว\nแม้ไม่มีใครเห็น\nมันก็ยังเป็นความดี',
    zone: 'tree-of-goodness',
    placement: 'tree',
    sourceType: 'reflection',
  },
  {
    id: 'q20',
    category: 'release',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'ยินดีในสิ่งที่ตนได้\nพอใจในสิ่งที่ตนมี',
    zone: 'waterfall',
    placement: 'sign',
    position: [-7.8, -2.6],
    sourceType: 'reflection',
  },
  {
    id: 'q21',
    category: 'presence',
    title: 'ข้อคิดเตือนใจ',
    text: 'ไม่มีใครให้โอกาสชีวิตเรา\nได้ดีเท่าตัวเราเอง',
    zone: 'waterfall',
    placement: 'sign',
    position: [-7.6, 0.6],
    sourceType: 'reflection',
  },
  {
    id: 'q22',
    category: 'giving',
    title: 'ข้อคิดเตือนใจ',
    text: 'เมื่อมีจงให้\nหากอยากได้จงเริ่มจากการทำก่อน',
    zone: 'pond',
    placement: 'sign',
    position: [-6.9, 2.6],
    sourceType: 'reflection',
  },
  {
    id: 'q23',
    category: 'release',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'ยึดมากเป็นทุกข์มาก\nยึดน้อยเป็นทุกข์น้อย\nปล่อยได้ ใจก็เบาลง',
    zone: 'pond',
    placement: 'sign',
    position: [-6.3, -3.2],
    sourceType: 'reflection',
  },
  {
    id: 'q24',
    category: 'release',
    title: 'ข้อคิดเตือนใจ',
    text: 'ไม่ว่าจะสูญเสียอะไร\nก็อย่าลืมสิ่งดี ๆ ที่เรายังมีอยู่',
    zone: 'bell',
    placement: 'bell',
    sourceType: 'reflection',
  },
  {
    id: 'q25',
    category: 'release',
    title: 'ข้อคิดเตือนใจ',
    text: 'พอเป็นก็สุขใจ\nพอใจก็สุขเป็น',
    zone: 'seating',
    placement: 'bench',
    sourceType: 'reflection',
  },
  {
    id: 'q26',
    category: 'compassion',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'พึงชนะคนโกรธ\nด้วยความใจเย็น',
    zone: 'bell',
    placement: 'bell',
    sourceType: 'reflection',
  },
  {
    id: 'q27',
    category: 'compassion',
    title: 'ธรรมะเพื่อการใช้ชีวิต',
    text: 'ความไม่เบียดเบียนกัน\nเป็นพื้นฐานสำคัญของการอยู่ร่วมกัน',
    zone: 'plaza',
    placement: 'board',
    sourceType: 'reflection',
  },
]

export const DHAMMA_QUOTES_BY_ID: Record<string, DhammaQuote> = Object.fromEntries(
  DHAMMA_QUOTES.map((q) => [q.id, q]),
)

/** Every physical, always-visible sign in the Garden (spec §6/§7: no click required, the
 * quote must already be readable on approach). Target count is 12-18 — currently 13. */
export const SIGN_QUOTES: DhammaQuote[] = DHAMMA_QUOTES.filter((q) => q.placement === 'sign' && q.position)

/** Rotates on the central "ข้อคิดวันนี้" board near the Plaza — no click required, gentle
 * crossfade, ~30-60s interval (see GardenDhammaSigns.tsx). */
export const BOARD_QUOTES: DhammaQuote[] = DHAMMA_QUOTES.filter((q) => q.placement === 'board')

/** Shown once per zone per Garden session, the FIRST time a player enters that zone (spec
 * §11) — capped at 3-5 overlays/session by the caller, never by this list's length. */
export const PASSIVE_ZONE_QUOTES: Record<string, DhammaQuote> = Object.fromEntries(
  DHAMMA_QUOTES.filter((q) => q.placement === 'passive').map((q) => [q.zone, q]),
)

/** Rotates passively near the Tree of Goodness — kindness/goodness reflections only, no
 * click, no reward logic (spec §18: visual/learning landmark only in this version). */
export const TREE_OF_GOODNESS_QUOTES: DhammaQuote[] = DHAMMA_QUOTES.filter((q) => q.placement === 'tree')

/** One shown per Mindfulness Bell ring — see getDailyBellQuote below for the "same
 * reflection all day" selection rule. */
export const BELL_QUOTES: DhammaQuote[] = DHAMMA_QUOTES.filter((q) => q.placement === 'bell')

/** Shown briefly when a player sits on a designated "ม้านั่งพักใจ" mindfulness bench. */
export const BENCH_QUOTES: DhammaQuote[] = DHAMMA_QUOTES.filter((q) => q.placement === 'bench')

/** Deterministic "today's reflection" for the Mindfulness Bell — same quote for every ring
 * on the same Bangkok calendar date (matches the spec's "ข้อคิดประจำวันนี้" framing),
 * changes the next day, needs no Firestore/RTDB round-trip to agree across devices. */
export function getDailyBellQuote(dateStr: string): DhammaQuote {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0
  return BELL_QUOTES[hash % BELL_QUOTES.length]
}

/** Small deterministic PRNG-free pick — a random bench/tree quote, reseeded by the caller
 * each time (Math.random is fine here: these are visual-only, never security-relevant). */
export function randomFrom<T>(list: T[], avoid?: T): T {
  if (list.length <= 1) return list[0]
  let pick = list[Math.floor(Math.random() * list.length)]
  if (avoid) {
    let guard = 0
    while (pick === avoid && guard < 5) {
      pick = list[Math.floor(Math.random() * list.length)]
      guard++
    }
  }
  return pick
}
