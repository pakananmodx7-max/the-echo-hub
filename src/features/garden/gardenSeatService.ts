import {
  onDisconnect as rtdbOnDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
} from 'firebase/database'
import { firebaseConfigured, getFirebaseDatabase } from '../../lib/firebase'

/**
 * Garden seat occupancy — a sibling RTDB collection to gardenPresence (see
 * gardenPresenceService.ts), never merged into it: gardenPresence's schema is
 * deliberately closed (`$other: false` in database.rules.json), and a seated player's
 * position is derived client-side from SEATS[seatId] rather than written anywhere, so
 * this needed its own small collection instead of extending that one.
 */
export interface GardenSeatService {
  /** One shared subscription for the whole seat map — seatId -> occupant publicId, for every currently-claimed seat. */
  subscribeSeats(callback: (occupancy: Record<string, string>) => void): () => void
  /** Atomic claim (RTDB transaction) — resolves true only if this client actually won the race; false if the seat was already taken. */
  claimSeat(seatId: string, myPublicId: string): Promise<boolean>
  /** Releases whichever seat this client currently holds (no-op if none). */
  releaseSeat(): void
}

interface GardenSeatRecord {
  publicId: string
  claimedAt: number
}

class FirebaseGardenSeatService implements GardenSeatService {
  private currentSeatId: string | null = null
  private disconnectHandle: ReturnType<typeof rtdbOnDisconnect> | null = null

  subscribeSeats(callback: (occupancy: Record<string, string>) => void): () => void {
    const seatsRef = ref(getFirebaseDatabase(), 'gardenSeats')
    return onValue(
      seatsRef,
      (snap) => {
        const value = (snap.val() ?? {}) as Record<string, GardenSeatRecord>
        const occupancy: Record<string, string> = {}
        for (const [seatId, record] of Object.entries(value)) occupancy[seatId] = record.publicId
        callback(occupancy)
      },
      (err) => console.error('[garden] subscribeSeats failed', err),
    )
  }

  async claimSeat(seatId: string, myPublicId: string): Promise<boolean> {
    const db = getFirebaseDatabase()
    const seatRef = ref(db, `gardenSeats/${seatId}`)
    try {
      const result = await runTransaction(seatRef, (current: GardenSeatRecord | null) => {
        // Already occupied (by anyone, including a stale read of our own prior seat) —
        // abort by returning undefined, the RTDB-transaction convention for "don't write."
        // This is the actual race-safety: if two clients' transactions run concurrently
        // against the same seat, the server serializes them and only the first commits;
        // the second re-runs against the now-non-null value and aborts here.
        if (current !== null) return undefined
        return { publicId: myPublicId, claimedAt: serverTimestamp() }
      })
      if (!result.committed) return false
      // Best-effort: never block on a failed cleanup of a stale previous handle.
      if (this.disconnectHandle) this.disconnectHandle.cancel().catch(() => {})
      this.currentSeatId = seatId
      this.disconnectHandle = rtdbOnDisconnect(seatRef)
      // Registered AFTER the successful claim (unlike gardenPresence's before-online
      // registration) — there is nothing to protect against here until the seat is
      // actually ours; a disconnect before that just means the transaction never committed.
      await this.disconnectHandle.remove().catch((err) => console.error('[garden] seat onDisconnect setup failed', err))
      return true
    } catch (err) {
      console.error('[garden] claimSeat failed', { seatId, message: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  releaseSeat(): void {
    if (!this.currentSeatId) return
    const db = getFirebaseDatabase()
    const seatId = this.currentSeatId
    this.currentSeatId = null
    if (this.disconnectHandle) {
      this.disconnectHandle.cancel().catch(() => {})
      this.disconnectHandle = null
    }
    remove(ref(db, `gardenSeats/${seatId}`)).catch((err) => console.error('[garden] releaseSeat failed', { seatId, message: err instanceof Error ? err.message : String(err) }))
  }
}

class NoopGardenSeatService implements GardenSeatService {
  subscribeSeats(callback: (occupancy: Record<string, string>) => void): () => void {
    callback({})
    return () => {}
  }
  async claimSeat(): Promise<boolean> {
    // Offline demo mode has no other real accounts to race against — always succeeds
    // locally so the sit/stand interaction is still visible while building/testing.
    return true
  }
  releaseSeat(): void {}
}

export const gardenSeatService: GardenSeatService = firebaseConfigured
  ? new FirebaseGardenSeatService()
  : new NoopGardenSeatService()
