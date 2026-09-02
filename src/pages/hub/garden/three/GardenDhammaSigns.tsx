import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { createSignTexture } from './gardenTextures'
import { irregularRockGeometries } from './gardenRocks'
import { TREE_OF_GOODNESS_POSITION } from './gardenLayout'
import { SIGN_QUOTES, BOARD_QUOTES, TREE_OF_GOODNESS_QUOTES, type DhammaQuote } from '../../../../features/garden/dhammaQuotes'

/** Central "ข้อคิดวันนี้" board — near the Plaza, distinct from any single sign's spot. */
const BOARD_POSITION: [number, number] = [-0.9, -0.6]

const BOARD_ROTATE_INTERVAL_MS = 40_000
const BOARD_FADE_MS = 700
const TREE_SIGN_ROTATE_INTERVAL_MS = 40_000

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** One wooden/stone quote board on a post — always visible, no click required (spec §6). */
function QuoteSignPost({ quote, variant = 'wood' }: { quote: DhammaQuote; variant?: 'wood' | 'stone' }) {
  const texture = useMemo(() => createSignTexture(quote.title, quote.text, variant), [quote.title, quote.text, variant])
  const [x, z] = quote.position!
  // Faces roughly toward the map center so a player walking the paths sees it front-on
  // rather than edge-on, without needing per-sign manual rotation tuning.
  const facing = Math.atan2(-x, -z)
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1.1, 7]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.15, 0.03]}>
        <planeGeometry args={[0.82, 0.5]} />
        <meshStandardMaterial map={texture} roughness={0.8} />
      </mesh>
      {/* Thin frame edge so the board reads as a physical object, not a floating decal. */}
      <mesh position={[0, 1.15, -0.01]}>
        <boxGeometry args={[0.86, 0.54, 0.03]} />
        <meshStandardMaterial color={variant === 'wood' ? '#6f5439' : '#8b8290'} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Every physical, always-visible quote sign across the Garden — see SIGN_QUOTES in
 * dhammaQuotes.ts for the full placement list (currently 13, target 12-18 per spec §7). */
const DhammaSigns = memo(function DhammaSigns() {
  return (
    <>
      {SIGN_QUOTES.map((q) => (
        <QuoteSignPost key={q.id} quote={q} variant={q.zone === 'pond' || q.zone === 'waterfall' ? 'stone' : 'wood'} />
      ))}
    </>
  )
})

/** The central rotating "🌿 ข้อคิดวันนี้" board — cycles BOARD_QUOTES automatically with a
 * gentle crossfade, no click, no Firebase sync needed (every nearby player just reads
 * whatever text is currently rendered — a purely client-local, session-scoped rotation is
 * indistinguishable from a synced one for this purpose). Respects prefers-reduced-motion
 * by swapping instantly instead of fading. */
function CentralQuoteBoard() {
  const [index, setIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const phaseRef = useRef<'idle' | 'fadeOut' | 'fadeIn'>('idle')
  const phaseStartRef = useRef(0)

  useEffect(() => {
    if (reduced) {
      const id = window.setInterval(() => setIndex((i) => (i + 1) % BOARD_QUOTES.length), BOARD_ROTATE_INTERVAL_MS)
      return () => window.clearInterval(id)
    }
    const id = window.setInterval(() => {
      phaseRef.current = 'fadeOut'
      phaseStartRef.current = performance.now()
    }, BOARD_ROTATE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reduced])

  useFrame(() => {
    if (reduced || phaseRef.current === 'idle') return
    const elapsed = performance.now() - phaseStartRef.current
    if (phaseRef.current === 'fadeOut') {
      const t = Math.min(1, elapsed / BOARD_FADE_MS)
      setOpacity(1 - t)
      if (t >= 1) {
        setIndex((i) => (i + 1) % BOARD_QUOTES.length)
        phaseRef.current = 'fadeIn'
        phaseStartRef.current = performance.now()
      }
    } else if (phaseRef.current === 'fadeIn') {
      const t = Math.min(1, elapsed / BOARD_FADE_MS)
      setOpacity(t)
      if (t >= 1) phaseRef.current = 'idle'
    }
  })

  const quote = BOARD_QUOTES[index]
  const texture = useMemo(() => createSignTexture('🌿 ข้อคิดวันนี้', quote.text, 'wood'), [quote.text])
  const [x, z] = BOARD_POSITION

  return (
    <group position={[x, 0, z]}>
      <mesh position={[-0.5, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 1.4, 7]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
      </mesh>
      <mesh position={[0.5, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 1.4, 7]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.45, 0.03]}>
        <planeGeometry args={[1.15, 0.68]} />
        <meshStandardMaterial map={texture} roughness={0.8} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 1.45, -0.02]}>
        <boxGeometry args={[1.2, 0.72, 0.04]} />
        <meshStandardMaterial color="#6f5439" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <coneGeometry args={[0.85, 0.28, 4]} />
        <meshStandardMaterial color="#c98a5f" roughness={0.75} />
      </mesh>
    </group>
  )
}

