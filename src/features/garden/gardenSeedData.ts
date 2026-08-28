import type { GardenChatMessage, GardenMember, KindWordEntry, SongTreeEntry } from './types'

/**
 * Demo backdrop only, used when Firebase isn't configured — a small fixed cast
 * so the garden doesn't feel empty in that fallback mode. None of this is
 * live; it never claims other real people are currently present. Positions
 * are world-space and reuse the same safe spawn cluster real players land in
 * (see GARDEN_SPAWN_POINTS) so they never overlap an obstacle.
 */
export const GARDEN_MEMBER_SEED: GardenMember[] = [
  { id: 'g1', codename: 'Moon17', avatarId: 'moon', mood: 'need-ear', online: true, x: -1.8, y: 0.58, z: 4.3, rotationY: 0 },
  { id: 'g2', codename: 'BlueFox', avatarId: 'fox', mood: 'ready-to-listen', online: true, x: 1.8, y: 0.58, z: 4.3, rotationY: 0 },
  { id: 'g3', codename: 'Cloud09', avatarId: 'cloud', mood: 'good', online: true, x: -2.6, y: 0.58, z: 3.4, rotationY: 0 },
  { id: 'g4', codename: 'TinyComet27', avatarId: 'comet', mood: 'okay', online: true, x: 2.6, y: 0.58, z: 3.4, rotationY: 0 },
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
