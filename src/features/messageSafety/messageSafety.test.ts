import { describe, expect, it } from 'vitest'
import { evaluateMessageSafety } from './evaluateMessageSafety'

function expectSafe(text: string) {
  const result = evaluateMessageSafety(text)
  expect(result.allowed, `expected "${text}" to be allowed, got severity=${result.severity} rule=${result.matchedRuleId}`).toBe(true)
}

function expectBlocked(text: string) {
  const result = evaluateMessageSafety(text)
  expect(result.allowed, `expected "${text}" to be blocked, got severity=${result.severity}`).toBe(false)
  expect(['blocked', 'critical']).toContain(result.severity)
}

function expectCritical(text: string) {
  const result = evaluateMessageSafety(text)
  expect(result.allowed, `expected "${text}" to be blocked, got severity=${result.severity}`).toBe(false)
  expect(result.severity, `expected "${text}" to be critical`).toBe('critical')
}

function expectWarningButAllowed(text: string) {
  const result = evaluateMessageSafety(text)
  expect(result.allowed, `expected "${text}" to remain sendable (warning tier)`).toBe(true)
  expect(result.severity).toBe('warning')
}

// =========================================================================================
// 1) CLEARLY SAFE MESSAGES
// =========================================================================================
describe('safe messages', () => {
  const safeMessages = [
    'วันนี้เป็นยังไงบ้าง',
    'ถ้าอยากเล่า เราฟังอยู่นะ',
    'ขอบคุณที่คุยด้วยนะ',
    'สวัสดีตอนเช้า',
    'วันนี้อากาศดีมากเลย',
    'พรุ่งนี้มีสอบวิชาอะไรบ้าง',
    'เธอกินข้าวหรือยัง',
    'เราคิดถึงเธอนะ',
    'อยากไปเที่ยวด้วยกันไหม',
    'ขอบคุณสำหรับกำลังใจนะ',
    'เราเข้าใจความรู้สึกของเธอนะ',
    'ไม่เป็นไรนะ ค่อย ๆ ทำไป',
    'สู้ ๆ นะ เราเป็นกำลังใจให้',
    'พักผ่อนเยอะ ๆ นะวันนี้',
    'เดี๋ยวเจอกันพรุ่งนี้นะ',
    'ขอโทษที่มาช้านะ รถติดมาก',
    'วันนี้เรียนอะไรบ้าง',
    'ช่วยส่งการบ้านให้หน่อยได้ไหม',
    'อยากกินอะไรวันนี้',
    'เราจะไปดูหนังกันไหม',
    'เธอเก่งมากเลยวันนี้',
    'ทำได้ดีมากเลยนะ ภูมิใจในตัวเธอ',
    'เราเป็นเพื่อนกันตลอดไปนะ',
    'มีอะไรให้ช่วยไหม บอกได้เลยนะ',
    'วันนี้เหนื่อยไหม พักก่อนก็ได้นะ',
    'ขอบคุณที่รับฟังเรานะ มันช่วยได้เยอะเลย',
    'เราอยากบอกว่าเธอสำคัญกับเรามากนะ',
    'ไม่ต้องรีบ ค่อย ๆ คิดก็ได้',
    'เธอทำดีที่สุดแล้วนะ',
    'แล้วเจอกันที่โรงเรียนนะ',
    'ลองพักสายตาสักครู่นะ',
    'เราส่งเพลงนี้ให้เธอฟังนะ หวังว่าจะชอบ',
    'วันนี้ฉันรู้สึกดีขึ้นเยอะเลย ขอบคุณนะ',
    'อยากคุยเรื่องนี้กับเธอมานานแล้ว',
  ]

  it.each(safeMessages)('allows: %s', (msg) => expectSafe(msg))

  it('allows an empty string', () => {
    const result = evaluateMessageSafety('')
    expect(result.allowed).toBe(true)
    expect(result.severity).toBe('safe')
  })

  it('allows a whitespace-only string', () => {
    expectSafe('   ')
  })
})

// =========================================================================================
// 2) EMOJI COMPATIBILITY
// =========================================================================================
describe('emoji compatibility', () => {
  const emojiMessages = ['💜', '🥹🫶', '🌙✨', '💜💜💜', '🤍', '😊', '🎧🎵', '🌸🌷', '✨🫶🤍', '😢💜']
  it.each(emojiMessages)('allows emoji-only: %s', (msg) => expectSafe(msg))

  const emojiPlusSafeText = [
    'ขอบคุณนะ 💜',
    '💜 เราอยู่ตรงนี้เสมอนะ',
    'สู้ ๆ นะ 🫶✨',
    'วันนี้เหนื่อยมาก 🥹 แต่ก็ผ่านมาได้',
    'ส่งเพลงนี้ให้ฟังนะ 🎧 หวังว่าจะชอบ',
  ]
  it.each(emojiPlusSafeText)('allows safe text with emoji: %s', (msg) => expectSafe(msg))
})

