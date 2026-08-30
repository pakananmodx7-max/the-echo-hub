import { memo, useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import {
  CENTRAL_TREE_POSITION,
  FLOWER_ARCH_GAP,
  FLOWER_ARCH_POSITION,
  PAVILION_HALF_SIZE,
  PAVILION_POSITION,
  POOL_POSITION,
  QUIET_BENCH_SPOTS,
  WATERFALL_CHAIR_SPOTS,
} from './gardenLayout'

const ARCH_FLOWER_COLORS = ['#ffd7e6', '#ff9fc0', '#f6f0ff', '#e0c8ff']

/** A gateway marking the Entrance → Plaza transition — two posts with a curved flower-laced top. */
function FlowerArch() {
  const [x, z] = FLOWER_ARCH_POSITION
  const flowerSpots = useMemo(() => {
    const spots: [number, number, number, number][] = []
    const segments = 9
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = Math.PI * t
      spots.push([
        x - Math.cos(angle) * FLOWER_ARCH_GAP,
        1.9 + Math.sin(angle) * FLOWER_ARCH_GAP,
        z,
        i % ARCH_FLOWER_COLORS.length,
      ])
    }
    return spots
  }, [x, z])

  return (
    <group>
      <mesh position={[x - FLOWER_ARCH_GAP, 0.95, z]}>
        <cylinderGeometry args={[0.09, 0.11, 1.9, 8]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
      </mesh>
      <mesh position={[x + FLOWER_ARCH_GAP, 0.95, z]}>
        <cylinderGeometry args={[0.09, 0.11, 1.9, 8]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
      </mesh>
      <mesh position={[x, 1.9, z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[FLOWER_ARCH_GAP, 0.07, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
      </mesh>
      <Instances limit={12} range={flowerSpots.length}>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshStandardMaterial roughness={0.7} />
        {flowerSpots.map(([fx, fy, fz, colorIdx], i) => (
          <Instance key={i} position={[fx, fy, fz]} color={ARCH_FLOWER_COLORS[colorIdx]} />
        ))}
      </Instances>
    </group>
  )
}

const TREE_GREENS = ['#6fa87f', '#7bb894', '#8fd6b4', '#a7e0c2']

/**
 * The Plaza's iconic big tree — a bigger, distinct silhouette from the Song Tree so the
 * two landmarks read differently. Garden V2: the trunk now tapers in two stages instead
 * of one uniform cone, and the foliage is 6 smaller offset clusters in varied green tones
 * instead of 4 large blobs, so it reads as a real canopy rather than a stacked-sphere
 * "clay tree" — still just icosahedron primitives, no new geometry system.
 */
function CentralTree() {
  const [x, z] = CENTRAL_TREE_POSITION
  const canopy = useMemo(
    () => [
      { pos: [0, 2.55, 0] as [number, number, number], r: 1.15 },
      { pos: [0.85, 2.2, 0.55] as [number, number, number], r: 0.72 },
      { pos: [-0.8, 2.35, -0.45] as [number, number, number], r: 0.66 },
      { pos: [0.15, 3.35, -0.4] as [number, number, number], r: 0.6 },
      { pos: [-0.55, 2.75, 0.75] as [number, number, number], r: 0.55 },
      { pos: [0.7, 3.0, -0.7] as [number, number, number], r: 0.5 },
    ],
    [],
  )
  return (
    <group position={[x, 0, z]}>
      {/* Two-stage tapered trunk instead of one uniform cylinder. */}
      <mesh position={[0, 0.55, 0]} rotation={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.52, 1.1, 9]} />
        <meshStandardMaterial color="#7a5c44" roughness={0.92} />
      </mesh>
      <mesh position={[0.05, 1.35, -0.03]} rotation={[0.04, 0.9, 0.02]} castShadow>
        <cylinderGeometry args={[0.26, 0.4, 1.05, 9]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.9} />
      </mesh>
      {canopy.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={[i * 0.7, i * 1.3, i * 0.4]} castShadow>
          <icosahedronGeometry args={[c.r, 1]} />
          <meshStandardMaterial color={TREE_GREENS[i % TREE_GREENS.length]} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** A light canopy over the large social table — "ลานนั่งคุยในสวน", not a restaurant. */
function Pavilion() {
  const [x, z] = PAVILION_POSITION
  const h = PAVILION_HALF_SIZE
  const corners: [number, number][] = [
    [x - h, z - h],
    [x + h, z - h],
    [x - h, z + h],
    [x + h, z + h],
  ]
  return (
    <group>
      <Instances limit={4} range={4}>
        <cylinderGeometry args={[0.06, 0.07, 2.3, 8]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
        {corners.map(([cx, cz], i) => (
          <Instance key={i} position={[cx, 1.15, cz]} />
        ))}
      </Instances>
      <mesh position={[x, 2.35, z]}>
        <coneGeometry args={[h * 1.55, 0.75, 4]} />
        <meshStandardMaterial color="#ffe3d0" roughness={0.7} />
      </mesh>
      <mesh position={[x, 1.75, z]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffe9b8" emissive="#ffd27a" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

/**
 * Single chairs right beside the waterfall — a backrest + seat, visually distinct from
 * the two-person QuietBenches below so "chair" vs "bench" reads correctly. Real sittable
 * seats now (see SEATS in gardenLayout.ts) — this only renders the mesh.
 */
function WaterfallChairs() {
  const [px, pz] = POOL_POSITION
  return (
    <>
      {WATERFALL_CHAIR_SPOTS.map(([x, z], i) => {
        const facing = Math.atan2(px - x, pz - z)
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, facing, 0]}>
            <mesh position={[0, 0.24, 0]}>
              <boxGeometry args={[0.44, 0.08, 0.42]} />
              <meshStandardMaterial color="#c98a5f" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.44, -0.19]}>
              <boxGeometry args={[0.44, 0.4, 0.06]} />
              <meshStandardMaterial color="#c98a5f" roughness={0.8} />
            </mesh>
            <mesh position={[-0.17, 0.12, -0.15]}>
              <cylinderGeometry args={[0.03, 0.03, 0.24, 6]} />
              <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
            </mesh>
            <mesh position={[0.17, 0.12, -0.15]}>
              <cylinderGeometry args={[0.03, 0.03, 0.24, 6]} />
              <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
            </mesh>
            <mesh position={[-0.17, 0.12, 0.15]}>
              <cylinderGeometry args={[0.03, 0.03, 0.24, 6]} />
              <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
            </mesh>
            <mesh position={[0.17, 0.12, 0.15]}>
              <cylinderGeometry args={[0.03, 0.03, 0.24, 6]} />
              <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/** Quiet-zone benches facing the waterfall pool — real sittable solo seats now (see SEATS in gardenLayout.ts), still atmosphere-styled furniture. */
function QuietBenches() {
  const [px, pz] = POOL_POSITION
  return (
    <>
      {QUIET_BENCH_SPOTS.map(([x, z], i) => {
        const facing = Math.atan2(px - x, pz - z)
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, facing, 0]}>
            <mesh position={[0, 0.28, 0]}>
              <boxGeometry args={[1.2, 0.12, 0.48]} />
              <meshStandardMaterial color="#c98a5f" roughness={0.8} />
            </mesh>
            <mesh position={[-0.5, 0.14, 0]}>
              <boxGeometry args={[0.11, 0.28, 0.48]} />
              <meshStandardMaterial color="#8a6a4f" roughness={0.8} />
            </mesh>
            <mesh position={[0.5, 0.14, 0]}>
              <boxGeometry args={[0.11, 0.28, 0.48]} />
              <meshStandardMaterial color="#8a6a4f" roughness={0.8} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

// Zero props, purely static — memoized for the same reason as GardenTables (see there).
export const GardenLandmarks = memo(function GardenLandmarks() {
  return (
    <>
      <FlowerArch />
      <CentralTree />
      <Pavilion />
      <WaterfallChairs />
      <QuietBenches />
    </>
  )
})
