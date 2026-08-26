import type { AvatarOption } from '../types'

export const AVATARS: AvatarOption[] = [
  { id: 'cloud', emoji: '☁️', bg: 'bg-lavender-100' },
  { id: 'star', emoji: '⭐', bg: 'bg-pink-glow' },
  { id: 'moon', emoji: '🌙', bg: 'bg-mint' },
  { id: 'fox', emoji: '🦊', bg: 'bg-lavender-100' },
  { id: 'bear', emoji: '🐻', bg: 'bg-pink-glow' },
  { id: 'whale', emoji: '🐳', bg: 'bg-mint' },
  { id: 'otter', emoji: '🦦', bg: 'bg-lavender-100' },
  { id: 'comet', emoji: '☄️', bg: 'bg-pink-glow' },
]

export const getAvatarById = (id: string | null | undefined): AvatarOption =>
  AVATARS.find((a) => a.id === id) ?? AVATARS[0]
