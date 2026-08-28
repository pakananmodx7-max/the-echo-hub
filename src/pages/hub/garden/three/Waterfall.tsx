import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createWaterfallTexture } from './gardenTextures'
import { POOL_POSITION, POOL_RADIUS, WATERFALL_POSITION } from './gardenLayout'

const CLIFF_COLOR = '#c2b8d1'
const CLIFF_COLOR_DARK = '#b0a3c0'
const POOL_COLOR = '#9fd8de'
const FOAM_COLOR = '#fdfaf4'

/**
 * The garden's main landmark: a stylized cliff + two falling water streaks + a pool.
 * Deliberately lightweight — no fluid simulation, no particle system, no reflective
 * plane: the "moving water" is just a scrolling canvas texture (see
 * createWaterfallTexture), and the pool's shimmer is a single slowly-pulsing emissive
 * ring. Cheap enough to run at full quality on mobile while still feeling alive.
 */
export function Waterfall() {
  const [wx, wz] = WATERFALL_POSITION
  const [px, pz] = POOL_POSITION
  const waterTexA = useMemo(() => createWaterfallTexture(), [])
  const waterTexB = useMemo(() => createWaterfallTexture(), [])
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    waterTexA.offset.y -= delta * 0.35
    waterTexB.offset.y -= delta * 0.5
    if (ringRef.current) {
      const pulse = 0.55 + Math.sin(state.clock.elapsedTime * 0.8) * 0.12
      const mat = ringRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = pulse
    }
  })

  return (
    <group>
      {/* Cliff — a cluster of low-poly boulders (same dodecahedron/icosahedron language
          as the garden's existing stones/trees), not flat box "walls" — reads as a rock
          outcrop rather than a building, and stays roughly tree-height so it feels like
          a calming backdrop rather than a monolith. */}
      <group position={[wx, 0, wz]}>
        {[
          { pos: [0.1, 1.35, -1.0], r: 1.55, color: CLIFF_COLOR_DARK, rot: [0.3, 0.6, 0.1] },
          { pos: [0.5, 1.05, -2.7], r: 1.15, color: CLIFF_COLOR, rot: [0.6, 0.2, 0.4] },
          { pos: [0.4, 0.95, 1.1], r: 1.1, color: CLIFF_COLOR, rot: [0.2, 0.8, 0.3] },
          { pos: [-0.1, 0.75, 2.4], r: 0.85, color: CLIFF_COLOR_DARK, rot: [0.5, 0.4, 0.6] },
          { pos: [0.7, 2.15, -0.7], r: 0.85, color: CLIFF_COLOR, rot: [0.4, 0.3, 0.2] },
        ].map((rock, i) => (
          <mesh key={i} position={rock.pos as [number, number, number]} rotation={rock.rot as [number, number, number]} castShadow>
            <dodecahedronGeometry args={[rock.r, 0]} />
            <meshStandardMaterial color={rock.color} roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* Falling water — two scrolling streaks emerging from a gap in the boulder
          cluster, just proud of the rock so they aren't clipped into it. */}
      <mesh position={[wx + 1.55, 1.35, wz - 0.9]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 2.6]} />
        <meshStandardMaterial map={waterTexA} transparent opacity={0.88} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[wx + 1.55, 1.05, wz - 0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.36, 2.1]} />
        <meshStandardMaterial map={waterTexB} transparent opacity={0.8} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Pool at the base */}
      <mesh position={[px, 0.04, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[POOL_RADIUS, 28]} />
        <meshStandardMaterial color={POOL_COLOR} roughness={0.25} metalness={0.05} />
      </mesh>
      <mesh ref={ringRef} position={[px, 0.05, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[POOL_RADIUS * 0.55, POOL_RADIUS * 0.72, 24]} />
        <meshStandardMaterial color={FOAM_COLOR} transparent opacity={0.6} depthWrite={false} />
      </mesh>

      {/* A short shallow stream trailing from the pool toward the path */}
      <mesh position={[px + POOL_RADIUS + 0.7, 0.03, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 0.55]} />
        <meshStandardMaterial color={POOL_COLOR} roughness={0.3} transparent opacity={0.75} />
      </mesh>
    </group>
  )
}
