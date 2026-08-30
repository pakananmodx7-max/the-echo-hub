import { useEffect, useMemo, useRef, useState } from 'react'
import { gardenPresenceService } from '../features/garden/gardenPresenceService'
import { firebaseConfigured } from '../lib/firebase'
import { useAuth } from './useAuth'
import { useGardenSeats } from './useGardenSeats'
import { useGardenEmotes } from './useGardenEmotes'
import type { GardenMember } from '../features/garden/types'

// See gardenEmoteService.ts for the same opt-in flag and PII note — publicId only, never
// uid/email.
const DEBUG_EMOTES = import.meta.env.VITE_GARDEN_DEBUG_EMOTES === 'true'

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

  // Diagnostic-only, and deliberately a separate effect rather than logging inline in the
  // useMemo above: mutating a ref during render is against React's rules (a render pass can
  // be discarded/re-run without committing, which would desync the "last logged" tracker) -
  // this only runs after each commit, tracking the last emote id actually logged per remote
  // publicId so the trace fires once per real change, not on every unrelated roster
  // re-render (e.g. someone else's position tick).
  const lastLoggedEmoteRef = useRef<Record<string, string | null>>({})
  useEffect(() => {
    if (!DEBUG_EMOTES) return
    for (const m of members) {
      if (lastLoggedEmoteRef.current[m.id] !== m.emote) {
        lastLoggedEmoteRef.current[m.id] = m.emote
        console.debug(`[remote player] applied id=${m.id} emote=${m.emote}`)
      }
    }
  }, [members])

  return members
}
