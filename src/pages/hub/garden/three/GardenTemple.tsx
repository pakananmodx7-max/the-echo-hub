import { memo, useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { createWoodTexture } from './gardenTextures'
import { irregularRockGeometries } from './gardenRocks'
import {
  TEMPLE_HALL_POSITION,
  TEMPLE_HALL_HALF_WIDTH,
  TEMPLE_HALL_HALF_DEPTH,
  TEMPLE_HALL_PLATFORM_HEIGHT,
  TEMPLE_FORECOURT_CENTER,
  TEMPLE_FORECOURT_RADIUS,
  BODHI_TREE_POSITION,
  BODHI_SEAT_SPOTS,
  TEMPLE_EDGE_SEAT_SPOTS,
  TEMPLE_TREE_SPOTS,
} from './gardenLayout'

const HALL_WALL_COLOR = '#f2e8d5'
const HALL_ROOF_COLOR = '#7a2e2e'
const HALL_ROOF_ACCENT = '#8f3a3a'
const HALL_TRIM_GOLD = '#c9a24b'
const STONE_COLOR = '#9a938a'
const STONE_LIGHT = '#b3ab9f'

/**
 * "🛕 เขตสงบ — ECHO Temple Grounds" main landmark — a Thai Ubosot-style hall EXTERIOR only
 * (spec §7: "do not create a fully explorable interior yet"). Recognizable multi-tier
 * roof silhouette, cream/warm-white walls, deep-red + gold trim accents, elegant but
 * restrained — no sacred statues, no interior detail, just an architectural landmark
 * treated respectfully. Solid, walk-around obstacle (see TEMPLE_HALL_OBSTACLES in
 * gardenLayout.ts) — same "a raised platform you walk up to, not a multi-level walkable
 * surface" treatment as the Stage/Pavilion, since this engine has no per-object avatar
 * elevation.
 */
function TempleHall() {
  const wood = useMemo(() => createWoodTexture(), [])
  const [x, z] = TEMPLE_HALL_POSITION
  const w = TEMPLE_HALL_HALF_WIDTH
  const d = TEMPLE_HALL_HALF_DEPTH
  const platformH = TEMPLE_HALL_PLATFORM_HEIGHT
  const wallH = 2.6

  const stepPositions = useMemo(
    () => Array.from({ length: 3 }, (_, i) => [x, platformH - (i + 1) * (platformH / 3), z + d + 0.2 + i * 0.3] as [number, number, number]),
    [x, z, d, platformH],
  )

  return (
    <group position={[x, 0, z]}>
      {/* Raised stone platform + approach steps, facing the forecourt (south). */}
      <mesh position={[0, platformH / 2, 0]} receiveShadow>
        <boxGeometry args={[w * 2 + 0.6, platformH, d * 2 + 0.6]} />
        <meshStandardMaterial color={STONE_LIGHT} roughness={0.85} />
      </mesh>
      <Instances limit={3} range={stepPositions.length}>
        <boxGeometry args={[2.2, 0.12, 0.3]} />
        <meshStandardMaterial color={STONE_COLOR} roughness={0.85} />
        {stepPositions.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {/* Walls — plain warm-white box, restrained (no window/door carving). */}
      <mesh position={[0, platformH + wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 1.7, wallH, d * 1.5]} />
        <meshStandardMaterial color={HALL_WALL_COLOR} roughness={0.7} />
      </mesh>
      {/* A single recessed dark doorway on the front face — architectural detail, not an
          enterable interior (this mesh has no depth, it's flush against the wall). */}
      <mesh position={[0, platformH + wallH * 0.4, d * 0.75 + 0.01]}>
        <planeGeometry args={[0.9, 1.7]} />
        <meshStandardMaterial color="#3a2f28" roughness={0.9} />
      </mesh>
      {/* Slim wood/red pilasters along the front, a restrained nod to temple colonnades. */}
      <Instances limit={4} range={4}>
        <boxGeometry args={[0.16, wallH, 0.16]} />
        <meshStandardMaterial map={wood} color="#8a4a3a" roughness={0.8} />
        {[-w * 0.8, -w * 0.3, w * 0.3, w * 0.8].map((px, i) => (
          <Instance key={i} position={[px, platformH + wallH / 2, d * 0.75]} />
        ))}
      </Instances>

      {/* Multi-tier Thai roof — three stacked, progressively smaller square-based cones
          (same primitive-cone technique as the Pavilion's roof, just taller/more tiered)
          with a thin gold trim ring at each tier's base. */}
      <mesh position={[0, platformH + wallH + 0.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 1.55, 1.0, 4]} />
        <meshStandardMaterial color={HALL_ROOF_COLOR} roughness={0.55} />
      </mesh>
      <mesh position={[0, platformH + wallH + 0.85, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <torusGeometry args={[w * 1.02, 0.03, 6, 4]} />
        <meshStandardMaterial color={HALL_TRIM_GOLD} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, platformH + wallH + 1.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 1.0, 0.75, 4]} />
        <meshStandardMaterial color={HALL_ROOF_ACCENT} roughness={0.55} />
      </mesh>
      <mesh position={[0, platformH + wallH + 1.5, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <torusGeometry args={[w * 0.66, 0.025, 6, 4]} />
        <meshStandardMaterial color={HALL_TRIM_GOLD} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, platformH + wallH + 1.75, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 0.5, 0.55, 4]} />
        <meshStandardMaterial color={HALL_ROOF_COLOR} roughness={0.55} />
      </mesh>
      {/* A slender "chofah"-style peak accent — the single most recognizable silhouette
          cue of a Thai temple roof, kept as one restrained gold sliver, not an ornament
          cluster. */}
      <mesh position={[0, platformH + wallH + 2.15, 0]} rotation={[0.12, 0, 0]}>
        <coneGeometry args={[0.06, 0.5, 4]} />
        <meshStandardMaterial color={HALL_TRIM_GOLD} metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** A stone seat slab — shared visual for both Bodhi-tree seats and forecourt edge seats
 * (real sittable SEATS entries, see gardenLayout.ts — this only renders the mesh). */
function StoneSeat({ x, z, facing }: { x: number; z: number; facing: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.5, 0.16, 0.4]} />
        <meshStandardMaterial color={STONE_LIGHT} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.44, 0.1, 0.34]} />
        <meshStandardMaterial color={STONE_COLOR} roughness={0.9} />
      </mesh>
    </group>
  )
}

