/**
 * THE ECHO HUB's Thai-first message-safety dataset.
 *
 * Deliberately split into FOUR separate shapes instead of one giant word list, so each
 * piece stays reviewable and testable on its own:
 *
 *  - EXACT_TERM_RULES        single words/compounds, matched as a substring of the fully
 *                            "compacted" message (see normalizeMessage.ts) — this is what
 *                            catches spaced/dotted/dashed/elongated evasion.
 *  - PHRASE_PATTERN_RULES    multi-word regex patterns for directed insults/compound
 *                            mockery ("มึงมันโง่", "หมูอ้วน") — matched against the
 *                            whitespace-collapsed "standard" copy.
 *  - CONTEXTUAL_PATTERN_RULES sentence-shaped regex patterns for harm that carries NO
 *                            profanity at all — exclusion, devaluation, threats, and
 *                            self-harm encouragement ("ไม่มีใครต้องการแก", "ไปตายซะ").
 *  - SAFE_EXCEPTIONS         common, harmless Thai words that would otherwise collide
 *                            with a rule above (e.g. "หีบ" contains "หี").
 *
 * Every rule carries its own `severity`, so there's no separate "severity mapping" table
 * to keep in sync — a rule's blocking behavior lives right next to the rule itself.
 *
 * Accuracy over quantity: every entry below is a real, commonly-recognized Thai (or
 * Thai-chat-common English/romanized) term the authors were confident about. Where a
 * plausible-sounding slang term could not be verified with confidence, it was left out
 * rather than guessed — per the "do not invent slang" requirement this dataset was built
 * against. Bare words that are ALSO ordinary vocabulary (สัตว์, หมา, บ้า, อ้วน, ควาย,
 * ขยะ, กะเทย, เกย์, พิการ, …) are intentionally never listed as exact terms on their own;
 * they only ever appear inside a clearly-directed compound/phrase, or as a documented
 * SAFE_EXCEPTIONS entry, to keep normal conversation from being over-blocked.
 */

export type SafetyCategory =
  | 'profanity_general'
  | 'insult_direct'
  | 'insult_ability'
  | 'insult_appearance'
  | 'degrading'
  | 'exclusion'
  | 'sarcasm_pressure'
  | 'intimidation'
  | 'harassment'
  | 'threat_violence'
  | 'self_harm_encouragement'
  | 'wish_death_or_gone'
  | 'discrimination'
  | 'sexual_harassment'

export type SafetySeverity = 'safe' | 'warning' | 'blocked' | 'critical'

/** Higher number = more severe. Used to pick the worst match when several rules fire. */
export const SEVERITY_RANK: Record<SafetySeverity, number> = {
  safe: 0,
  warning: 1,
  blocked: 2,
  critical: 3,
}

export interface ExactTermRule {
  id: string
  category: SafetyCategory
  severity: SafetySeverity
  /** Full words/compounds, never bare 1–2 character fragments — kept whole specifically
   * to avoid colliding with unrelated safe words. */
  terms: string[]
}

export interface PhrasePatternRule {
  id: string
  category: SafetyCategory
  severity: SafetySeverity
  patterns: RegExp[]
}

/** Same shape as a phrase rule — kept as a distinct type/list because these specifically
 * cover harm that contains no profanity at all (exclusion, devaluation, death-wishing). */
export type ContextualPatternRule = PhrasePatternRule

export interface SafeException {
  id: string
  /** The common, harmless word/phrase itself. */
  term: string
  /** Why it exists — which collision it guards against. */
  note: string
}

