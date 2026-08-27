export type WhoAmIDifficulty = 'easy' | 'normal' | 'hard'

export interface WhoAmIEntry {
  id: string
  answer: string
  answerEn?: string
  category: string
  subcategory?: string
  difficulty: WhoAmIDifficulty
  hints?: string[]
  metadata?: {
    artist?: string
    era?: string
    region?: string
  }
}

export type ThaiRegion = 'north' | 'northeast' | 'central' | 'east' | 'west' | 'south'

export type MusicGuessMode = 'title' | 'artist'

export interface WhoAmISubcategory {
  id: string
  label: string
  emoji: string
}

export interface WhoAmICategoryGroup {
  id: string
  label: string
  emoji: string
  subcategories: WhoAmISubcategory[]
  /** Music-only: lets the player choose to guess the song title or the artist. */
  supportsMusicMode?: boolean
}

export type WhoAmIGameMode = 'solo' | 'multiplayer' | 'team'

export type TimerOption = 30 | 60 | 90 | 120 | 0

export type DifficultyFilter = WhoAmIDifficulty | 'mixed'

export interface WhoAmIGameConfig {
  subcategoryIds: string[]
  difficulty: DifficultyFilter
  timerSeconds: TimerOption
  musicMode: MusicGuessMode
}

export interface RoundResult {
  correct: number
  skipped: number
  hintsUsed: number
  wordsShown: number
}

export interface PlayerScore {
  id: string
  name: string
  correct: number
  skipped: number
  hintsUsed: number
}

export interface TeamInfo {
  id: string
  name: string
  playerIds: string[]
}
