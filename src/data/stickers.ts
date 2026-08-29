export interface EchoSticker {
  id: string
  emoji: string
  label: string
}

/**
 * THE ECHO HUB's built-in sticker pack — emoji-style, drawn entirely from this fixed,
 * app-controlled list (never user-uploaded, never arbitrary HTML). A message only ever
 * stores a `stickerId` from this catalog; the emoji/label are looked up client-side, so
 * there's nothing here to lazy-load or fetch — the whole pack is a few dozen bytes of data.
 */
export const ECHO_STICKERS: EchoSticker[] = [
  { id: 'echo_support_01', emoji: '💜', label: 'กำลังใจ' },
  { id: 'echo_listen_01', emoji: '🫶', label: 'รับฟัง' },
  { id: 'echo_restart_01', emoji: '🌱', label: 'เริ่มใหม่ได้' },
  { id: 'echo_better_01', emoji: '🌈', label: 'วันนี้จะดีขึ้น' },
  { id: 'echo_hug_01', emoji: '🧸', label: 'กอดนะ' },
  { id: 'echo_great_01', emoji: '✨', label: 'เก่งมาก' },
  { id: 'echo_hearing_01', emoji: '👂', label: 'เราฟังอยู่นะ' },
  { id: 'echo_rest_01', emoji: '☕', label: 'พักก่อนก็ได้' },
  { id: 'echo_goodnight_01', emoji: '🌙', label: 'ฝันดี' },
  { id: 'echo_song_01', emoji: '🎧', label: 'ส่งเพลงให้' },
  { id: 'echo_smile_01', emoji: '😊', label: 'ยิ้มหน่อย' },
  { id: 'echo_here_01', emoji: '🤍', label: 'อยู่ตรงนี้นะ' },
]

const STICKERS_BY_ID = new Map(ECHO_STICKERS.map((s) => [s.id, s]))

export function getStickerById(id: string | undefined | null): EchoSticker | undefined {
  return id ? STICKERS_BY_ID.get(id) : undefined
}
