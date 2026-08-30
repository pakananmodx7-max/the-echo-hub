import { useEffect, useState } from 'react'
import { gardenSeatService } from '../features/garden/gardenSeatService'

/** Live seatId -> occupant publicId map — one shared subscription for the whole garden (see gardenSeatService.ts). */
export function useGardenSeats(): Record<string, string> {
  const [occupancy, setOccupancy] = useState<Record<string, string>>({})

  useEffect(() => {
    return gardenSeatService.subscribeSeats(setOccupancy)
  }, [])

  return occupancy
}
