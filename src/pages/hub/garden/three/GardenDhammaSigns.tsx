import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { createSignTexture } from './gardenTextures'
import { irregularRockGeometries } from './gardenRocks'
import { TREE_OF_GOODNESS_POSITION, REFLECTION_WALL_POSITION } from './gardenLayout'
import { SIGN_QUOTES, WALL_QUOTES, TREE_OF_GOODNESS_QUOTES, type DhammaQuote } from '../../../../features/garden/dhammaQuotes'

const WALL_ROTATE_INTERVAL_MS = 50_000
const WALL_FADE_MS = 800
const TREE_SIGN_ROTATE_INTERVAL_MS = 40_000
/** How many quotes the Reflection Wall shows at once (spec §13: "only a few quotes at once"). */
const WALL_PANEL_COUNT = 3

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

/** Every physical, always-visible quote sign across the Garden — deliberately trimmed to
 * 4 (2 pavilion, 1 waterfall, 1 pond) by the map-declutter pass; see SIGN_QUOTES in
 * dhammaQuotes.ts. No main walking path carries a sign anymore. */
const DhammaSigns = memo(function DhammaSigns() {
  return (
    <>
      {SIGN_QUOTES.map((q) => (
        <QuoteSignPost key={q.id} quote={q} variant={q.zone === 'pond' || q.zone === 'waterfall' ? 'stone' : 'wood'} />
      ))}
    </>
  )
})

/** One panel of the Reflection Wall — its own texture (never cached, text differs per
 * quote), fading in lockstep with the other panels via the shared `opacity`. */
function WallPanel({ quote, offsetX, opacity }: { quote: DhammaQuote; offsetX: number; opacity: number }) {
  const texture = useMemo(() => createSignTexture(quote.title, quote.text, 'wood'), [quote.title, quote.text])
  return (
    <group position={[offsetX, 0, 0]}>
      <mesh position={[0, 1.1, 0.04]}>
        <planeGeometry args={[0.85, 0.56]} />
        <meshStandardMaterial map={texture} roughness={0.8} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 1.1, -0.005]}>
        <boxGeometry args={[0.9, 0.6, 0.04]} />
        <meshStandardMaterial color="#6f5439" roughness={0.9} transparent opacity={opacity} />
      </mesh>
    </group>
  )
}

/**
 * "🪨 กำแพงข้อคิด" Reflection Wall — the primary quote surface now (spec §13), replacing
 * the old single central board. A low stone wall carries 3 wooden panels side by side
 * (spec: "display only a few quotes at once"), all crossfading together on a slow
 * interval through WALL_QUOTES (13 reflections — everything relocated off the walking
 * paths, see dhammaQuotes.ts's map-declutter comments). No click required, no Firebase
 * sync needed (purely client-local, session-scoped rotation). Respects
 * prefers-reduced-motion by swapping instantly instead of fading.
 */
function ReflectionWall() {
  const [page, setPage] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const reduced = useMemo(() => prefersReducedMotion(), [])
  const phaseRef = useRef<'idle' | 'fadeOut' | 'fadeIn'>('idle')
  const phaseStartRef = useRef(0)
  const pageCount = Math.max(1, Math.ceil(WALL_QUOTES.length / WALL_PANEL_COUNT))

  useEffect(() => {
    if (reduced) {
      const id = window.setInterval(() => setPage((p) => (p + 1) % pageCount), WALL_ROTATE_INTERVAL_MS)
      return () => window.clearInterval(id)
    }
    const id = window.setInterval(() => {
      phaseRef.current = 'fadeOut'
      phaseStartRef.current = performance.now()
    }, WALL_ROTATE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reduced, pageCount])

  useFrame(() => {
    if (reduced || phaseRef.current === 'idle') return
    const elapsed = performance.now() - phaseStartRef.current
    if (phaseRef.current === 'fadeOut') {
      const t = Math.min(1, elapsed / WALL_FADE_MS)
      setOpacity(1 - t)
      if (t >= 1) {
        setPage((p) => (p + 1) % pageCount)
        phaseRef.current = 'fadeIn'
        phaseStartRef.current = performance.now()
      }
    } else if (phaseRef.current === 'fadeIn') {
      const t = Math.min(1, elapsed / WALL_FADE_MS)
      setOpacity(t)
      if (t >= 1) phaseRef.current = 'idle'
    }
  })

  const panelQuotes = useMemo(
    () => Array.from({ length: WALL_PANEL_COUNT }, (_, i) => WALL_QUOTES[(page * WALL_PANEL_COUNT + i) % WALL_QUOTES.length]),
    [page],
  )
  const [x, z] = REFLECTION_WALL_POSITION
  // Faces roughly toward the map center, same convention as every standalone sign post.
  const facing = Math.atan2(-x, -z)

  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      {/* Low natural-stone wall base. */}
      <mesh position={[0, 0.65, -0.06]} receiveShadow>
        <boxGeometry args={[3.1, 1.5, 0.18]} />
        <meshStandardMaterial color="#8b8478" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.02, -0.06]}>
        <boxGeometry args={[3.3, 0.14, 0.26]} />
        <meshStandardMaterial color="#726c62" roughness={0.95} />
      </mesh>
      {panelQuotes.map((quote, i) => (
        <WallPanel key={`${page}-${i}`} quote={quote} offsetX={(i - 1) * 1.05} opacity={opacity} />
      ))}
      {/* A couple of warm garden lights + low planting either side, per spec §13's "warm
          garden lights, plants around it". */}
      <mesh position={[-1.65, 1.5, 0.1]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#ffe9b8" emissive="#ffd27a" emissiveIntensity={1.0} />
      </mesh>
      <mesh position={[1.65, 1.5, 0.1]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#ffe9b8" emissive="#ffd27a" emissiveIntensity={1.0} />
      </mesh>
      {[-1.4, -0.7, 0.7, 1.4].map((px, i) => (
        <mesh key={i} position={[px, 0.16, 0.35]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial color="#6fa87f" roughness={0.85} />
        </mesh>
      ))}
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
      <ReflectionWall />
      <TreeOfGoodness />
    </>
  )
})
