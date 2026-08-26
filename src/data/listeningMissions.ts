export const LISTENING_MISSIONS: string[] = [
  'วันนี้ลองฟังจนจบโดยไม่แทรก',
  'ถามเพื่อเข้าใจอย่างน้อย 1 คำถาม',
  'สะท้อนสิ่งที่ได้ยินกลับ 1 ครั้ง',
  'วันนี้ไม่ต้องรีบให้คำแนะนำ',
  'ให้เจ้าของภาพเป็นคนกำหนดว่าอยากเล่าแค่ไหน',
  'ลองฟังโดยไม่เดาว่าอีกฝ่ายกำลังรู้สึกอะไร',
  'หลังจากฟังจบ ลองพูดว่า "ขอบคุณที่เล่าให้ฟังนะ"',
]

export function randomMission(exclude?: string): string {
  if (LISTENING_MISSIONS.length <= 1) return LISTENING_MISSIONS[0]
  let next = LISTENING_MISSIONS[Math.floor(Math.random() * LISTENING_MISSIONS.length)]
  while (next === exclude) {
    next = LISTENING_MISSIONS[Math.floor(Math.random() * LISTENING_MISSIONS.length)]
  }
  return next
}

export const DONT_INTERPRET_EXAMPLES: { avoid: string; askInstead: string }[] = [
  { avoid: 'ใช้สีดำ แปลว่ากำลังเศร้าแน่เลย', askInstead: 'สีดำในรูปนี้มีความหมายอะไรสำหรับคุณ?' },
  {
    avoid: 'วาดแบบนี้เพราะมีปัญหากับครอบครัวหรือเปล่า?',
    askInstead: 'มีส่วนไหนของภาพที่อยากเล่าให้เราฟังไหม?',
  },
  { avoid: 'ทำไมถึงวาดแบบนี้?', askInstead: 'ถ้าอยากเล่า คุณอยากเริ่มจากส่วนไหนของภาพ?' },
]

export const LISTENER_REFLECTION_OPTIONS: { id: string; label: string }[] = [
  { id: 'understood-more', label: 'เข้าใจอีกฝ่ายมากขึ้น' },
  { id: 'ask-not-assume', label: 'รู้จักถามแทนการเดา' },
  { id: 'listened-fully', label: 'ฟังจนจบได้ดีขึ้น' },
  { id: 'no-rush-advice', label: 'รู้ว่าบางครั้งไม่ต้องรีบให้คำตอบ' },
  { id: 'let-them-choose', label: 'รู้ว่าควรให้อีกฝ่ายเลือกเองว่าอยากเล่าแค่ไหน' },
  { id: 'other', label: 'อื่น ๆ' },
]
