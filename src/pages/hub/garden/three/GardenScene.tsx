import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { GardenPlayer } from './GardenPlayer'
import { RemoteGardenPlayer } from './RemoteGardenPlayer'
import { GardenObject } from './GardenObject'
import { GardenDecor } from './GardenDecor'
import { TapToMoveController } from './TapToMoveController'
import { createGrassTexture, createPathTexture } from './gardenTextures'
import { GARDEN_OBJECTS } from './gardenLayout'
import type { GardenControls } from './useGardenControls'
import type { GardenQualitySettings } from './useGardenQuality'
import type { GardenAvatarConfig, GardenMember } from '../../../../features/garden/types'
import type { GardenObjectDef } from './gardenLayout'

interface GardenSceneProps {
  controls: GardenControls
  playerAvatarConfig: GardenAvatarConfig
  spawn: [number, number]
  members: GardenMember[]
  onNearestChange: (id: GardenObjectDef['id'] | null) => void
  onNearestPlayerChange?: (id: string | null) => void
  onLocalMove?: (x: number, y: number, z: number, rotationY: number) => void
  quality: GardenQualitySettings
  onFrame?: (deltaSeconds: number) => void
  paused?: boolean
}

const LANTERN_SPOTS: [number, number][] = [
  [-2.4, 4.2],
  [2.4, 4.2],
  [-4.6, -3],
  [4.6, -3],
  [0, -5.6],
]

function Lanterns({ glow }: { glow: boolean }) {
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
          {glow && i < 2 ? <pointLight position={[0, 1.55, 0]} color="#ffd27a" intensity={1.1} distance={4.5} decay={2} /> : null}
        </group>
      ))}
    </>
  )
}

function Ground() {
  const grass = useMemo(() => createGrassTexture(), [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[9, 40]} />
      <meshStandardMaterial map={grass} roughness={1} />
    </mesh>
  )
}

function Paths() {
  const path = useMemo(() => createPathTexture(), [])
  return (
    <>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.4, 15]} />
        <meshStandardMaterial map={path} roughness={1} />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[1.1, 11]} />
        <meshStandardMaterial map={path} roughness={1} />
      </mesh>
    </>
  )
}

export function GardenScene({
  controls,
  playerAvatarConfig,
  spawn,
  members,
  onNearestChange,
  onNearestPlayerChange,
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
        <color attach="background" args={['#fdf3df']} />
        <fog attach="fog" args={['#fdf3df', 11, 25]} />
        <hemisphereLight args={['#fff1d6', '#7bb894', 0.65]} />
        <directionalLight
          position={[6, 8.5, 3.5]}
          intensity={1.15}
          color="#ffe3b0"
          castShadow={quality.shadows}
          shadow-mapSize={[512, 512]}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
          shadow-bias={-0.003}
        />

        <Ground />
        <Paths />
        <Lanterns glow={quality.shadows} />
        <GardenDecor density={quality.decorationDensity} fireflies={quality.decorationDensity > 0.6} />

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
          onNearestChange={onNearestChange}
          onNearestPlayerChange={onNearestPlayerChange}
          onLocalMove={onLocalMove}
          onFrame={onFrame}
        />
        <TapToMoveController controls={controls} />
      </Canvas>
    </div>
  )
}
