export const LISTENING_STONE_PROMPTS: string[] = [
  'ช่วงนี้มีอะไรเล็ก ๆ ที่ทำให้คุณยิ้ม?',
  'เพลงไหนแทนอารมณ์วันนี้ของคุณ?',
  'มีอะไรที่กำลังตั้งตารออยู่ไหม?',
  'ถ้าไปพักที่ไหนก็ได้ตอนนี้ อยากไปที่ไหน?',
  'วันนี้มีอะไรที่อยากขอบคุณ?',
  'ช่วงนี้มีเพลงอะไรฟังบ่อย?',
  'ถ้าวันนี้เป็นสีหนึ่งสี จะเป็นสีอะไร?',
  'มีเรื่องดี ๆ เล็ก ๆ อะไรเกิดขึ้นในสัปดาห์นี้?',
]

export function randomListeningPrompt(exclude?: string): string {
  if (LISTENING_STONE_PROMPTS.length <= 1) return LISTENING_STONE_PROMPTS[0]
  let next = LISTENING_STONE_PROMPTS[Math.floor(Math.random() * LISTENING_STONE_PROMPTS.length)]
  while (next === exclude) {
    next = LISTENING_STONE_PROMPTS[Math.floor(Math.random() * LISTENING_STONE_PROMPTS.length)]
  }
  return next
}

export const GARDEN_LISTENING_MISSIONS: string[] = [
  'ฟังจนจบโดยไม่แทรก',
  'ถามเพื่อเข้าใจแทนการเดา',
  'สะท้อนสิ่งที่ได้ยินกลับหนึ่งครั้ง',
  'วันนี้ไม่ต้องรีบให้คำแนะนำ',
  'ให้อีกฝ่ายเลือกเองว่าอยากเล่าแค่ไหน',
  'ลองพูดว่า "ขอบคุณที่เล่าให้ฟังนะ"',
]

export function randomGardenMission(exclude?: string): string {
  if (GARDEN_LISTENING_MISSIONS.length <= 1) return GARDEN_LISTENING_MISSIONS[0]
  let next = GARDEN_LISTENING_MISSIONS[Math.floor(Math.random() * GARDEN_LISTENING_MISSIONS.length)]
  while (next === exclude) {
    next = GARDEN_LISTENING_MISSIONS[Math.floor(Math.random() * GARDEN_LISTENING_MISSIONS.length)]
  }
  return next
}

export const KIND_WORD_PRESETS: string[] = [
  'วันนี้ทำดีมากแล้วนะ',
  'ขอบคุณที่อยู่ตรงนี้',
  'พักบ้างก็ได้นะ',
  'ขอให้วันนี้มีเรื่องดี ๆ เกิดขึ้น',
  'เป็นกำลังใจให้นะ 🤍',
  'ขอบคุณที่รับฟัง',
  'ขอให้วันพรุ่งนี้เบากว่าวันนี้',
]

export const KIND_WORD_MAX_LENGTH = 60
export const GARDEN_CHAT_MAX_LENGTH = 200
export const GARDEN_CHAT_MIN_INTERVAL_MS = 2000
