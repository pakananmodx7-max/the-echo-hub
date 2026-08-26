export const DRAW_PROMPTS: string[] = [
  'วาดหนึ่งสิ่งที่ทำให้ช่วงนี้คุณมีความสุข',
  'ถ้าวันนี้ของคุณเป็นสีหนึ่งสี จะเป็นสีอะไร?',
  'วาดสถานที่ที่ทำให้คุณรู้สึกสบายใจ',
  'วาดสิ่งเล็ก ๆ ที่คุณอยากขอบคุณ',
  'วาดหนึ่งสิ่งที่อยากให้คนตรงหน้ารู้จักเกี่ยวกับตัวคุณ',
  'ถ้าสัปดาห์นี้เป็นภาพหนึ่งภาพ คุณจะวาดอะไร?',
  'วาดความทรงจำดี ๆ ที่อยากเล่าให้คนตรงหน้าฟัง',
  'วาดสิ่งหนึ่งที่ทำให้คุณยิ้มในช่วงนี้',
  'วาดสิ่งที่อยากทำด้วยกันสักครั้ง',
  'วาดสถานที่ที่อยากไปกับคนตรงหน้า',
  'วาดสามสิ่งที่ทำให้วันนี้ดีขึ้นได้',
  'วาดสิ่งเล็ก ๆ ที่คุณกำลังตั้งตารอ',
]

export function randomPrompt(exclude?: string): string {
  if (DRAW_PROMPTS.length <= 1) return DRAW_PROMPTS[0]
  let next = DRAW_PROMPTS[Math.floor(Math.random() * DRAW_PROMPTS.length)]
  while (next === exclude) {
    next = DRAW_PROMPTS[Math.floor(Math.random() * DRAW_PROMPTS.length)]
  }
  return next
}
