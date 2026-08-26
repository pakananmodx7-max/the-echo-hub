export const AVATAR_BODY_COLOR: Record<string, string> = {
  cloud: '#a480f5',
  star: '#ff9fc0',
  moon: '#8fd6b4',
  fox: '#f2a94a',
  bear: '#c98a5f',
  whale: '#5aa9d6',
  otter: '#8b5fe8',
  comet: '#e0729f',
}

export function avatarBodyColor(avatarId: string | null | undefined): string {
  return (avatarId && AVATAR_BODY_COLOR[avatarId]) || '#a480f5'
}