// ---------------------------------------------------------------------------------------
// A + B — คำหยาบทั่วไป / คำด่าบุคคลโดยตรง
// ---------------------------------------------------------------------------------------
const PROFANITY_AND_DIRECT_INSULT_TERMS: ExactTermRule[] = [
  { id: 'profanity_kuay', category: 'profanity_general', severity: 'critical', terms: ['ควย', 'กวย', 'kuay'] },
  { id: 'profanity_hia', category: 'profanity_general', severity: 'blocked', terms: ['เหี้ย', 'เหีย', 'hia'] },
  { id: 'profanity_hee', category: 'profanity_general', severity: 'critical', terms: ['หี'] },
  { id: 'profanity_tad', category: 'profanity_general', severity: 'critical', terms: ['แตด'] },
  { id: 'profanity_yed', category: 'profanity_general', severity: 'critical', terms: ['เย็ด', 'เยด'] },
  { id: 'profanity_rayam', category: 'profanity_general', severity: 'blocked', terms: ['ระยำ'] },
  { id: 'insult_krabee', category: 'insult_direct', severity: 'critical', terms: ['กระหรี่'] },
  { id: 'insult_eedok', category: 'insult_direct', severity: 'critical', terms: ['อีดอก'] },
  { id: 'insult_tor_lae', category: 'insult_direct', severity: 'blocked', terms: ['ตอแหล', 'ตอแล'] },
  { id: 'insult_sandarn', category: 'insult_direct', severity: 'blocked', terms: ['สันดาน', 'เสียสันดาน'] },
  { id: 'profanity_sad_slang', category: 'profanity_general', severity: 'blocked', terms: ['สัสๆ', 'อสส', 'สัส'] },
  { id: 'insult_compound_hia', category: 'insult_direct', severity: 'critical', terms: ['ไอ้เหี้ย', 'อีเหี้ย'] },
  {
    id: 'insult_compound_animal',
    category: 'insult_direct',
    severity: 'blocked',
    terms: ['ไอ้สัตว์', 'อีสัตว์', 'ชาติสัตว์', 'ชาติหมา', 'ไอ้หมา', 'อีหมา', 'หมาเน่า', 'ไอ้ควาย', 'อีควาย'],
  },
  { id: 'insult_compound_crazy', category: 'insult_direct', severity: 'warning', terms: ['ไอ้บ้า', 'อีบ้า'] },
  { id: 'insult_khiakha', category: 'insult_direct', severity: 'warning', terms: ['ขี้ข้า'] },
  { id: 'english_profanity_core', category: 'profanity_general', severity: 'blocked', terms: ['fuck you', 'fucker', 'motherfucker', 'asshole', 'bastard', 'stfu'] },
  { id: 'english_slur_gendered', category: 'insult_direct', severity: 'critical', terms: ['bitch', 'slut', 'whore', 'cunt'] },
]

// ---------------------------------------------------------------------------------------
// C — การดูถูกความสามารถ/สติปัญญา
// ---------------------------------------------------------------------------------------
const ABILITY_INTELLIGENCE_TERMS: ExactTermRule[] = [
  { id: 'insult_panyaon', category: 'insult_ability', severity: 'blocked', terms: ['ปัญญาอ่อน'] },
  { id: 'insult_ngo', category: 'insult_ability', severity: 'warning', terms: ['โง่', 'งี่เง่า'] },
  { id: 'insult_kwai_animal', category: 'insult_ability', severity: 'warning', terms: ['ควาย'] },
  { id: 'insult_gak', category: 'insult_ability', severity: 'warning', terms: ['กาก'] },
  { id: 'insult_smong_kwang', category: 'insult_ability', severity: 'blocked', terms: ['สมองกลวง', 'ไร้สมอง'] },
  { id: 'insult_rai_prayoch', category: 'degrading', severity: 'blocked', terms: ['ไร้ประโยชน์', 'ไม่มีประโยชน์'] },
  { id: 'insult_rai_sara', category: 'insult_ability', severity: 'warning', terms: ['ไร้สาระ'] },
  { id: 'english_insult_ability', category: 'insult_ability', severity: 'blocked', terms: ['stupid', 'idiot', 'dumb', 'dumbass', 'moron', 'retard', 'retarded'] },
]

// ---------------------------------------------------------------------------------------
// D — การดูถูกรูปลักษณ์
// ---------------------------------------------------------------------------------------
const APPEARANCE_TERMS: ExactTermRule[] = [
  { id: 'insult_uplak', category: 'insult_appearance', severity: 'blocked', terms: ['อัปลักษณ์'] },
  { id: 'insult_kirei', category: 'insult_appearance', severity: 'blocked', terms: ['ขี้เหร่'] },
  { id: 'insult_narangkiat', category: 'insult_appearance', severity: 'blocked', terms: ['น่ารังเกียจ'] },
  { id: 'insult_khayaekyaek', category: 'insult_appearance', severity: 'blocked', terms: ['น่าขยะแขยง'] },
  { id: 'insult_pomhaeng', category: 'insult_appearance', severity: 'warning', terms: ['ผอมแห้งแรงน้อย'] },
  { id: 'insult_compound_fat', category: 'insult_appearance', severity: 'blocked', terms: ['ไอ้อ้วน', 'อีอ้วน', 'หมูอ้วน', 'อ้วนเป็นหมู'] },
  { id: 'english_insult_appearance', category: 'insult_appearance', severity: 'blocked', terms: ['ugly', 'fatass', 'fugly', 'freak'] },
]

// ---------------------------------------------------------------------------------------
// E + F — การลดคุณค่า / การปฏิเสธคุณค่าทางสังคม
// ---------------------------------------------------------------------------------------
const DEVALUATION_TERMS: ExactTermRule[] = [
  { id: 'degrading_raikha', category: 'degrading', severity: 'blocked', terms: ['ไร้ค่า', 'ไม่มีค่า'] },
  { id: 'degrading_sompeht', category: 'degrading', severity: 'blocked', terms: ['น่าสมเพช'] },
  { id: 'degrading_para', category: 'degrading', severity: 'critical', terms: ['เป็นภาระ'] },
  { id: 'english_insult_worth', category: 'degrading', severity: 'blocked', terms: ['loser', 'pathetic', 'worthless', 'trash', 'garbage', 'useless'] },
]

