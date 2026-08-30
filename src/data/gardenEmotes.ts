export type GardenEmoteId = 'wave' | 'clap' | 'dance_01' | 'dance_02' | 'spin' | 'raise_hands' | 'heart' | 'jump'

export interface GardenEmoteDef {
  id: GardenEmoteId
  icon: string
  label: string
  /** Loops until the player moves or picks another emote/stands — everything else plays once and returns to idle. */
  loop: boolean
  /** How long a one-shot emote plays before every client (including the owner) treats it as finished — never synced over the network, purely a local timing table. */
  durationMs: number
}

/**
 * The 10 built-in Garden emotes from the spec. "นั่ง"/"ยืนปกติ" are intentionally not
 * real network emotes (see gardenEmoteService.ts's RTDB allow-list, which excludes them)
 * — they're wired in GardenEmotePanel.tsx to the real seat claim/release actions instead
 * of a second, fake sit implementation.
 */
export const GARDEN_EMOTES: GardenEmoteDef[] = [
  { id: 'wave', icon: '👋', label: 'โบกมือ', loop: false, durationMs: 1300 },
  { id: 'clap', icon: '👏', label: 'ปรบมือ', loop: false, durationMs: 1300 },
  { id: 'dance_01', icon: '💃', label: 'เต้น 1', loop: true, durationMs: 0 },
  { id: 'dance_02', icon: '🕺', label: 'เต้น 2', loop: true, durationMs: 0 },
  { id: 'spin', icon: '✨', label: 'หมุนตัว', loop: false, durationMs: 900 },
  { id: 'raise_hands', icon: '🙌', label: 'ชูมือ', loop: false, durationMs: 1300 },
  { id: 'heart', icon: '🤍', label: 'ส่งหัวใจ', loop: false, durationMs: 1600 },
  { id: 'jump', icon: '😄', label: 'กระโดดดีใจ', loop: false, durationMs: 900 },
]

export function getGardenEmote(id: string | null | undefined): GardenEmoteDef | undefined {
  return GARDEN_EMOTES.find((e) => e.id === id)
}