// =========================================================================================
// 3) BLOCKED / CRITICAL — profanity directed at a user
// =========================================================================================
describe('blocked: profanity directed at a user', () => {
  const cases = ['แกมันควย', 'ไอ้เหี้ย', 'อีเหี้ยเอ๊ย', 'มึงมันตอแหล', 'อีดอกทอง', 'กระหรี่', 'อีสัตว์', 'ไอ้หมา', 'ไอ้ควาย']
  it.each(cases)('blocks: %s', (msg) => expectBlocked(msg))
})

// =========================================================================================
// 4) BLOCKED — direct humiliation / degrading phrases
// =========================================================================================
describe('blocked: humiliation and degrading language', () => {
  const cases = [
    'แกมันไร้ค่า',
    'แกไม่มีค่าอะไรเลย',
    'แกมันไม่มีประโยชน์',
    'ทำอะไรก็ไม่ได้เรื่อง',
    'มีปัญญาแค่นี้เอง',
    'น่าสมเพชจริง ๆ',
    'แกเป็นภาระของทุกคน',
    'ปัญญาอ่อนจริง ๆ',
    'หน้าด้านมาก',
    'ไร้ยางอายจริง ๆ',
    'อัปลักษณ์มาก',
    'ขี้เหร่จนน่าอาย',
    'น่าขยะแขยงมาก',
    'น่ารังเกียจจริง ๆ',
  ]
  it.each(cases)('blocks: %s', (msg) => expectBlocked(msg))
})

// =========================================================================================
// 5) BLOCKED/CRITICAL — social exclusion phrases (no profanity)
// =========================================================================================
describe('blocked/critical: exclusion phrases without profanity', () => {
  const cases: [string, 'blocked' | 'critical'][] = [
    ['ไม่มีใครอยากอยู่กับแกหรอก', 'blocked'],
    ['คนแบบแกไม่มีใครต้องการ', 'blocked'],
    ['ไม่มีใครต้องการแก', 'blocked'],
    ['ไม่มีใครรักแกหรอก', 'blocked'],
    ['ไม่มีใครแคร์แกหรอก', 'blocked'],
    ['ทุกคนเกลียดแก', 'blocked'],
    ['ทุกคนรำคาญแก', 'blocked'],
    ['หายไปจากชีวิตพวกเราเถอะ', 'critical'],
    ['หายไปซะ', 'blocked'],
    ['ไปให้พ้นหน้าฉัน', 'blocked'],
    ['ไม่มีใครง้อแก', 'blocked'],
    ['ไม่มีใครอยากเห็นหน้าแก', 'blocked'],
    ['โลกนี้ไม่ต้องการแก', 'critical'],
  ]
  it.each(cases)('flags "%s" at %s', (msg, severity) => {
    const result = evaluateMessageSafety(msg)
    expect(result.allowed).toBe(false)
    expect(result.severity).toBe(severity)
  })
})

// =========================================================================================
// 6) CRITICAL — threats
// =========================================================================================
describe('critical: threats', () => {
  const cases = [
    'มึงตายแน่',
    'แกตายแน่',
    'กูจะฆ่ามึง',
    'จะฆ่าแก',
    'จะซ้อมให้เจ็บ',
    'จะตบให้หน้าเบี้ยว',
    'ไปหาแกที่บ้านแน่',
    'ตามล่าแกให้เจอ',
    'เดี๋ยวเจอกัน ให้ระวังตัว',
    'จะทำให้เจ็บกว่านี้',
    'i am going to kill you',
    'i will find you',
  ]
  it.each(cases)('blocks: %s', (msg) => expectCritical(msg))
})

// =========================================================================================
// 7) CRITICAL — self-harm encouragement / wish death
// =========================================================================================
describe('critical: self-harm encouragement and wish-death phrases', () => {
  const cases = [
    'ไปตายซะ',
    'ไปตายเลย',
    'แกตายไปเลยดีกว่า',
    'ทำไมไม่ตายไปซะ',
    'น่าจะตายไปนานแล้ว',
    'ฆ่าตัวตายซะ',
    'ไปผูกคอตายซะ',
    'ไปกระโดดตึกไปเลย',
    'ไปกินยาตายไปซะ',
    'ทำไมยังไม่ตาย',
    'หายตัวไปเลยไม่มีใครคิดถึง',
    'go die',
    'go kill yourself',
    'kys',
    'kill yourself',
    'better off dead',
    'you should just die',
    'go cut yourself',
    'just end it all',
    'อยากตายก็ไปตายเลย',
    'เกิดมาทำไม',
    'ไม่น่าเกิดมาเลย',
  ]
  it.each(cases)('blocks: %s', (msg) => expectCritical(msg))
})

