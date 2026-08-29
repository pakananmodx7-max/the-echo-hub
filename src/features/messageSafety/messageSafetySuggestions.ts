import type { SafetyCategory } from './messageSafetyRules'

/**
 * Lightweight, rule-based "ช่วยปรับคำพูด" rewrite templates — deliberately NOT an AI
 * rewrite of the student's exact words (that would need a new backend/service, out of
 * scope for this phase per spec). Each category maps to one gentle, generic alternative
 * that keeps the underlying feeling ("I'm not okay with this") while dropping the harm.
 * Shown as a separate suggestion the student can choose to use — never auto-applied.
 */
const CATEGORY_SUGGESTIONS: Partial<Record<SafetyCategory, string>> = {
  profanity_general: 'เรารู้สึกไม่โอเคกับสิ่งที่เกิดขึ้น อยากลองคุยกันใหม่ได้ไหม',
  insult_direct: 'เรารู้สึกไม่โอเคกับสิ่งที่เกิดขึ้น อยากลองคุยกันใหม่ได้ไหม',
  insult_ability: 'เรารู้สึกไม่โอเคกับสิ่งที่เกิดขึ้น อยากลองคุยกันใหม่ได้ไหม',
  insult_appearance: 'เราอยากบอกความรู้สึกโดยไม่พูดถึงรูปลักษณ์ ลองคุยกันแบบนี้ได้ไหม',
  degrading: 'ตอนนี้เราอาจยังไม่พร้อมคุยต่อ ขอพักก่อนนะ',
  exclusion: 'ตอนนี้เราอาจยังไม่พร้อมคุยต่อ ขอพักก่อนนะ',
  sarcasm_pressure: 'เราอยากคุยกันด้วยความเข้าใจมากกว่านี้ ลองพูดตรง ๆ กันได้ไหม',
  intimidation: 'เรารู้สึกไม่สบายใจกับสถานการณ์นี้ ขอพักตรงนี้ก่อนนะ',
  harassment: 'เราขอพื้นที่ส่วนตัวสักครู่นะ ขอบคุณที่เข้าใจ',
  threat_violence: 'เราไม่สบายใจกับสิ่งที่กำลังจะพูด ลองใจเย็นลงก่อนแล้วค่อยคุยกันนะ',
  self_harm_encouragement: 'ถ้ารู้สึกแบบนี้ ลองบอกใครสักคนที่ไว้ใจได้ หรือคุยกับเราตรงนี้ก็ได้นะ',
  wish_death_or_gone: 'ตอนนี้เราอาจยังไม่พร้อมคุยต่อ ขอพักก่อนนะ',
  discrimination: 'เราอยากให้ทุกคนรู้สึกปลอดภัยในพื้นที่นี้ ลองพูดโดยไม่ใช้คำเหมารวมได้ไหม',
  sexual_harassment: 'ข้อความนี้อาจทำให้อีกฝ่ายรู้สึกไม่สบายใจ ลองงดพูดเรื่องนี้ก่อนนะ',
}

export function getMessageSafetySuggestion(category: SafetyCategory | undefined): string | undefined {
  if (!category) return undefined
  return CATEGORY_SUGGESTIONS[category]
}
