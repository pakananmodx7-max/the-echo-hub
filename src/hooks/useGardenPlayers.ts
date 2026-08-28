import { useEffect, useState } from 'react'
import { gardenPresenceService } from '../features/garden/gardenPresenceService'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'
import type { GardenMember } from '../features/garden/types'

/** Live roster of other real people currently inside ECHO GARDEN — never includes the local player. */
export function useGardenPlayers(): GardenMember[] {
  const { user } = useAuth()
  const [members, setMembers] = useState<GardenMember[]>([])

  useEffect(() => {
    const unsubscribe = gardenPresenceService.subscribeMembers((live) => {
      setMembers(firebaseConfigured ? live.filter((m) => m.id !== user?.publicId) : live)
    })
    return unsubscribe
  }, [user?.publicId])

  return members
}