// =========================================================================================
// 8) CRITICAL — sexual harassment
// =========================================================================================
describe('critical: sexual harassment', () => {
  const cases = [
    'ส่งรูปโป๊มา',
    'อยากเห็นตัวเปล่า',
    'จะลวนลาม',
    'เดี๋ยวข่มขืน',
    'โชว์นมหน่อย',
    'อยากนอนด้วยกัน',
    'เอากันไหม',
    'คลิปหลุดของเธอสวยจัง',
    'นมใหญ่จัง อยากจับ',
  ]
  it.each(cases)('blocks: %s', (msg) => expectCritical(msg))
})

// =========================================================================================
// 9) BLOCKED/CRITICAL — discrimination and English slurs
// =========================================================================================
describe('blocked/critical: discrimination and slurs', () => {
  const cases = ['ไอ้แขก', 'nigger', 'chink', 'faggot', 'retarded', 'spaz']
  it.each(cases)('blocks: %s', (msg) => expectBlocked(msg))
})

// =========================================================================================
// 10) BLOCKED — English insults common in Thai chats
// =========================================================================================
describe('blocked: English insults common in Thai chats', () => {
  const cases = [
    'you are so stupid',
    'what an idiot',
    'such a loser',
    'you are pathetic',
    'total trash',
    'you are worthless',
    'fuck you',
    'you fucker',
    'bitch please',
    'you are such a bastard',
    'dipshit',
    'shithead',
  ]
  it.each(cases)('blocks: %s', (msg) => expectBlocked(msg))
})

// =========================================================================================
// 11) OBFUSCATED HARMFUL MESSAGES — must still be blocked
// =========================================================================================
describe('obfuscated abusive messages are still caught', () => {
  const cases: [string, string][] = [
    ['spaces inserted', 'ค ว ย'],
    ['dots inserted', 'ค.ว.ย'],
    ['dashes inserted', 'ค-ว-ย'],
    ['underscores inserted', 'ค_ว_ย'],
    ['spaces inserted (hia)', 'เ ห ี้ ย'],
    ['dots inserted (hia)', 'เ.ห.ี้.ย'],
    ['elongated repeats', 'เหี้ยยยยยย'],
    ['elongated repeats 2', 'ตอแหลลลลล'],
    ['English uppercase', 'STUPID'],
    ['English mixed case', 'StUpId'],
    ['English with punctuation', 's.t.u.p.i.d'],
    ['zero-width inserted', 'เ​ห​ี้​ย'],
    ['repeated exclamation + word', 'ไปตาย!!!!ซะ'],
    ['spaced direct insult phrase', 'แก   มัน   โง่'],
    ['dashed english slur', 'f-u-c-k-e-r'],
  ]
  it.each(cases)('%s: %s', (_label, msg) => expectBlocked(msg))
})

// =========================================================================================
// 12) FALSE-POSITIVE / SAFE-EXCEPTION TESTS — must remain allowed
// =========================================================================================
describe('false positives: safe words containing risky substrings stay allowed', () => {
  const cases = [
    'ช่วยหยิบหีบเพลงให้หน่อย',
    'หีบศพถูกเชิญออกจากโบสถ์',
    'เก็บของใส่หีบไว้',
    'ไปติดต่อสัสดีเรื่องเกณฑ์ทหาร',
    'พรุ่งนี้ต้องไปสัสดีตอนเช้า',
    'อ้วนไปโรงเรียนหรือยัง',
    'อ้วน มาเล่นด้วยกันไหม',
    'บ้าไปแล้ว เก่งมากอะ',
    'บ้าไปแล้วแก ตลกมาก',
    'บ้านนอกแต่น่ารักดีนะ',
    'หมาน้อยตัวนี้น่ารักจัง',
    'บ้านนี้มีสัตว์เลี้ยงเยอะมาก',
    'ไปดูสัตว์ป่าที่เขาใหญ่กันไหม',
    'ขยะรีไซเคิลต้องแยกก่อนทิ้ง',
    'ช่วยกันทิ้งขยะให้ถูกที่หน่อย',
    'เขาเป็นเกย์และภูมิใจในตัวเอง',
    'เพื่อนฉันเป็นเลสเบี้ยน เราเคารพเขานะ',
    'กะเทยคนนี้ใจดีมากเลย',
    'เพื่อนเราเป็นคนพิการแต่เก่งมาก',
    'เดี๋ยวเจอกันนะ บาย',
    'ไว้เจอกันพรุ่งนี้นะ',
    'งานนี้กากมากเลย ทำไมจัดแบบนี้',
    'ทีมนี้เล่นแบบ noob มากเลยวันนี้ ฮ่า ๆ',
    'Saturday นี้ว่างไหม',
    'อยากไปดูหนัง Saturday นี้',
  ]
  it.each(cases)('allows: %s', (msg) => expectSafe(msg))
})

