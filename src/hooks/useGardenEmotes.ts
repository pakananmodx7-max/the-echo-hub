import { useEffect, useState } from 'react'
import { gardenEmoteService, type GardenEmoteState } from '../features/garden/gardenEmoteService'

/** Live publicId -> current emote state map — one shared subscription for the whole garden (see gardenEmoteService.ts). */
export function useGardenEmotes(): Record<string, GardenEmoteState> {
  const [states, setStates] = useState<Record<string, GardenEmoteState>>({})

  useEffect(() => {
    return gardenEmoteService.subscribeEmotes(setStates)
  }, [])

  return states
}
