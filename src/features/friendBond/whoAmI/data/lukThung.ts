import type { WhoAmIEntry } from '../types'

// Luk Thung (Thai country music) — well-documented, real artist names.
// Specific song-title attributions from this genre could not be verified with
// confidence, so entries here use the artist as the answer instead of guessing
// song titles (per the "accuracy over quantity" requirement — see final report).
export const LUK_THUNG: WhoAmIEntry[] = [
  { id: 'music-lt-001', answer: 'พุ่มพวง ดวงจันทร์', answerEn: 'Pumpuang Duangjan', category: 'music', subcategory: 'luk-thung', difficulty: 'easy', hints: ['ได้รับฉายาราชินีลูกทุ่ง', 'นักร้องลูกทุ่งหญิงระดับตำนาน'], metadata: { artist: 'พุ่มพวง ดวงจันทร์' } },
  { id: 'music-lt-002', answer: 'ไมค์ ภิรมย์พร', answerEn: 'Mike Piromporn', category: 'music', subcategory: 'luk-thung', difficulty: 'normal', hints: ['นักร้องลูกทุ่งชายชื่อดัง'], metadata: { artist: 'ไมค์ ภิรมย์พร' } },
  { id: 'music-lt-003', answer: 'ต่าย อรทัย', answerEn: 'Tai Orathai', category: 'music', subcategory: 'luk-thung', difficulty: 'normal', hints: ['นักร้องลูกทุ่งหญิงชื่อดัง'], metadata: { artist: 'ต่าย อรทัย' } },
  { id: 'music-lt-004', answer: 'สุนารี ราชสีมา', answerEn: 'Sunaree Ratchasima', category: 'music', subcategory: 'luk-thung', difficulty: 'normal', hints: ['นักร้องลูกทุ่งหญิงชื่อดัง'], metadata: { artist: 'สุนารี ราชสีมา' } },
  { id: 'music-lt-005', answer: 'ศิริพร อำไพพงษ์', answerEn: 'Siriporn Ampaipong', category: 'music', subcategory: 'luk-thung', difficulty: 'normal', hints: ['นักร้องลูกทุ่งหญิงชื่อดัง'], metadata: { artist: 'ศิริพร อำไพพงษ์' } },
  { id: 'music-lt-006', answer: 'ยิ่งยง ยอดบัวงาม', answerEn: 'Yingyong Yodbuangam', category: 'music', subcategory: 'luk-thung', difficulty: 'hard', hints: ['นักร้องลูกทุ่งชายชื่อดัง'], metadata: { artist: 'ยิ่งยง ยอดบัวงาม' } },
  { id: 'music-lt-007', answer: 'ฝน ธนสุนทร', answerEn: 'Fon Tanasoontorn', category: 'music', subcategory: 'luk-thung', difficulty: 'hard', hints: ['นักร้องลูกทุ่งหญิงชื่อดัง'], metadata: { artist: 'ฝน ธนสุนทร' } },
  { id: 'music-lt-008', answer: 'มนต์แคน แก่นคูน', answerEn: 'Monkan Kaenkoon', category: 'music', subcategory: 'luk-thung', difficulty: 'hard', hints: ['นักร้องลูกทุ่งชายชื่อดัง'], metadata: { artist: 'มนต์แคน แก่นคูน' } },
  { id: 'music-lt-009', answer: 'จินตหรา พูนลาภ', answerEn: 'Jintara Poonlarp', category: 'music', subcategory: 'luk-thung', difficulty: 'normal', hints: ['นักร้องลูกทุ่งหญิงชื่อดัง'], metadata: { artist: 'จินตหรา พูนลาภ' } },
]
