import { GARDEN_MEMBER_SEED } from './gardenSeedData'
import type { GardenMember } from './types'

/**
 * Interface-first so a Firestore/Realtime-DB presence collection can back
 * this later without touching GardenScene or GardenOnlinePanel. In mock
 * mode this returns a small fixed roster — it never simulates people
 * joining/leaving to look like a live multi-device presence feed.
 */
export interface GardenPresenceService {
  listMembers(): GardenMember[]
}

class MockGardenPresenceService implements GardenPresenceService {
  listMembers(): GardenMember[] {
    return GARDEN_MEMBER_SEED
  }
}

export const gardenPresenceService: GardenPresenceService = new MockGardenPresenceService()
