import { DEFAULT_GARDEN_AVATAR_CONFIG } from '../../data/gardenAvatarOptions'
import type { GardenAvatarConfig } from './types'

/**
 * Interface-first, same pattern as authService/journalService: swap the
 * Local implementation for a Firebase-backed one (garden avatar config
 * stored under the user's profile) later without touching the Studio UI
 * or GardenCharacter. Only small config values are saved — never a model
 * file — so this stays cheap to sync once a real backend exists.
 */
export interface AvatarProfileService {
  getConfig(userId: string): GardenAvatarConfig | null
  saveConfig(userId: string, config: GardenAvatarConfig): GardenAvatarConfig
  hasConfig(userId: string): boolean
}

function storageKey(userId: string) {
  return `echoHub.demo.gardenAvatar.${userId}`
}

class LocalAvatarProfileService implements AvatarProfileService {
  getConfig(userId: string): GardenAvatarConfig | null {
    try {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as GardenAvatarConfig) : null
    } catch {
      return null
    }
  }

  saveConfig(userId: string, config: GardenAvatarConfig): GardenAvatarConfig {
    localStorage.setItem(storageKey(userId), JSON.stringify(config))
    return config
  }

  hasConfig(userId: string): boolean {
    return this.getConfig(userId) !== null
  }
}

export const avatarProfileService: AvatarProfileService = new LocalAvatarProfileService()
export { DEFAULT_GARDEN_AVATAR_CONFIG }
