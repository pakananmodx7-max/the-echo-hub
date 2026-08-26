import type { Mood } from '../types'

export const MOODS: Mood[] = [
  { id: 'good', emoji: '😊', label: 'วันนี้ดีนะ' },
  { id: 'okay', emoji: '😌', label: 'เรื่อย ๆ' },
  { id: 'need-ear', emoji: '😔', label: 'อยากมีคนฟัง' },
  { id: 'tired', emoji: '😣', label: 'วันนี้เหนื่อย' },
  { id: 'ready-to-listen', emoji: '🤍', label: 'วันนี้พร้อมรับฟังคนอื่น' },
]

export const getMoodById = (id: string | null | undefined): Mood | undefined =>
  MOODS.find((m) => m.id === id)