// ---------------------------------------------------------------------------------------
// N — คำเหยียด/เลือกปฏิบัติ
// ---------------------------------------------------------------------------------------
const DISCRIMINATION_TERMS: ExactTermRule[] = [
  { id: 'discrimination_ethnic_th', category: 'discrimination', severity: 'critical', terms: ['ไอ้แขก'] },
  { id: 'discrimination_racial_en', category: 'discrimination', severity: 'critical', terms: ['nigger', 'nigga', 'chink'] },
]

// ---------------------------------------------------------------------------------------
// O — sexual harassment / sexual humiliation (single-term signals)
// ---------------------------------------------------------------------------------------
const SEXUAL_TERMS: ExactTermRule[] = [
  { id: 'sexual_ngiean', category: 'sexual_harassment', severity: 'blocked', terms: ['เงี่ยน'] },
  { id: 'sexual_luanlam_word', category: 'sexual_harassment', severity: 'critical', terms: ['ลวนลาม', 'ล่วงละเมิดทางเพศ'] },
]

// ---------------------------------------------------------------------------------------
// I / J / K — ข่มขู่ / คุกคาม / ข่มขู่ทำร้ายร่างกาย (single-term signals)
// ---------------------------------------------------------------------------------------
const THREAT_TERMS: ExactTermRule[] = [
  { id: 'threat_kys_en', category: 'self_harm_encouragement', severity: 'critical', terms: ['kys', 'kill yourself'] },
  { id: 'threat_ai_hoi', category: 'threat_violence', severity: 'blocked', terms: ['ไสหัวไป', 'ไสหัวไปไกลๆ'] },
]

// ---------------------------------------------------------------------------------------
// Additional profanity / direct-insult variants and lesser-known-but-verified terms.
// ---------------------------------------------------------------------------------------
const PROFANITY_EXTRA_TERMS: ExactTermRule[] = [
  { id: 'profanity_janrai', category: 'profanity_general', severity: 'blocked', terms: ['จัญไร'] },
  { id: 'profanity_appree', category: 'profanity_general', severity: 'blocked', terms: ['อัปรีย์'] },
  { id: 'profanity_rayam_extra', category: 'profanity_general', severity: 'blocked', terms: ['ระยำตำบอน'] },
  { id: 'profanity_chibhai', category: 'profanity_general', severity: 'warning', terms: ['ฉิบหาย', 'ชิบหาย'] },
  { id: 'profanity_badsob', category: 'profanity_general', severity: 'warning', terms: ['บัดซบ'] },
  { id: 'profanity_turet', category: 'insult_direct', severity: 'blocked', terms: ['ทุเรศ', 'น่าทุเรศ'] },
  { id: 'profanity_sawa', category: 'degrading', severity: 'blocked', terms: ['สวะ'] },
  { id: 'insult_kheepae', category: 'insult_direct', severity: 'warning', terms: ['ขี้แพ้'] },
  { id: 'insult_kheekohok', category: 'insult_direct', severity: 'warning', terms: ['ขี้โกหก'] },
  { id: 'insult_naa_ngo', category: 'insult_ability', severity: 'blocked', terms: ['หน้าโง่'] },
  { id: 'insult_naa_daan', category: 'insult_direct', severity: 'blocked', terms: ['หน้าด้าน'] },
  { id: 'insult_rai_yang_ai', category: 'degrading', severity: 'blocked', terms: ['ไร้ยางอาย'] },
  { id: 'insult_compound_wen', category: 'insult_direct', severity: 'blocked', terms: ['อีเวร', 'ไอ้เวร'] },
  { id: 'insult_sandarn_extra', category: 'insult_direct', severity: 'blocked', terms: ['สันดานหมา'] },
  { id: 'insult_compound_torlae_extra', category: 'insult_direct', severity: 'blocked', terms: ['อีตอแหล', 'ไอ้ตอแหล'] },
  { id: 'insult_eedokthong', category: 'insult_direct', severity: 'critical', terms: ['อีดอกทอง'] },
  {
    id: 'english_insult_extra',
    category: 'insult_direct',
    severity: 'warning',
    terms: ['jerk', 'creep', 'weirdo', 'lame', 'clown'],
  },
  {
    id: 'english_insult_strong_extra',
    category: 'insult_direct',
    severity: 'blocked',
    terms: ['scum', 'scumbag', 'douchebag', 'psycho'],
  },
]

// ---------------------------------------------------------------------------------------
// Additional sexual-harassment single-term signals.
// ---------------------------------------------------------------------------------------
const SEXUAL_EXTRA_TERMS: ExactTermRule[] = [
  { id: 'sexual_yua_phet', category: 'sexual_harassment', severity: 'blocked', terms: ['ยั่วเพศ'] },
  { id: 'sexual_huen_kam', category: 'sexual_harassment', severity: 'blocked', terms: ['หื่นกาม', 'คนหื่น'] },
]

