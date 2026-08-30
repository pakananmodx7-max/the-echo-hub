import { describe, expect, it } from 'vitest'
import {
  GARDEN_BOUND,
  GARDEN_OBJECTS,
  GROUP_TABLES,
  INDIVIDUAL_TABLES,
  SEATS,
  SEATS_BY_ID,
  tableSeatSpots,
} from './gardenLayout'

describe('Garden V2 seat registry (gardenLayout.ts)', () => {
  it('gives every table exactly as many seats as its own `seats` count', () => {
    for (const table of [...INDIVIDUAL_TABLES, ...GROUP_TABLES]) {
      const spots = tableSeatSpots(table)
      expect(spots).toHaveLength(table.seats)
    }
  })

  it('has no duplicate seat ids across the whole garden', () => {
    const ids = SEATS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes every individual-table seat as a solo seat and every group-table seat as a group seat', () => {
    for (const table of INDIVIDUAL_TABLES) {
      const seat = SEATS.find((s) => s.id === `${table.id}_seat_01`)
      expect(seat?.kind).toBe('solo')
    }
    for (const table of GROUP_TABLES) {
      const seat = SEATS.find((s) => s.id === `${table.id}_seat_01`)
      expect(seat?.kind).toBe('group')
    }
  })

  it('keeps SEATS_BY_ID in sync with SEATS (same entries, O(1) lookup)', () => {
    expect(Object.keys(SEATS_BY_ID)).toHaveLength(SEATS.length)
    for (const seat of SEATS) {
      expect(SEATS_BY_ID[seat.id]).toEqual(seat)
    }
  })

  it('places every seat within the walkable bound (with a little slack for edge seats)', () => {
    for (const seat of SEATS) {
      expect(Math.abs(seat.position[0])).toBeLessThanOrEqual(GARDEN_BOUND + 1)
      expect(Math.abs(seat.position[1])).toBeLessThanOrEqual(GARDEN_BOUND + 1)
    }
  })

  it('never collides a seat id with a GARDEN_OBJECTS id (two independent interaction systems)', () => {
    const objectIds = new Set(GARDEN_OBJECTS.map((o) => o.id))
    for (const seat of SEATS) {
      expect(objectIds.has(seat.id as never)).toBe(false)
    }
  })
})
