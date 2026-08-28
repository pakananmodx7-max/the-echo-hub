import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'

interface GardenDecorProps {
  density: number
  fireflies: boolean
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BUSH_GREENS = ['#7bb894', '#8fd6b4', '#6fa87f']
const FLOWER_COLORS = ['#ffd7e6', '#ff9fc0', '#f6f0ff', '#e0c8ff']

// density/fireflies only change when the user changes their quality setting, never on a
// members/presence tick — memoized so GardenScene re-rendering on every remote player
// move doesn't re-run the bush/flower/stone scatter generation and re-diff ~115 Instances.
export const GardenDecor = memo(function GardenDecor({ density, fireflies }: GardenDecorProps) {
  const rand = useMemo(() => mulberry32(20260826), [])

  // Radius ranges widened for the Map Improvement phase's bigger garden (GARDEN_BOUND
  // 10.5, ground radius 16) — a bit past GARDEN_BOUND on purpose so the outer ring still
  // reads as garden rather than bare grass, while staying clear of the Plaza/path hub
  // near the center. Purely cosmetic scatter (no collision), same as before — it isn't
  // zone-aware, so an occasional bush near a table/path edge is an accepted trade-off,
  // same as the original design.
  const bushSpots = useMemo(() => {
    const count = Math.max(2, Math.round(14 * density))
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2
      const radius = 3.5 + rand() * 10.5
      return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number]
    })
  }, [density, rand])

  const flowerSpots = useMemo(() => {
    const count = Math.max(3, Math.round(32 * density))
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2
      const radius = 2.5 + rand() * 12
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, Math.floor(rand() * FLOWER_COLORS.length)] as [
        number,
        number,
        number,
      ]
    })
  }, [density, rand])

  const stoneSpots = useMemo(() => {
    const count = Math.max(2, Math.round(10 * density))
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2
      const radius = 4 + rand() * 10.5
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, rand() * Math.PI] as [number, number, number]
    })
  }, [density, rand])

  return (
    <>
      <Instances limit={45} range={bushSpots.length * 3}>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial roughness={0.85} />
        {bushSpots.map(([x, z], i) => (
          <group key={i}>
            <Instance position={[x, 0.28, z]} scale={1} color={BUSH_GREENS[i % BUSH_GREENS.length]} />
            <Instance
              position={[x + 0.28, 0.22, z + 0.1]}
              scale={0.72}
              color={BUSH_GREENS[(i + 1) % BUSH_GREENS.length]}
            />
            <Instance
              position={[x - 0.22, 0.2, z - 0.2]}
              scale={0.62}
              color={BUSH_GREENS[(i + 2) % BUSH_GREENS.length]}
            />
          </group>
        ))}
      </Instances>

      <Instances limit={30} range={stoneSpots.length}>
        <dodecahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#a79bb0" roughness={0.95} />
        {stoneSpots.map(([x, z, r], i) => (
          <Instance key={i} position={[x, 0.1, z]} rotation={[r * 0.4, r, r * 0.2]} />
        ))}
      </Instances>

      <Instances limit={40} range={flowerSpots.length}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial roughness={0.7} />
        {flowerSpots.map(([x, z, colorIdx], i) => (
          <Instance key={i} position={[x, 0.1, z]} color={FLOWER_COLORS[colorIdx]} />
        ))}
      </Instances>

      {fireflies ? <Fireflies count={Math.round(10 * density)} rand={rand} /> : null}
    </>
  )
})

function Fireflies({ count, rand }: { count: number; rand: () => number }) {
  const spots = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (rand() - 0.5) * 10,
        z: (rand() - 0.5) * 10,
        baseY: 0.6 + rand() * 1.2,
        phase: rand() * Math.PI * 2,
        speed: 0.5 + rand() * 0.6,
      })),
    [count, rand],
  )
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const s = spots[i]
      if (!s) return
      child.position.y = s.baseY + Math.sin(t * s.speed + s.phase) * 0.25
    })
  })

  return (
    <group ref={groupRef}>
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, s.baseY, s.z]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshStandardMaterial color="#ffe9b8" emissive="#ffd27a" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  )
}
