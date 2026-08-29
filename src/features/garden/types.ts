import type { MoodId } from '../../types'

export type GardenSkinTone = 'porcelain' | 'warm' | 'tan' | 'deep' | 'cocoa'
export type GardenHairStyle = 'short' | 'medium' | 'tied' | 'wavy' | 'long'
export type GardenTopStyle = 'hoodie' | 'tshirt' | 'sweater' | 'shirt'
export type GardenBottomStyle = 'pants' | 'shorts' | 'skirt'
export type GardenAccessory = 'none' | 'glasses' | 'cap' | 'beanie' | 'headphones' | 'backpack'

export interface GardenAvatarConfig {
  skinTone: GardenSkinTone
  hairStyle: GardenHairStyle
  hairColor: string
  topStyle: GardenTopStyle
  topColor: string
  bottomStyle: GardenBottomStyle
  bottomColor: string
  accessory: GardenAccessory
}

export interface GardenMember {
  /** The member's publicId — never a Firebase uid (see gardenPresenceService). */
  id: string
  codename: string
  avatarId: string
  /** Full avatar customization, when the member has published one — falls back to a mock config derived from avatarId otherwise. */
  avatarConfig?: GardenAvatarConfig
  mood: MoodId
  online: boolean
  /** World-space position/heading within the garden — same units as GARDEN_BOUND/GARDEN_OBJECTS. */
  x: number
  y: number
  z: number
  rotationY: number
}

export interface GardenChatMessage {
  id: string
  authorId: string
  authorCodename: string
  authorAvatarId: string
  kind: 'text' | 'song' | 'sticker'
  text?: string
  song?: { title: string; artist: string; link?: string }
  /** Set only when kind === 'sticker' — an id from the fixed ECHO_STICKERS catalog (see
   * src/data/stickers.ts), never arbitrary content. */
  stickerId?: string
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
