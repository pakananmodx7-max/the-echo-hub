import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { createWoodTexture } from './gardenTextures'
import {
  DANCE_FLOOR_POSITION,
  DANCE_FLOOR_RADIUS,
  DJ_BOOTH_POSITION,
  SPEAKER_POSITIONS,
  STAGE_HALF_DEPTH,
  STAGE_HALF_WIDTH,
  STAGE_HEIGHT,
  STAGE_POSITION,
} from './gardenLayout'
import { GardenCharacter } from './GardenCharacter'
import { DEFAULT_GARDEN_AVATAR_CONFIG } from '../../../../data/gardenAvatarOptions'

const STAGE_FLOOR = '#a8794f'
const STAGE_TRIM = '#8a6a4f'
const SPEAKER_BODY = '#4a4038'
// ECHO ธรรมอุทยาน retheme (spec §19: "avoid nightclub look, excessive neon") — warm
// amber/gold instead of the previous bright pink, reading as a community-pavilion string
// light rather than a club accent. Same fixed emissive-strip technique, just retinted.
const ACCENT = '#f0b86a'
const DANCE_FLOOR_COLOR = '#8a6a4f'

const DJ_CONFIG = {
  ...DEFAULT_GARDEN_AVATAR_CONFIG,
  topStyle: 'hoodie' as const,
  topColor: '#5a4b78',
  accessory: 'headphones' as const,
}

/** Small, self-contained head-bob/hand-move loop for the DJ NPC — same sinusoidal
 * technique as GardenCharacter's own walk-bob, no beat detection, loops naturally per
 * spec (req. #20) whether or not Garden Music happens to be playing. */
function DjNpc() {
  const headRef = useRef<THREE.Group>(null)
  const leftHandRef = useRef<THREE.Mesh>(null)
  const rightHandRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(t * 2.2) * 0.08
      headRef.current.position.y = 1.5 + Math.sin(t * 2.2) * 0.02
    }
    if (leftHandRef.current) leftHandRef.current.position.y = 0.62 + Math.sin(t * 2.4) * 0.05
    if (rightHandRef.current) rightHandRef.current.position.y = 0.62 + Math.sin(t * 2.4 + Math.PI * 0.6) * 0.05
  })

  return (
    <group position={[DJ_BOOTH_POSITION[0], STAGE_HEIGHT, DJ_BOOTH_POSITION[1]]}>
      {/* Podium */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.1, 0.7, 0.5]} />
        <meshStandardMaterial color={STAGE_TRIM} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.71, 0]}>
        <boxGeometry args={[1.15, 0.06, 0.55]} />
        <meshStandardMaterial color="#2e2740" roughness={0.6} metalness={0.35} />
      </mesh>
      {/* Small mixer glow — a fixed emissive accent rather than a real light source */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.2]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.9} />
      </mesh>
      <group ref={headRef} position={[0, 1.5, -0.35]}>
        <GardenCharacter config={DJ_CONFIG} />
      </group>
      <mesh ref={leftHandRef} position={[-0.22, 0.62, 0.1]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#e8c19d" roughness={0.8} />
      </mesh>
      <mesh ref={rightHandRef} position={[0.22, 0.62, 0.1]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#e8c19d" roughness={0.8} />
      </mesh>
    </group>
  )
}

function Speaker({ position }: { position: [number, number] }) {
  return (
    <group position={[position[0], STAGE_HEIGHT, position[1]]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 1.1, 0.45]} />
        <meshStandardMaterial color={SPEAKER_BODY} roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.75, 0.24]}>
        <circleGeometry args={[0.15, 14]} />
        <meshStandardMaterial color="#1c1826" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.4, 0.24]}>
        <circleGeometry args={[0.11, 14]} />
        <meshStandardMaterial color="#1c1826" roughness={0.5} />
      </mesh>
    </group>
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
 * "🎶 ลานเสียงแห่งใจ" (Zone I/J, ECHO ธรรมอุทยาน retheme of the former "Stage/DJ Booth") —
 * a warm wooden community performance pavilion, not a nightclub: raised platform, steps,
 * two speakers, a DJ booth with a looping procedural NPC (visually framed as "Sound of
 * ECHO / ผู้เปิดเพลง" in the HUD copy around it). All multiplayer/dance/emote/music systems
 * are byte-for-byte unchanged — this file only retints materials (warm amber accent
 * instead of pink, earthy dance-floor tone instead of violet) and updates comments/labels.
 * Its footprint is solid collision (see STAGE_OBSTACLES in gardenLayout.ts) — players walk
 * around it, not onto it, since this engine has no per-object avatar elevation.
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
      {SPEAKER_POSITIONS.map((p, i) => (
        <Speaker key={i} position={p} />
      ))}
      <DjNpc />
    </group>
  )
})
