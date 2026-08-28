import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import {
  CENTRAL_TREE_POSITION,
  FLOWER_ARCH_GAP,
  FLOWER_ARCH_POSITION,
  PAVILION_HALF_SIZE,
  PAVILION_POSITION,
  POOL_POSITION,
  QUIET_BENCH_SPOTS,
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

/** The Plaza's iconic big tree — a bigger, distinct silhouette from the Song Tree so the two landmarks read differently. */
function CentralTree() {
  const [x, z] = CENTRAL_TREE_POSITION
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.46, 1.8, 9]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <icosahedronGeometry args={[1.55, 1]} />
        <meshStandardMaterial color="#7bb894" roughness={0.85} />
      </mesh>
      <mesh position={[0.95, 2.15, 0.55]} castShadow>
        <icosahedronGeometry args={[0.82, 1]} />
        <meshStandardMaterial color="#8fd6b4" roughness={0.85} />
      </mesh>
      <mesh position={[-0.9, 2.3, -0.5]} castShadow>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color="#a7e0c2" roughness={0.85} />
      </mesh>
      <mesh position={[0.15, 3.7, -0.5]} castShadow>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial color="#96d4b0" roughness={0.85} />
      </mesh>
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

/** Quiet-zone benches facing the waterfall pool — atmosphere/seating only, not interactive. */
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

export function GardenLandmarks() {
  return (
    <>
      <FlowerArch />
      <CentralTree />
      <Pavilion />
      <QuietBenches />
    </>
  )
}