// =========================================================================================
// 13) CONTEXTUAL / SUPPORTIVE — self-harm topic mentioned supportively must stay safe
// =========================================================================================
describe('context: supportive/help-seeking language about hard topics stays safe', () => {
  const cases = [
    'ถ้าเธอรู้สึกอยากทำร้ายตัวเอง บอกเรานะ เราพร้อมฟัง',
    'ถ้าคิดสั้น อยากให้บอกเรานะ',
    'เราเป็นห่วงเธอมาก ถ้ารู้สึกแย่ลองคุยกับเราได้เสมอนะ',
    'มีสายด่วนสุขภาพจิตที่ช่วยได้นะ ลองโทรดูไหม',
    'ไม่ต้องกลัวที่จะขอความช่วยเหลือนะ',
    'ครูอยากให้ทุกคนรู้ว่าเราพร้อมรับฟังเสมอ',
  ]
  it.each(cases)('allows: %s', (msg) => expectSafe(msg))
})

// =========================================================================================
// 14) WARNING TIER — ambiguous/harsh but still sendable
// =========================================================================================
describe('warning tier: ambiguous harsh wording remains sendable', () => {
  const cases = ['เธอนี่โง่จัง (ล้อเล่นนะ)', 'ควายชะมัด ฮ่าๆ', 'พูดแบบนี้มันโง่นะ', 'กากมากอะ งานนี้', 'ไร้สาระสิ้นดี']
  it.each(cases)('allows with warning: %s', (msg) => expectWarningButAllowed(msg))
})

// =========================================================================================
// 15) NEUTRAL DISAGREEMENT — must not be blocked
// =========================================================================================
describe('neutral disagreement stays safe', () => {
  const cases = [
    'เราไม่เห็นด้วยกับความคิดนี้นะ',
    'เราคิดว่าอาจจะไม่ใช่ทางที่ดีที่สุด',
    'ขอคิดต่างจากเธอหน่อยนะ',
    'อันนี้เราว่าลองทางอื่นดีกว่า',
    'เราว่าเราสองคนมองต่างมุมกันนะ',
  ]
  it.each(cases)('allows: %s', (msg) => expectSafe(msg))
})

// =========================================================================================
// 16) RESULT SHAPE / ENGINE BEHAVIOR
// =========================================================================================
describe('evaluateMessageSafety() result shape', () => {
  it('returns category and matchedRuleId when blocked', () => {
    const result = evaluateMessageSafety('ไปตายซะ')
    expect(result.allowed).toBe(false)
    expect(result.severity).toBe('critical')
    expect(result.category).toBeTruthy()
    expect(result.matchedRuleId).toBeTruthy()
  })

  it('returns a suggestion when blocked', () => {
    const result = evaluateMessageSafety('แกมันไม่มีประโยชน์')
    expect(result.allowed).toBe(false)
    expect(result.suggestion).toBeTruthy()
  })

  it('never returns a suggestion when allowed', () => {
    const safe = evaluateMessageSafety('สวัสดีตอนเช้า')
    expect(safe.suggestion).toBeUndefined()
    const warning = evaluateMessageSafety('เธอนี่โง่จัง (ล้อเล่นนะ)')
    expect(warning.suggestion).toBeUndefined()
  })

  it('picks the worst severity when multiple rules match', () => {
    // "ไอ้เหี้ย" (blocked/critical compound) + a death-wish phrase in the same message
    const result = evaluateMessageSafety('ไอ้เหี้ย ไปตายซะ')
    expect(result.severity).toBe('critical')
  })

  it('does not mutate or trim the caller-visible input in any way', () => {
    const input = '  hello there  '
    evaluateMessageSafety(input)
    expect(input).toBe('  hello there  ')
  })
})
