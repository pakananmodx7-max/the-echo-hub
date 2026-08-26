import type { GardenChatMessage, GardenMember, KindWordEntry, SongTreeEntry } from './types'

/**
 * Demo backdrop only — a small fixed cast so the garden doesn't feel empty
 * on first visit. None of this is live; it never claims other real people
 * are currently present.
 */
export const GARDEN_MEMBER_SEED: GardenMember[] = [
  { id: 'g1', codename: 'Moon17', avatarId: 'moon', mood: 'need-ear', online: true, position: [-0.5, 0.3] },
  { id: 'g2', codename: 'BlueFox', avatarId: 'fox', mood: 'ready-to-listen', online: true, position: [0.4, -0.2] },
  { id: 'g3', codename: 'Cloud09', avatarId: 'cloud', mood: 'good', online: true, position: [-0.2, -0.5] },
  { id: 'g4', codename: 'TinyComet27', avatarId: 'comet', mood: 'okay', online: true, position: [0.6, 0.4] },
]

export const GARDEN_CHAT_SEED: GardenChatMessage[] = [
  {
    id: 'gc1',
    authorId: 'g1',
    authorCodename: 'Moon17',
    authorAvatarId: 'moon',
    kind: 'text',
    text: 'วันนี้ทุกคนเป็นไงบ้าง',
    createdAt: '2026-08-20T09:00:00.000Z',
  },
  {
    id: 'gc2',
    authorId: 'g2',
    authorCodename: 'BlueFox',
    authorAvatarId: 'fox',
    kind: 'text',
    text: 'วันนี้เหนื่อยนิดหน่อย 😅',
    createdAt: '2026-08-20T09:01:00.000Z',
  },
  {
    id: 'gc3',
    authorId: 'g3',
    authorCodename: 'Cloud09',
    authorAvatarId: 'cloud',
    kind: 'text',
    text: 'ส่งกำลังใจให้ทุกคนนะ ✨',
    createdAt: '2026-08-20T09:02:00.000Z',
  },
]

export const SONG_TREE_SEED: SongTreeEntry[] = [
  {
    id: 'st1',
    authorId: 'g1',
    authorCodename: 'Moon17',
    title: 'Yellow',
    artist: 'Coldplay',
    message: 'เผื่อวันนี้ใครกำลังเหนื่อย 🤍',
    reactionCount: 3,
    createdAt: '2026-08-19T12:00:00.000Z',
  },
]

export const KIND_WORD_SEED: KindWordEntry[] = [
  {
    id: 'kw1',
    authorId: 'demo-blue-moon-17',
    authorCodename: 'BlueMoon17',
    text: 'ขอบคุณที่อยู่ตรงนี้นะ',
    createdAt: '2026-08-19T12:00:00.000Z',
  },
  {
    id: 'kw2',
    authorId: 'g4',
    authorCodename: 'TinyComet27',
    text: 'พักบ้างก็ได้นะ',
    createdAt: '2026-08-19T13:00:00.000Z',
  },
]