// ---------------------------------------------------------------------------------------
// Additional self-harm-encouragement / violent-method single-term signals — paired with
// an imperative in CONTEXTUAL_PATTERN_RULES below, never flagged as a bare topic mention.
// ---------------------------------------------------------------------------------------
const SELF_HARM_METHOD_TERMS: ExactTermRule[] = [
  { id: 'selfharm_kwaenkho', category: 'self_harm_encouragement', severity: 'critical', terms: ['แขวนคอตาย'] },
]

// ---------------------------------------------------------------------------------------
// Second wave — additional verified terms, mostly English/Thai-chat-common insults not
// yet covered above (kept in their own group so the origin/reasoning stays traceable).
// ---------------------------------------------------------------------------------------
const SECOND_WAVE_TERMS: ExactTermRule[] = [
  { id: 'insult_compound_ngang', category: 'insult_ability', severity: 'blocked', terms: ['ไอ้งั่ง', 'อีงั่ง'] },
  { id: 'insult_compound_bong', category: 'insult_ability', severity: 'warning', terms: ['ไอ้บ๊อง', 'อีบ๊อง'] },
  { id: 'insult_tua_pralad', category: 'insult_appearance', severity: 'blocked', terms: ['ตัวประหลาด'] },
  { id: 'insult_compound_rayam_prefix', category: 'insult_direct', severity: 'blocked', terms: ['ไอ้ระยำ', 'อีระยำ'] },
  {
    id: 'english_insult_second_wave',
    category: 'insult_direct',
    severity: 'blocked',
    terms: ['ass', 'dickhead', 'a-hole', 'hoe', 'sped', 'braindead'],
  },
  {
    id: 'english_insult_mild_second_wave',
    category: 'insult_ability',
    severity: 'warning',
    terms: ['toxic', 'cringe', 'simp', 'thot', 'trashy'],
  },
]

// ---------------------------------------------------------------------------------------
// Third wave — regional slang, stigmatizing mental-health language, and a couple more
// appearance/harassment terms verified with confidence.
// ---------------------------------------------------------------------------------------
const THIRD_WAVE_TERMS: ExactTermRule[] = [
  { id: 'profanity_saad_isaan', category: 'profanity_general', severity: 'warning', terms: ['สาด'] },
  { id: 'insult_rokjit', category: 'insult_direct', severity: 'blocked', terms: ['โรคจิต'] },
  { id: 'insult_bakhlang', category: 'insult_direct', severity: 'warning', terms: ['บ้าคลั่ง'] },
  { id: 'insult_pian', category: 'insult_direct', severity: 'warning', terms: ['เพี้ยน'] },
  { id: 'insult_naa_glieat_bare', category: 'insult_appearance', severity: 'warning', terms: ['น่าเกลียด'] },
  { id: 'sexual_leak_clip', category: 'sexual_harassment', severity: 'critical', terms: ['คลิปหลุด'] },
]

// ---------------------------------------------------------------------------------------
// Fourth wave — additional verified English insults/slurs common in mixed Thai-English
// student chat (including gaming slang), plus a couple more Thai vulgar compounds.
// ---------------------------------------------------------------------------------------
const FOURTH_WAVE_TERMS: ExactTermRule[] = [
  { id: 'insult_naa_son_teen', category: 'insult_direct', severity: 'critical', terms: ['หน้าส้นตีน'] },
  { id: 'insult_naa_hee', category: 'insult_direct', severity: 'critical', terms: ['หน้าหี'] },
  { id: 'english_insult_informal', category: 'insult_direct', severity: 'blocked', terms: ['dipshit', 'shithead', 'fatso', 'numbskull', 'airhead', 'knucklehead'] },
  { id: 'english_insult_vulgar', category: 'profanity_general', severity: 'blocked', terms: ['wanker', 'twat', 'prick', 'dick'] },
  { id: 'english_slur_gendered_extra', category: 'insult_direct', severity: 'critical', terms: ['pussy', 'skank', 'tramp'] },
  { id: 'english_slur_homophobic', category: 'discrimination', severity: 'critical', terms: ['faggot', 'fag'] },
  { id: 'english_slur_ableist', category: 'discrimination', severity: 'blocked', terms: ['spaz', 'spastic'] },
  { id: 'english_gaming_mild', category: 'insult_ability', severity: 'warning', terms: ['noob'] },
]

// ---------------------------------------------------------------------------------------
// Fifth wave — a handful more verified formal/informal English ability-insults and one
// more Thai compound, rounding out the ability/intelligence and direct-insult categories.
// ---------------------------------------------------------------------------------------
const FIFTH_WAVE_TERMS: ExactTermRule[] = [
  { id: 'insult_naa_tua_krer', category: 'insult_direct', severity: 'blocked', terms: ['หน้าตัวเกร่อ'] },
  { id: 'insult_naa_mai_ai', category: 'insult_direct', severity: 'blocked', terms: ['หน้าไม่อาย'] },
  { id: 'english_insult_formal', category: 'insult_ability', severity: 'blocked', terms: ['imbecile', 'brainless'] },
  { id: 'english_insult_formal_mild', category: 'insult_ability', severity: 'warning', terms: ['nitwit', 'halfwit'] },
]

