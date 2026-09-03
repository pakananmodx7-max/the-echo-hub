import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { createWoodTexture } from './gardenTextures'
import {
  DANCE_FLOOR_POSITION,
  DANCE_FLOOR_RADIUS,
  PLAZA_BENCH_SPOTS,
  PLAZA_TREE_SPOTS,
  STAGE_HALF_DEPTH,
  STAGE_HALF_WIDTH,
  STAGE_HEIGHT,
  STAGE_POSITION,
} from './gardenLayout'

const STAGE_FLOOR = '#a8794f'
const STAGE_TRIM = '#8a6a4f'
// ECHO ธรรมอุทยาน retheme (spec §19: "avoid nightclub look, excessive neon") — warm
// amber/gold instead of the previous bright pink, reading as a community-pavilion string
// light rather than a club accent. Same fixed emissive-strip technique, just retinted.
const ACCENT = '#f0b86a'
const DANCE_FLOOR_COLOR = '#8a6a4f'
const PLAZA_TREE_GREENS = ['#7bb894', '#8fd6b4']

/** A couple of restrained benches around the plaza's edge — real sittable solo seats
 * (see `plaza_bench_*` in SEATS, gardenLayout.ts), same visual language as QuietBenches
 * in GardenLandmarks.tsx so furniture reads consistently across the garden. */
function PlazaBenches() {
  const [sx, sz] = STAGE_POSITION
  return (
    <>
      {PLAZA_BENCH_SPOTS.map(([x, z], i) => {
        const facing = Math.atan2(sx - x, sz - z)
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

/** A couple of small trees framing the plaza's edge — smaller/simpler than CentralTree
 * (this is background landscaping, not a landmark), same primitive-icosahedron technique. */
function PlazaTrees() {
  return (
    <>
      {PLAZA_TREE_SPOTS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.22, 1.0, 8]} />
            <meshStandardMaterial color="#7a5c44" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.35, 0]} rotation={[i * 0.5, i * 0.9, 0]} castShadow>
            <icosahedronGeometry args={[0.65, 1]} />
            <meshStandardMaterial color={PLAZA_TREE_GREENS[i % PLAZA_TREE_GREENS.length]} roughness={0.85} />
          </mesh>
          <mesh position={[0.35, 1.15, 0.3]} rotation={[i * 0.3, i * 1.1, 0]} castShadow>
            <icosahedronGeometry args={[0.4, 1]} />
            <meshStandardMaterial color={PLAZA_TREE_GREENS[(i + 1) % PLAZA_TREE_GREENS.length]} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/**
 * Zone K — the open floor in front of the stage. A tinted, slightly emissive ring reads
 * as "this spot is special" without a texture asset; the actual "am I standing in this
 * zone" check is a plain radius test in GardenPlayer.tsx, this is purely the visual cue.
 */
function DanceFloor() {
  const ringRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ringRef.current) return
    const mat = ringRef.current.material as THREE.MeshStandardMaterial
    mat.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 0.6) * 0.1
  })
  return (
    <group position={[DANCE_FLOOR_POSITION[0], 0.008, DANCE_FLOOR_POSITION[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[DANCE_FLOOR_RADIUS, 32]} />
        <meshStandardMaterial color={DANCE_FLOOR_COLOR} transparent opacity={0.16} roughness={0.9} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[DANCE_FLOOR_RADIUS - 0.08, DANCE_FLOOR_RADIUS, 32]} />
        <meshStandardMaterial color="#ffb3d1" emissive="#ffb3d1" emissiveIntensity={0.6} transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * "🌿 ลานกิจกรรม" (Activity Plaza, Zone I/K) — a later task removed the DJ NPC, DJ booth,
 * and speakers entirely: an open wooden platform with steps and a couple of restrained
 * benches/trees around its edge, no performer or equipment on it. Anyone can walk up,
 * sit, or dance/emote here — nothing requires a DJ or stage. All multiplayer/dance/emote/
 * music systems are byte-for-byte unchanged (this component keeps its `GardenStage` name/
 * export to avoid import churn in GardenScene.tsx). Its footprint is solid collision (see
 * STAGE_OBSTACLES in gardenLayout.ts) — players walk around it, not onto it, since this
 * engine has no per-object avatar elevation.
 */
export const GardenStage = memo(function GardenStage({ castShadow }: { castShadow: boolean }) {
  const wood = useMemo(() => createWoodTexture(), [])
  const [sx, sz] = STAGE_POSITION
  const stepPositions = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => [sx, STAGE_HEIGHT - (i + 1) * (STAGE_HEIGHT / 3), sz + STAGE_HALF_DEPTH + 0.25 + i * 0.32] as [number, number, number]),
    [sx, sz],
  )

  return (
    <group>
      <DanceFloor />
      <mesh position={[sx, STAGE_HEIGHT / 2, sz]} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[STAGE_HALF_WIDTH * 2, STAGE_HEIGHT, STAGE_HALF_DEPTH * 2]} />
        <meshStandardMaterial map={wood} color={STAGE_FLOOR} roughness={0.8} />
      </mesh>
      {/* Access steps at the front edge (req. #19) — decorative depth cue, not separately walkable/elevated. */}
      <Instances limit={4} range={stepPositions.length}>
        <boxGeometry args={[1.4, 0.15, 0.34]} />
        <meshStandardMaterial color={STAGE_TRIM} roughness={0.8} />
        {stepPositions.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      {/* A low back rail + a few emissive accent strips instead of extra dynamic point
          lights (req. #9/#10: limited realtime lights). */}
      <mesh position={[sx, STAGE_HEIGHT + 0.02, sz - STAGE_HALF_DEPTH + 0.05]}>
        <boxGeometry args={[STAGE_HALF_WIDTH * 1.9, 0.04, 0.04]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.7} />
      </mesh>
      <PlazaBenches />
      <PlazaTrees />
    </group>
  )
})
