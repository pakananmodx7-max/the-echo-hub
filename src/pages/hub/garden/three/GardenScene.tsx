import { memo, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { GardenPlayer } from './GardenPlayer'
import { RemoteGardenPlayer } from './RemoteGardenPlayer'
import { GardenObject } from './GardenObject'
import { GardenDecor } from './GardenDecor'
import { GardenTables } from './GardenTables'
import { GardenLandmarks } from './GardenLandmarks'
import { GardenSky } from './GardenSky'
import { GardenStage } from './GardenStage'
import { Waterfall } from './Waterfall'
import { TapToMoveController } from './TapToMoveController'
import {
  createGrassNormalTexture,
  createGrassTexture,
  createPathNormalTexture,
  createPathTexture,
} from './gardenTextures'
import {
  GARDEN_FOG_FAR,
  GARDEN_FOG_NEAR,
  GARDEN_GROUND_RADIUS,
  GARDEN_OBJECTS,
  GARDEN_PATH_SEGMENTS,
  LANTERN_SPOTS,
} from './gardenLayout'
import type { GardenControls } from './useGardenControls'
import type { GardenQualitySettings } from './useGardenQuality'
import type { GardenAvatarConfig, GardenMember } from '../../../../features/garden/types'
import type { GardenEmoteId } from '../../../../data/gardenEmotes'
import type { GardenObjectDef } from './gardenLayout'

interface GardenSceneProps {
  controls: GardenControls
  playerAvatarConfig: GardenAvatarConfig
  spawn: [number, number]
  members: GardenMember[]
  seatOccupancy?: Record<string, string>
  sittingSeatId?: string | null
  emote?: GardenEmoteId | null
  emoteStartedAt?: number | null
  onNearestChange: (id: GardenObjectDef['id'] | null) => void
  onNearestPlayerChange?: (id: string | null) => void
  onNearestSeatChange?: (seatId: string | null) => void
  onDanceZoneChange?: (inZone: boolean) => void
  onMovementStart?: () => void
  onLocalMove?: (x: number, y: number, z: number, rotationY: number) => void
  quality: GardenQualitySettings
  onFrame?: (deltaSeconds: number) => void
  paused?: boolean
}

// Ground/Paths/Lanterns are static (Lanterns only depends on the quality setting, not
// `members`) but GardenScene itself re-renders on every remote player's position tick —
// memoized so that frequent re-render never re-runs these three, matching the same
// treatment as GardenTables/GardenLandmarks/GardenDecor/Waterfall/GardenObject below.
const Lanterns = memo(function Lanterns({ glow }: { glow: boolean }) {
  return (
    <>
      {LANTERN_SPOTS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.5, 6]} />
            <meshStandardMaterial color="#6b6178" />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#ffe9b8" emissive="#ffd27a" emissiveIntensity={1.1} />
          </mesh>
          {/* Kept deliberately small (req. #13: limited dynamic lights) even though the map grew. */}
          {glow && i < 3 ? <pointLight position={[0, 1.55, 0]} color="#ffd27a" intensity={1.1} distance={4.5} decay={2} /> : null}
        </group>
      ))}
    </>
  )
})

const Ground = memo(function Ground() {
  const grass = useMemo(() => createGrassTexture(), [])
  const grassNormal = useMemo(() => createGrassNormalTexture(), [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[GARDEN_GROUND_RADIUS, 48]} />
      <meshStandardMaterial map={grass} normalMap={grassNormal} normalScale={new THREE.Vector2(0.35, 0.35)} roughness={1} />
    </mesh>
  )
})

/**
 * Every corridor connecting the garden's zones (see GARDEN_PATH_SEGMENTS in
 * gardenLayout.ts) — each segment reuses the SAME cached canvas texture object
 * (createPathTexture caches it once per session) but gets its own clone so its
 * repeat count can match its own length, keeping the tiled dirt pattern a similar
 * density on both a 2-unit stub and a 10-unit spine segment.
 */