const TREE_GREENS = ['#6fa87f', '#7bb894', '#8fd6b4', '#568569']

/**
 * "🌳 ต้นไม้แห่งความดี" — a large shade tree, deliberately distinct in silhouette from
 * both the Plaza's CentralTree (upright, tapered) and the Song Tree (smaller, rounder):
 * this one leans slightly with a broader, flatter canopy, reading as an old, settled shade
 * tree. Visual/learning landmark only (spec §18) — no click, no reward logic here.
 */
function TreeOfGoodness() {
  const [x, z] = TREE_OF_GOODNESS_POSITION
  const canopy = useMemo(
    () => [
      { pos: [0, 2.7, 0] as [number, number, number], r: 1.3 },
      { pos: [1.05, 2.3, 0.5] as [number, number, number], r: 0.85 },
      { pos: [-1.0, 2.4, -0.5] as [number, number, number], r: 0.8 },
      { pos: [0.3, 3.3, -0.6] as [number, number, number], r: 0.65 },
      { pos: [-0.6, 2.9, 0.9] as [number, number, number], r: 0.6 },
      { pos: [0.8, 2.0, -1.0] as [number, number, number], r: 0.55 },
      { pos: [-1.1, 1.9, 0.6] as [number, number, number], r: 0.5 },
    ],
    [],
  )
  const rocks = useMemo(() => irregularRockGeometries(3), [])

  // A gentle rotating kindness reflection beside the tree — no click required (spec §18).
  const [qIndex, setQIndex] = useState(0)
  useEffect(() => {
    const id = window.setInterval(
      () => setQIndex((i) => (i + 1) % TREE_OF_GOODNESS_QUOTES.length),
      TREE_SIGN_ROTATE_INTERVAL_MS,
    )
    return () => window.clearInterval(id)
  }, [])
  const quote = TREE_OF_GOODNESS_QUOTES[qIndex]
  const texture = useMemo(() => createSignTexture('🌿 ข้อคิดเตือนใจ', quote.text, 'wood'), [quote.text])

  return (
    <group position={[x, 0, z]}>
      {/* Leaning trunk — a small fixed tilt on the group differentiates this tree's whole
          silhouette from the perfectly upright CentralTree/SongTree at a glance. */}
      <group rotation={[0.05, 0, 0.09]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.58, 1.4, 9]} />
          <meshStandardMaterial color="#7a5c44" roughness={0.92} />
        </mesh>
        <mesh position={[0.1, 1.7, -0.05]} rotation={[0.05, 0.6, 0.03]} castShadow>
          <cylinderGeometry args={[0.28, 0.42, 1.2, 9]} />
          <meshStandardMaterial color="#8a6a4f" roughness={0.9} />
        </mesh>
        {canopy.map((c, i) => (
          <mesh key={i} position={c.pos} rotation={[i * 0.5, i * 1.1, i * 0.3]} castShadow>
            <icosahedronGeometry args={[c.r, 1]} />
            <meshStandardMaterial color={TREE_GREENS[i % TREE_GREENS.length]} roughness={0.85} />
          </mesh>
        ))}
      </group>
      {/* Small flowers + stones around the base (spec §17). */}
      {[0.9, 1.2, 0.7, 1.05].map((r, i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.08, Math.sin(a) * r]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#ffd7e6' : '#fff3b0'} roughness={0.7} />
          </mesh>
        )
      })}
      <mesh position={[-0.85, 0.12, 0.75]} rotation={[0.2, 0.5, 0.1]} scale={0.4} geometry={rocks[0]}>
        <meshStandardMaterial color="#a79bb0" roughness={0.95} />
      </mesh>
      <mesh position={[0.95, 0.1, -0.7]} rotation={[0.1, 1.2, 0.3]} scale={0.32} geometry={rocks[1]}>
        <meshStandardMaterial color="#a79bb0" roughness={0.95} />
      </mesh>
      {/* Wooden sign + rotating kindness reflection, offset from the trunk. */}
      <group position={[1.5, 0, 0.3]} rotation={[0, -0.6, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 1.0, 7]} />
          <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.02, 0.02]}>
          <planeGeometry args={[0.78, 0.46]} />
          <meshStandardMaterial map={texture} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.02, -0.01]}>
          <boxGeometry args={[0.82, 0.5, 0.03]} />
          <meshStandardMaterial color="#6f5439" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

/** Mounted once in GardenScene alongside GardenLandmarks/GardenStage — zero props, purely
 * static positions from dhammaQuotes.ts + gardenLayout.ts (same memoization reasoning as
 * every other static Garden group: GardenScene re-renders on every remote player tick). */
export const GardenDhammaSigns = memo(function GardenDhammaSigns() {
  return (
    <>
      <DhammaSigns />
      <CentralQuoteBoard />
      <TreeOfGoodness />
    </>
  )
})
