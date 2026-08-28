import { memo, useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { GROUP_TABLES, INDIVIDUAL_TABLES, type TableSize, type TableSpec } from './gardenLayout'

const WOOD_TOP = '#c98a5f'
const WOOD_LEG = '#8a6a4f'
const STOOL_SEAT = '#e8b17f'

const GROUP_TABLE_RADIUS: Record<TableSize, number> = {
  individual: 0.32,
  small: 0.55,
  medium: 0.7,
  large: 0.95,
}

/** Evenly spaced seats around a round table, offset just past its edge. */
function seatSpots(table: TableSpec): [number, number][] {
  const radius = GROUP_TABLE_RADIUS[table.size] + 0.5
  const [cx, cz] = table.position
  return Array.from({ length: table.seats }, (_, i) => {
    const angle = (i / table.seats) * Math.PI * 2 + table.rotation
    return [cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius] as [number, number]
  })
}

/**
 * All of the garden's tables + chairs, rendered as a handful of instanced draw calls
 * (one per shared shape) rather than one draw call per table/chair — the individual
 * table count (6) and every group table's seats (2-6 each) share the same pedestal and
 * stool geometry, so the whole set costs ~4 draw calls regardless of table count.
 */
// Zero props, purely static geometry — memoized so a remote player's position tick
// (which re-renders GardenScene many times/sec) never re-runs this component's own
// render (it would otherwise recompute allSeatSpots and re-diff five Instances blocks
// for no visual change).
export const GardenTables = memo(function GardenTables() {
  const allSeatSpots = useMemo(() => [...INDIVIDUAL_TABLES, ...GROUP_TABLES].flatMap(seatSpots), [])

  return (
    <>
      {/* Individual "โต๊ะเดี่ยว" tabletops — small square tops, scattered on purpose (see gardenLayout.ts) */}
      <Instances limit={12} range={INDIVIDUAL_TABLES.length}>
        <boxGeometry args={[0.62, 0.06, 0.62]} />
        <meshStandardMaterial color={WOOD_TOP} roughness={0.75} />
        {INDIVIDUAL_TABLES.map((t) => (
          <Instance key={t.id} position={[t.position[0], 0.52, t.position[1]]} rotation={[0, t.rotation, 0]} />
        ))}
      </Instances>

      {/* Group table round tops — one shared unit cylinder, scaled per size class */}
      <Instances limit={12} range={GROUP_TABLES.length}>
        <cylinderGeometry args={[1, 1, 0.07, 20]} />
        <meshStandardMaterial color={WOOD_TOP} roughness={0.75} />
        {GROUP_TABLES.map((t) => {
          const r = GROUP_TABLE_RADIUS[t.size]
          return <Instance key={t.id} position={[t.position[0], 0.5, t.position[1]]} scale={[r, 1, r]} />
        })}
      </Instances>

      {/* Shared pedestal leg for every table, individual + group alike */}
      <Instances limit={12} range={INDIVIDUAL_TABLES.length + GROUP_TABLES.length}>
        <cylinderGeometry args={[0.08, 0.11, 1, 8]} />
        <meshStandardMaterial color={WOOD_LEG} roughness={0.8} />
        {[...INDIVIDUAL_TABLES, ...GROUP_TABLES].map((t) => (
          <Instance key={t.id} position={[t.position[0], 0.24, t.position[1]]} scale={[1, 0.48, 1]} />
        ))}
      </Instances>

      {/* Every chair/stool in the garden shares one simple radially-symmetric shape */}
      <Instances limit={60} range={allSeatSpots.length}>
        <cylinderGeometry args={[0.22, 0.19, 0.09, 12]} />
        <meshStandardMaterial color={STOOL_SEAT} roughness={0.75} />
        {allSeatSpots.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.42, z]} />
        ))}
      </Instances>
      <Instances limit={60} range={allSeatSpots.length}>
        <cylinderGeometry args={[0.035, 0.05, 0.4, 6]} />
        <meshStandardMaterial color={WOOD_LEG} roughness={0.8} />
        {allSeatSpots.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.2, z]} />
        ))}
      </Instances>
    </>
  )
})
