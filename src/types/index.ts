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
  /** Safe-to-share identifier used for presence/public profile — never the raw Firebase uid. */
  publicId: string | null
  codename: string | null
  avatarId: string | null
  mood: MoodId | null
  onboardingComplete: boolean
  completedActivityIds: string[]
  createdAt: string
  /** ISO timestamp of the last time `mood` changed, from any source (daily check-in or a manual Profile edit). */
  moodUpdatedAt: string | null
  /** ECHO Points running total — personal motivation only, never a leaderboard. See src/features/rewards. */
  totalPoints: number
  /** Consecutive Bangkok-calendar days with a completed daily check-in. */
  currentStreak: number
  bestStreak: number
  /** YYYY-MM-DD (Bangkok-local) of the last completed daily check-in — the source of truth for "has today's check-in happened", never inferred from localStorage. */
  lastCheckinDate: string | null
  /** True only when this account's Firebase Auth ID token carries the `admin: true` custom
   * claim (see firebaseAuthService.ts) — the sole source of admin authorization anywhere in
   * this app. Never set from a username match, a Firestore field, or any other
   * client-controllable value; always false in mock/local-auth mode (no Firebase project
   * configured), since custom claims don't exist there. */
  isAdmin: boolean
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

export interface JournalEntry {
  id: string
  dataUrl: string
  mood: MoodId | null
  reflection: string
  createdAt: string
  source: 'journal' | 'draw-and-listen'
}

export type DrawListenPartner = 'friend' | 'family'

export interface ListenerReflectionOption {
  id: string
  label: string
}