const Paths = memo(function Paths() {
  const pathNormal = useMemo(() => createPathNormalTexture(), [])
  const segments = useMemo(() => {
    const base = createPathTexture()
    return GARDEN_PATH_SEGMENTS.map((seg) => {
      const texture = base.clone()
      texture.needsUpdate = true
      texture.repeat.set(Math.max(1, Math.round(seg.width * 1.4)), Math.max(1, Math.round(seg.length * 0.9)))
      return { seg, texture }
    })
  }, [])

  return (
    <>
      {segments.map(({ seg, texture }, i) => (
        <mesh
          key={i}
          position={[seg.position[0], 0.006, seg.position[1]]}
          rotation={[-Math.PI / 2, 0, seg.rotation]}
          receiveShadow
        >
          <planeGeometry args={[seg.width, seg.length]} />
          <meshStandardMaterial map={texture} normalMap={pathNormal} normalScale={new THREE.Vector2(0.3, 0.3)} roughness={1} />
        </mesh>
      ))}
    </>
  )
})

export function GardenScene({
  controls,
  playerAvatarConfig,
  spawn,
  members,
  seatOccupancy,
  sittingSeatId,
  emote,
  emoteStartedAt,
  onNearestChange,
  onNearestPlayerChange,
  onNearestSeatChange,
  onDanceZoneChange,
  onMovementStart,
  onLocalMove,
  quality,
  onFrame,
  paused = false,
}: GardenSceneProps) {
  return (
    <div className="isolate h-full w-full touch-none">
      <Canvas
        dpr={quality.dpr}
        shadows={quality.shadows}
        frameloop={paused ? 'never' : 'always'}
        gl={{ antialias: quality.antialias, powerPreference: 'low-power' }}
      >
        <color attach="background" args={['#f5dbb8']} />
        <fog attach="fog" args={['#f0d3ae', GARDEN_FOG_NEAR, GARDEN_FOG_FAR]} />
        <GardenSky cloudCount={quality.decorationDensity > 0.6 ? 3 : quality.decorationDensity > 0.3 ? 1 : 0} />
        {/* Warm directional "sun" + a cooler hemisphere fill — kept as the same two-light
            structure as before (req. #9: not many realtime dynamic lights), just retuned
            a little warmer/cooler for more evening contrast. */}
        <hemisphereLight args={['#ffe9c2', '#6fae86', 0.55]} />
        <directionalLight
          position={[6, 8.5, 3.5]}
          intensity={1.2}
          color="#ffcf8f"
          castShadow={quality.shadows}
          shadow-mapSize={[512, 512]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-16}
          shadow-bias={-0.003}
        />

        <Ground />
        <Paths />
        <Lanterns glow={quality.shadows} />
        <GardenDecor density={quality.decorationDensity} fireflies={quality.decorationDensity > 0.6} />
        <Waterfall />
        <GardenTables />
        <GardenLandmarks />
        <GardenStage castShadow={quality.shadows} />

        {GARDEN_OBJECTS.map((def) => (
          <GardenObject key={def.id} def={def} />
        ))}

        {members.map((m) => (
          <RemoteGardenPlayer key={m.id} member={m} />
        ))}

        <GardenPlayer
          controls={controls}
          avatarConfig={playerAvatarConfig}
          spawn={spawn}
          members={members}
          seatOccupancy={seatOccupancy}
          sittingSeatId={sittingSeatId}
          emote={emote}
          emoteStartedAt={emoteStartedAt}
          onNearestChange={onNearestChange}
          onNearestPlayerChange={onNearestPlayerChange}
          onNearestSeatChange={onNearestSeatChange}
          onDanceZoneChange={onDanceZoneChange}
          onMovementStart={onMovementStart}
          onLocalMove={onLocalMove}
          onFrame={onFrame}
        />
        <TapToMoveController controls={controls} />
      </Canvas>
    </div>
  )
}
