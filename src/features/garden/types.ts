import type { MoodId } from '../../types'

export interface GardenMember {
  id: string
  codename: string
  avatarId: string
  mood: MoodId
  online: boolean
  /** Normalized world position within the garden, x/z in roughly [-1, 1]. */
  position: [number, number]
}

export interface GardenChatMessage {
  id: string
  authorId: string
  authorCodename: string
  authorAvatarId: string
  kind: 'text' | 'song'
  text?: string
  song?: { title: string; artist: string; link?: string }
  createdAt: string
}

export interface SongTreeEntry {
  id: string
  authorId: string
  authorCodename: string
  title: string
  artist: string
  link?: string
  message: string
  reactionCount: number
  createdAt: string
}

export interface KindWordEntry {
  id: string
  authorId: string
  authorCodename: string
  text: string
  createdAt: string
}
