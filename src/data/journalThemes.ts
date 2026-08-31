export type JournalThemeId = 'cream' | 'lavender' | 'pink' | 'blue' | 'green' | 'dark'

export interface JournalThemeDef {
  id: JournalThemeId
  label: string
  /** Small round swatch shown in the theme picker — a fixed color, independent of the
   * picker's own light/dark rendering (see the matching .journal-theme-* rules in index.css). */
  swatchClass: string
}

export const JOURNAL_THEMES: JournalThemeDef[] = [
  { id: 'cream', label: 'ครีม', swatchClass: 'bg-[#f7f0e4]' },
  { id: 'lavender', label: 'ลาเวนเดอร์', swatchClass: 'bg-[#ece5ff]' },
  { id: 'pink', label: 'ชมพู', swatchClass: 'bg-[#ffd7e6]' },
  { id: 'blue', label: 'ฟ้า', swatchClass: 'bg-[#dcebff]' },
  { id: 'green', label: 'เขียว', swatchClass: 'bg-[#dcf3e2]' },
  { id: 'dark', label: 'มืด', swatchClass: 'bg-[#241f30]' },
]

export const DEFAULT_JOURNAL_THEME: JournalThemeId = 'cream'

export function isJournalThemeId(value: string): value is JournalThemeId {
  return JOURNAL_THEMES.some((t) => t.id === value)
}
