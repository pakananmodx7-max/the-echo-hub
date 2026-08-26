import { getAvatarById } from '../data/avatars'

interface AvatarProps {
  avatarId: string | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
}

const SIZE_MAP: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-9 h-9 text-lg',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl',
  xl: 'w-24 h-24 text-5xl',
}

export function Avatar({ avatarId, size = 'md', ring = false }: AvatarProps) {
  const avatar = getAvatarById(avatarId)
  return (
    <div
      className={`${SIZE_MAP[size]} ${avatar.bg} rounded-full flex items-center justify-center shrink-0 ${
        ring ? 'ring-4 ring-white shadow-md' : ''
      }`}
    >
      <span aria-hidden>{avatar.emoji}</span>
    </div>
  )
}
