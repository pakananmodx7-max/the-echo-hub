export type MoodId = 'good' | 'okay' | 'need-ear' | 'tired' | 'ready-to-listen'

export interface Mood {
  id: MoodId
  emoji: string
  label: string
}

export interface AvatarOption {
  id: string
  emoji: string
  bg: string
}

export interface EchoUser {
  id: string
  codename: string
  avatarId: string
  mood: MoodId
  online: boolean
}

export interface AuthUser {
  id: string
  email: string
  codename: string | null
  avatarId: string | null
  mood: MoodId | null
  onboardingComplete: boolean
  completedActivityIds: string[]
  createdAt: string
}

export interface RandomMission {
  id: string
  text: string
}

export interface HubActivity {
  id: string
  icon: string
  title: string
  description: string
  ctaLabel: string
  to: string
  accent: 'lavender' | 'pink' | 'mint'
}