const BODHI_GREENS = ['#6a9c6f', '#7fb083', '#8fc494', '#5c8f66']

/**
 * A large Bodhi-inspired shade tree (spec §9) — deliberately broader/flatter than both the
 * Plaza's CentralTree and the Tree of Goodness, reading as an old, wide-canopied shade
 * tree rather than a second copy of either. No physical sign here (spec: "no oversized
 * signboards") — the on-sit "พักใจตรงนี้สักครู่ก็ได้นะ 🌿" phrase is a screen overlay
 * triggered from EchoGardenPage.tsx, not a 3D object.
 */
function BodhiTree() {
  const [x, z] = BODHI_TREE_POSITION
  const canopy = useMemo(
    () => [
      { pos: [0, 2.5, 0] as [number, number, number], r: 1.4 },
      { pos: [1.3, 2.2, 0.6] as [number, number, number], r: 1.0 },
      { pos: [-1.3, 2.15, -0.5] as [number, number, number], r: 0.95 },
      { pos: [0.4, 2.9, -1.1] as [number, number, number], r: 0.8 },
      { pos: [-0.7, 2.4, 1.2] as [number, number, number], r: 0.85 },
      { pos: [1.1, 1.9, -1.2] as [number, number, number], r: 0.7 },
      { pos: [-1.4, 1.85, 0.7] as [number, number, number], r: 0.65 },
      { pos: [0, 3.3, 0.2] as [number, number, number], r: 0.6 },
    ],
    [],
  )
  const rocks = useMemo(() => irregularRockGeometries(2), [])

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.62, 1.3, 9]} />
        <meshStandardMaterial color="#7a5c44" roughness={0.92} />
      </mesh>
      <mesh position={[0.08, 1.55, -0.06]} rotation={[0.03, 0.4, 0.02]} castShadow>
        <cylinderGeometry args={[0.3, 0.44, 1.1, 9]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.9} />
      </mesh>
      {canopy.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={[i * 0.4, i * 0.9, i * 0.25]} castShadow>
          <icosahedronGeometry args={[c.r, 1]} />
          <meshStandardMaterial color={BODHI_GREENS[i % BODHI_GREENS.length]} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[-1.2, 0.1, 0.9]} rotation={[0.2, 0.4, 0.1]} scale={0.35} geometry={rocks[0]}>
        <meshStandardMaterial color="#a79bb0" roughness={0.95} />
      </mesh>
      <mesh position={[1.1, 0.08, -0.8]} rotation={[0.1, 1.0, 0.2]} scale={0.3} geometry={rocks[1]}>
        <meshStandardMaterial color="#a79bb0" roughness={0.95} />
      </mesh>
      {BODHI_SEAT_SPOTS.map(([sx, sz], i) => {
        const facing = Math.atan2(x - sx, z - sz)
        return <StoneSeat key={i} x={sx - x} z={sz - z} facing={facing} />
      })}
    </group>
  )
}

