import { useEffect } from 'react'
import { presenceService } from './presenceService'
import type { AuthUser } from '../../types'

/**
 * Marks the current user online for as long as this hook stays mounted (i.e. anywhere
 * inside the authenticated hub), and goes offline on unmount or disconnect. Mounted once
 * in HubLayout so presence reflects "has the app open", not just "on Echo Space right now".
 */
export function usePresenceSession(user: AuthUser | null) {
  const publicId = user?.publicId
  const codename = user?.codename
  const avatarId = user?.avatarId
  const mood = user?.mood

  useEffect(() => {
    if (!publicId || !codename) return
    presenceService.goOnline({ publicId, codename, avatarId: avatarId ?? null, mood: mood ?? null })
    return () => presenceService.goOffline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId, codename])
}