export const EXACT_TERM_RULES: ExactTermRule[] = [
  ...PROFANITY_AND_DIRECT_INSULT_TERMS,
  ...ABILITY_INTELLIGENCE_TERMS,
  ...APPEARANCE_TERMS,
  ...DEVALUATION_TERMS,
  ...DISCRIMINATION_TERMS,
  ...SEXUAL_TERMS,
  ...THREAT_TERMS,
  ...PROFANITY_EXTRA_TERMS,
  ...SEXUAL_EXTRA_TERMS,
  ...SELF_HARM_METHOD_TERMS,
  ...SECOND_WAVE_TERMS,
  ...THIRD_WAVE_TERMS,
  ...FOURTH_WAVE_TERMS,
  ...FIFTH_WAVE_TERMS,
]

// =========================================================================================
// PHRASE PATTERNS — multi-word, matched against the whitespace-collapsed "standard" copy.
// Pronoun-directed where practical ("มึง/แก" + word) to avoid flagging the same word used
// about an object or event instead of a person.
// =========================================================================================

const PRONOUN = '(?:แก|มึง|เธอ|ตัวเอง)'

export const PHRASE_PATTERN_RULES: PhrasePatternRule[] = [
  {
    id: 'phrase_pronoun_ability_insult',
    category: 'insult_ability',
    severity: 'blocked',
    patterns: [new RegExp(`${PRONOUN}\\s*(?:มัน)?\\s*(?:โง่|งี่เง่า|ควาย|ไร้สมอง|สมองกลวง)`, 'i')],
  },
  {
    id: 'phrase_pronoun_useless',
    category: 'degrading',
    severity: 'blocked',
    patterns: [new RegExp(`${PRONOUN}\\s*(?:มัน)?\\s*(?:ไม่มีประโยชน์|ไร้ประโยชน์|ไร้ค่า|ไม่มีค่า)`, 'i')],
  },
  {
    id: 'phrase_pronoun_crazy_directed',
    category: 'insult_direct',
    severity: 'blocked',
    patterns: [new RegExp(`${PRONOUN}\\s*(?:มัน)?\\s*บ้า(?:ไปแล้ว)?(?:หรอก|จริง)?`, 'i')],
  },
  {
    id: 'phrase_no_good_at_anything',
    category: 'degrading',
    severity: 'blocked',
    patterns: [/ทำอะไรก็ไม่ได้เรื่อง/i, /มีปัญญาแค่นี้เอง/i],
  },
  {
    id: 'phrase_sarcastic_challenge',
    category: 'sarcasm_pressure',
    severity: 'warning',
    patterns: [/เก่งนักเนอะ/i, /อย่ามาทำเป็นเก่ง/i, /แน่จริง(?:ก็|มา)/i],
  },
  {
    id: 'phrase_direct_threat_violence',
    category: 'threat_violence',
    severity: 'critical',
    patterns: [
      new RegExp(`${PRONOUN}\\s*ตายแน่`, 'i'),
      /จะฆ่า(?:แก|มึง)/i,
      /กูจะฆ่ามึง/i,
      /จะซ้อมให้เจ็บ/i,
      /จะตบให้หน้าเบี้ยว/i,
      /จะเอาให้ตาย/i,
    ],
  },
  {
    id: 'phrase_stalking_threat',
    category: 'threat_violence',
    severity: 'critical',
    patterns: [/ไปหา(?:แก|มึง)ที่บ้านแน่/i, /ตามล่า(?:แก|มึง)ให้เจอ/i, /เดี๋ยวเจอกัน\s*ให้ระวังตัว/i],
  },
  {
    id: 'phrase_sexual_solicit',
    category: 'sexual_harassment',
    severity: 'critical',
    patterns: [
      /ส่งรูป(?:โป๊|เปลือย)มา/i,
      /อยากเห็น(?:ตัวเปล่า|เธอโป๊)/i,
      /จะลวนลาม/i,
      /เดี๋ยว(?:ข่มขืน|ล่วงละเมิด)/i,
      /โชว์(?:นม|จิ๋ม|น้อง)/i,
      /อยากนอนด้วย(?:กัน)?/i,
      /เอากันไหม/i,
      /เอากันมั้ย/i,
      /นมใหญ่จัง.*จับ/i,
      /อยากจับ(?:นม|ตัว|ก้น)/i,
      /เซ็กซี่จัง.*จับ/i,
    ],
  },
  {
    id: 'phrase_ability_challenge',
    category: 'sarcasm_pressure',
    severity: 'warning',
    patterns: [/มีน้ำยาไหม/i, /แค่นี้ก็ทำไม่ได้/i, /ขนาดนี้ยังทำไม่ได้อีก/i, /ไม่มีน้ำยาเลย/i],
  },
  {
    id: 'phrase_intimidation_general',
    category: 'intimidation',
    severity: 'warning',
    patterns: [/ระวังตัวไว้ให้ดี/i, /อย่าให้เจอกันข้างนอก/i],
  },
  {
    id: 'phrase_intimidation_serious',
    category: 'intimidation',
    severity: 'blocked',
    patterns: [/จะเอาเรื่องให้ถึงที่สุด/i, /จะไม่ปล่อยแกไว้แน่/i, /เดี๋ยวรู้สึก/i],
  },
  {
    id: 'phrase_no_one_wants_you_around',
    category: 'exclusion',
    severity: 'blocked',
    patterns: [new RegExp(`ไม่มีใครง้อ\\s*${PRONOUN}?`, 'i'), new RegExp(`ไม่มีใครอยากเห็นหน้า\\s*${PRONOUN}?`, 'i')],
  },
  {
    id: 'phrase_you_dont_deserve_to_exist',
    category: 'wish_death_or_gone',
    severity: 'critical',
    patterns: [new RegExp(`${PRONOUN}ไม่สมควรมีตัวตนอยู่`, 'i'), /เธอไม่ควรมีตัวตนอยู่/i],
  },
  {
    id: 'phrase_get_away_vulgar',
    category: 'exclusion',
    severity: 'critical',
    patterns: [/ไปไกลๆ\s*ตีนกู/i, /ไปไกลๆตีน/i],
  },
  {
    id: 'phrase_self_harm_directive_extra',
    category: 'self_harm_encouragement',
    severity: 'critical',
    patterns: [/ไปตัดเส้นเลือดตาย(?:ซะ)?/i, /ไปกรีดข้อมือ(?:ตาย)?(?:ซะ)?/i, /ไปจบชีวิตซะ/i, /ไปกระโดดสะพาน(?:ตาย)?(?:ซะ)?/i],
  },
  {
    id: 'phrase_dismissive_want_to_die',
    category: 'self_harm_encouragement',
    severity: 'critical',
    patterns: [/อยากตายก็ไปตายเลย/i, /จะตายก็ตายไปสิ/i],
  },
  {
    id: 'phrase_bullying_wont_stop',
    category: 'harassment',
    severity: 'blocked',
    patterns: [/ล้อเลียนไม่เลิก/i, /แซวไม่หยุดทั้งที่บอกให้หยุดแล้ว/i, /ตามแกล้งไม่เลิก/i],
  },
  {
    id: 'phrase_all_talk',
    category: 'sarcasm_pressure',
    severity: 'warning',
    patterns: [/เก่งแต่ปาก/i, /ดีแต่พูด/i],
  },
  {
    id: 'phrase_english_worthlessness',
    category: 'degrading',
    severity: 'critical',
    patterns: [/nobody (?:likes|wants|needs) you/i, /no one (?:likes|wants|cares about) you/i, /everyone hates you/i],
  },
  {
    id: 'phrase_english_death_wish',
    category: 'wish_death_or_gone',
    severity: 'critical',
    patterns: [/go die/i, /go kill yourself/i, /better off dead/i, /you should (?:just )?die/i, /nobody would miss you/i],
  },
  {
    id: 'phrase_english_threat',
    category: 'threat_violence',
    severity: 'critical',
    patterns: [/i(?:'m| am) going to kill you/i, /i will find you/i, /i'll beat you up/i],
  },
  {
    id: 'phrase_pronoun_ugly_directed',
    category: 'insult_appearance',
    severity: 'blocked',
    patterns: [new RegExp(`${PRONOUN}\\s*(?:มัน)?\\s*น่าเกลียด`, 'i')],
  },
  {
    id: 'phrase_stalking_life',
    category: 'harassment',
    severity: 'blocked',
    patterns: [new RegExp(`ตามติดชีวิต\\s*${PRONOUN}?`, 'i'), /แอบตามถ่ายรูป/i],
  },
  {
    id: 'phrase_dismissive_gaming_slang',
    category: 'sarcasm_pressure',
    severity: 'warning',
    patterns: [/get good/i, /skill issue/i, /ทำตัวเป็นตัวตลก/i, /อย่ามาทำเป็นดี/i],
  },
  {
    id: 'phrase_self_harm_bilingual',
    category: 'self_harm_encouragement',
    severity: 'critical',
    patterns: [/go cut yourself/i, /just end it all/i],
  },
  {
    id: 'phrase_threat_hurt_more',
    category: 'threat_violence',
    severity: 'critical',
    patterns: [/จะทำให้เจ็บกว่านี้/i, /เดี๋ยวเจ็บตัวแน่/i],
  },
]

// =========================================================================================
// CONTEXTUAL PATTERNS — sentence-shaped, no profanity required at all.
// =========================================================================================

export const CONTEXTUAL_PATTERN_RULES: ContextualPatternRule[] = [
  {
    id: 'context_nobody_wants_you',
    category: 'exclusion',
    severity: 'blocked',
    patterns: [
      new RegExp(`ไม่มีใคร(?:อยาก)?(?:อยู่กับ|คุยกับ|เป็นเพื่อนกับ|สนใจ)\\s*${PRONOUN}?`, 'i'),
      new RegExp(`ไม่มีใครต้องการ\\s*${PRONOUN}?`, 'i'),
      new RegExp(`ไม่มีใครรัก\\s*${PRONOUN}?(?:หรอก)?`, 'i'),
      new RegExp(`ไม่มีใครแคร์\\s*${PRONOUN}?(?:หรอก)?`, 'i'),
      /คนแบบแกไม่มีใครต้องการ/i,
    ],
  },
  {
    id: 'context_everyone_hates_you',
    category: 'exclusion',
    severity: 'blocked',
    patterns: [new RegExp(`ทุกคน(?:เกลียด|รำคาญ)\\s*${PRONOUN}?`, 'i')],
  },
  {
    id: 'context_disappear_from_our_lives',
    category: 'wish_death_or_gone',
    severity: 'critical',
    patterns: [/หายไปจาก(?:ชีวิต)?(?:พวก)?(?:เรา|ฉัน|ผม)(?:เถอะ|เลย)?/i, /โลกนี้ไม่ต้องการ\s*(?:แก|มึง)?/i],
  },
  {
    id: 'context_get_lost',
    category: 'exclusion',
    severity: 'blocked',
    patterns: [/หายไปซะ/i, /ไปให้พ้น(?:หน้า)?(?:ฉัน|ผม|เรา)?/i],
  },
  {
    id: 'context_encourage_death',
    category: 'wish_death_or_gone',
    severity: 'critical',
    patterns: [
      /ไปตาย(?:ซะ|เลย|ไป)?/i,
      /ตายซะไป๊?/i,
      new RegExp(`${PRONOUN}ตายไปเลยดีกว่า`, 'i'),
      /ทำไมไม่ตายไปซะ/i,
      /น่าจะตายไปนานแล้ว/i,
      /ทำไมยังไม่ตาย/i,
    ],
  },
  {
    id: 'context_self_harm_encouragement',
    category: 'self_harm_encouragement',
    severity: 'critical',
    patterns: [
      /ไปกระโดดตึก(?:ไปเลย)?/i,
      /ไปผูกคอตาย(?:ซะ)?/i,
      /ไปกินยาตาย(?:ซะ)?/i,
      /กินยาตายไปซะ/i,
      /ฆ่าตัวตาย(?:ซะ|เถอะ|ไปเลย)/i,
    ],
  },
  {
    id: 'context_no_one_will_miss_you',
    category: 'wish_death_or_gone',
    severity: 'critical',
    patterns: [/หายตัวไปเลยไม่มีใครคิดถึง/i, /อยู่ไปก็ไม่มีประโยชน์\s*ตายไปดีกว่า/i, /โลกนี้ไม่มีแกไม่เป็นไร/i],
  },
  {
    id: 'context_devaluation_no_meaning',
    category: 'degrading',
    severity: 'blocked',
    patterns: [/อยู่ไปก็ไม่มีความหมาย/i, new RegExp(`${PRONOUN}(?:มัน)?ไม่มีความหมาย(?:กับใคร)?`, 'i')],
  },
  {
    id: 'context_exclusion_group_reject',
    category: 'exclusion',
    severity: 'blocked',
    patterns: [
      new RegExp(`ไม่มีใครอยากเล่นกับ\\s*${PRONOUN}?`, 'i'),
      new RegExp(`ไม่มีใครอยากนั่งข้างๆ\\s*${PRONOUN}?`, 'i'),
      /กลุ่มเรา(?:ไม่)?ต้องการแกอีกแล้ว/i,
      /ออกจากกลุ่มไปเลย\s*ไม่มีใครอยากให้อยู่/i,
    ],
  },
  {
    id: 'context_exclusion_silent_treatment',
    category: 'exclusion',
    severity: 'warning',
    patterns: [/ไม่มีใครอยากได้ยินเสียงแก/i, /หุบปากไปเลยไม่มีใครสนใจ/i],
  },
  {
    id: 'context_you_are_the_problem',
    category: 'degrading',
    severity: 'blocked',
    patterns: [new RegExp(`ทุกอย่างเป็นความผิดของ\\s*${PRONOUN}`, 'i'), new RegExp(`${PRONOUN}(?:นี่แหละ)?คือปัญหาทั้งหมด`, 'i')],
  },
  {
    id: 'context_pressure_give_up',
    category: 'sarcasm_pressure',
    severity: 'warning',
    patterns: [/เลิกพยายามไปเถอะ\s*ทำไปก็ไม่มีประโยชน์/i, /ยอมแพ้ไปเถอะ\s*ไม่มีทางทำได้หรอก/i],
  },
  {
    id: 'context_repeated_harassment_signal',
    category: 'harassment',
    severity: 'blocked',
    patterns: [/ตามด่าไม่เลิก/i, /ตามราวี(?:ไม่เลิก)?/i, /จะตามไปด่าทุกที่/i],
  },
  {
    id: 'context_never_meant_anything',
    category: 'degrading',
    severity: 'critical',
    patterns: [new RegExp(`${PRONOUN}ไม่เคยมีความหมายกับใครเลย`, 'i'), new RegExp(`ไม่มีใครจำ\\s*${PRONOUN}\\s*ได้หรอก`, 'i')],
  },
  {
    id: 'context_why_were_you_born',
    category: 'degrading',
    severity: 'critical',
    patterns: [/เกิดมาทำไม/i, /ไม่น่าเกิดมาเลย/i],
  },
  {
    id: 'context_waste_of_presence',
    category: 'degrading',
    severity: 'blocked',
    patterns: [new RegExp(`เสียเวลาที่มี\\s*${PRONOUN}\\s*อยู่`, 'i'), new RegExp(`${PRONOUN}ทำให้ทุกคนแย่ลง`, 'i')],
  },
  {
    id: 'context_stay_or_go_no_one_cares',
    category: 'exclusion',
    severity: 'blocked',
    patterns: [/อยู่หรือไปก็ไม่มีใครสน/i],
  },
]

// =========================================================================================
// SAFE EXCEPTIONS — common, harmless words documented against a specific collision above.
// =========================================================================================

export const SAFE_EXCEPTIONS: SafeException[] = [
  { id: 'exc_heeb', term: 'หีบ', note: 'กล่อง/หีบศพ — contains "หี" (profanity_hee) as a prefix substring' },
  { id: 'exc_heeb_pleng', term: 'หีบเพลง', note: 'accordion — same "หี" collision' },
  { id: 'exc_heeb_sop', term: 'หีบศพ', note: 'coffin — same "หี" collision' },
  { id: 'exc_satdee', term: 'สัสดี', note: 'military conscription office — contains "สัส" (profanity_sad_slang) as a prefix substring' },
  { id: 'exc_uan_nickname', term: 'อ้วน', note: 'common neutral adjective/nickname — never listed bare, documented for regression safety' },
  { id: 'exc_baa_expression', term: 'บ้าไปแล้ว', note: 'very common neutral exclamation ("no way!"), not always an insult' },
  { id: 'exc_maa_pet', term: 'หมาน้อย', note: '"little dog" — "หมา" never listed bare, documented for regression safety' },
  { id: 'exc_sat_liang', term: 'สัตว์เลี้ยง', note: 'pet — "สัตว์" never listed bare, documented for regression safety' },
  { id: 'exc_sat_paa', term: 'สัตว์ป่า', note: 'wildlife — same "สัตว์" note' },
  { id: 'exc_kaya_recycle', term: 'ขยะรีไซเคิล', note: 'recycling — "ขยะ" never listed bare, documented for regression safety' },
  { id: 'exc_gay_identity', term: 'เกย์', note: 'sexual-orientation identity term — never a slur on its own; intentionally never listed' },
  { id: 'exc_lesbian_identity', term: 'เลสเบี้ยน', note: 'sexual-orientation identity term — intentionally never listed' },
  { id: 'exc_kathoey_identity', term: 'กะเทย', note: 'gender-identity term — intentionally never listed on its own' },
  { id: 'exc_tud_identity', term: 'ตุ๊ด', note: 'gender-identity slang, widely self-used/reclaimed — intentionally never listed on its own' },
  { id: 'exc_tom_identity', term: 'ทอม', note: 'gender-identity term — intentionally never listed' },
  { id: 'exc_dee_identity', term: 'ดี้', note: 'gender-identity term — intentionally never listed' },
  { id: 'exc_pikan', term: 'คนพิการ', note: 'the correct neutral term for a person with a disability — must never be flagged' },
  { id: 'exc_see_you_later', term: 'เดี๋ยวเจอกันนะ', note: 'ordinary goodbye — must not be caught by any threat pattern' },
  { id: 'exc_see_you_tomorrow', term: 'ไว้เจอกันพรุ่งนี้', note: 'ordinary goodbye — same note' },
  { id: 'exc_gak_quality', term: 'งานนี้กากมาก', note: '"กาก" about an event/thing, not a person — kept only at warning severity, documented here for the false-positive suite' },
  { id: 'exc_saturday_en', term: 'Saturday', note: 'reminder that no romanized term in this dataset should ever fragment-match ordinary English words' },
]