/**
 * The open paved forecourt in front of the hall (spec §8) — a tinted ground disc (same
 * technique as the Stage's DanceFloor tint), a couple of small trees and low stone
 * planters kept to the edges, lanterns handled separately via LANTERN_SPOTS (rendered by
 * GardenScene's own Lanterns component), and edge seating. The center stays open on
 * purpose — nothing is placed there.
 */
function TempleForecourt() {
  const [cx, cz] = TEMPLE_FORECOURT_CENTER
  const planterSpots = useMemo<[number, number][]>(
    () => [
      [cx - 1.6, cz + 1.7],
      [cx + 1.7, cz + 1.5],
      [cx - 1.8, cz - 1.5],
    ],
    [cx, cz],
  )

  return (
    <group>
      <mesh position={[cx, 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[TEMPLE_FORECOURT_RADIUS, 32]} />
        <meshStandardMaterial color={STONE_COLOR} roughness={0.95} />
      </mesh>
      <mesh position={[cx, 0.007, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TEMPLE_FORECOURT_RADIUS - 0.06, TEMPLE_FORECOURT_RADIUS, 32]} />
        <meshStandardMaterial color={STONE_LIGHT} roughness={0.9} />
      </mesh>

      {TEMPLE_TREE_SPOTS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.19, 1.0, 7]} />
            <meshStandardMaterial color="#7a5c44" roughness={0.92} />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh
              key={j}
              position={[Math.cos(j * 2.1) * 0.35, 1.15 + j * 0.15, Math.sin(j * 2.1) * 0.35]}
              rotation={[j, j * 0.7, j * 0.3]}
              castShadow
            >
              <icosahedronGeometry args={[0.42, 1]} />
              <meshStandardMaterial color={BODHI_GREENS[j]} roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Low stone planters — purely decorative, non-colliding (kept small/off-center so
          they never read as an obstacle to route around). */}
      {planterSpots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.26, 0.3, 0.28, 10]} />
            <meshStandardMaterial color={STONE_COLOR} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshStandardMaterial color="#6fa87f" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {TEMPLE_EDGE_SEAT_SPOTS.map(([x, z], i) => {
        const facing = Math.atan2(cx - x, cz - z)
        return <StoneSeat key={i} x={x} z={z} facing={facing} />
      })}
    </group>
  )
}

/** Mounted once in GardenScene alongside GardenLandmarks/GardenDhammaSigns/GardenStage —
 * zero props, purely static positions from gardenLayout.ts (same memoization reasoning as
 * every other static Garden group). */
export const GardenTemple = memo(function GardenTemple() {
  return (
    <>
      <TempleHall />
      <TempleForecourt />
      <BodhiTree />
    </>
  )
})
