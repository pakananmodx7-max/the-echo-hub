import { useEffect, useMemo, useState } from 'react'
import { gardenPresenceService } from '../features/garden/gardenPresenceService'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'
import { useGardenSeats } from './useGardenSeats'
import { useGardenEmotes } from './useGardenEmotes'
import type { GardenMember } from '../features/garden/types'

/**
 * Live roster of other real people currently inside ECHO GARDEN — never includes the
 * local player. Garden V2: joins in seatId/emote state from the two small sibling RTDB
 * collections (see useGardenSeats/useGardenEmotes) purely client-side — neither field is
 * ever written into gardenPresence itself (see the Garden V2 plan for why: its schema is
 * deliberately closed). The join is a plain useMemo over three already-subscribed pieces
 * of state, not a new Firebase listener — still exactly one shared subscription per
 * collection for the whole garden.
 */
export function useGardenPlayers(): GardenMember[] {
  const { user } = useAuth()
  const [rawMembers, setRawMembers] = useState<GardenMember[]>([])
  const seatOccupancy = useGardenSeats()
  const emoteStates = useGardenEmotes()

  useEffect(() => {
    const unsubscribe = gardenPresenceService.subscribeMembers((live) => {
      setRawMembers(firebaseConfigured ? live.filter((m) => m.id !== user?.publicId) : live)
    })
    return unsubscribe
  }, [user?.publicId])

  const seatByPublicId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [seatId, publicId] of Object.entries(seatOccupancy)) map[publicId] = seatId
    return map
  }, [seatOccupancy])

  const members = useMemo(
    () =>
      rawMembers.map((m) => {
        const emoteState = emoteStates[m.id]
        return {
          ...m,
          seatId: seatByPublicId[m.id] ?? null,
          emote: emoteState?.emote ?? null,
          emoteStartedAt: emoteState?.startedAt ?? null,
        }
      }),
    [rawMembers, seatByPublicId, emoteStates],
  )

  return members
}
