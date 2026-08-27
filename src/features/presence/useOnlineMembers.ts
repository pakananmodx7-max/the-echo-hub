import { useEffect, useState } from 'react'
import { presenceService } from './presenceService'
import { firebaseConfigured } from '../../lib/firebase'
import { ONLINE_USERS } from '../../data/onlineUsers'
import { useAuth } from '../../hooks/useAuth'
import type { EchoUser } from '../../types'

/**
 * Live online-members list for Echo Space. Backed by real Realtime Database presence
 * once Firebase is configured; falls back to the static preview list otherwise so the
 * page still has something to show before a Firebase project is wired up.
 */
export function useOnlineMembers(): EchoUser[] {
  const { user } = useAuth()
  const [members, setMembers] = useState<EchoUser[]>(firebaseConfigured ? [] : ONLINE_USERS)

  useEffect(() => {
    if (!firebaseConfigured) return
    const unsubscribe = presenceService.subscribeOnlineMembers((live) => {
      const mapped: EchoUser[] = live
        .filter((m) => m.publicId !== user?.publicId)
        .map((m) => ({
          id: m.publicId,
          codename: m.codename,
          avatarId: m.avatarId ?? 'moon',
          mood: m.mood ?? 'okay',
          online: true,
        }))
      setMembers(mapped)
    })
    return unsubscribe
  }, [user?.publicId])

  return members
}
