import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { GardenPlayer } from './GardenPlayer'
import { GardenAvatar } from './GardenAvatar'
import { GardenObject } from './GardenObject'
import { GARDEN_OBJECTS } from './gardenLayout'
import type { GardenControls } from './useGardenControls'
import type { GardenMember } from '../../../../features/garden/types'
import type { GardenObjectDef } from './gardenLayout'

interface GardenSceneProps {
  controls: GardenControls
  playerAvatarId: string | null
  members: GardenMember[]
  nearestId: GardenObjectDef['id'] | null
  onNearestChange: (id: GardenObjectDef['id'] | null) => void
  onSelectObject: (id: GardenObjectDef['id']) => void
  paused?: boolean
}

function LanternsAndPlants() {
  const lanterns = useMemo(
    () =>
      [
        [-2.4, 4.2],
        [2.4, 4.2],
        [-4.6, -3],
        [4.6, -3],
        [0, -5.6],
      ] as [number, number][],
    [],
  )
  const plants = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2
        const radius = 5.6 + (i % 3) * 0.5
        return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number]
      }),
    [],
  )

  return (
    <>
      {lanterns.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.5, 6]} />
            <meshStandardMaterial color="#6b6178" />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#ffe9b8" emissive="#ffd27a" emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}
      {plants.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]}>
          <coneGeometry args={[0.16, 0.32, 6]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#8fd6b4' : '#a480f5'} roughness={0.9} />
        </mesh>
      ))}
    </>
  )
}

function Paths() {
  return (
    <>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 15]} />
        <meshStandardMaterial color="#f2e9d8" roughness={1} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[1.1, 11]} />
        <meshStandardMaterial color="#f2e9d8" roughness={1} />
      </mesh>
    </>
  )
}

export function GardenScene({
  controls,
  playerAvatarId,
  members,
  nearestId,
  onNearestChange,
  onSelectObject,
  paused = false,
}: GardenSceneProps) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true
    lastX.current = e.clientX
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    controls.cameraYawRef.current -= dx * 0.006
  }
  function handlePointerUp() {
    dragging.current = false
  }

  return (
    <div
      className="isolate h-full w-full touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Canvas
        dpr={[1, 1.5]}
        shadows={false}
        frameloop={paused ? 'never' : 'always'}
        gl={{ antialias: true, powerPreference: 'low-power' }}
      >
        <color attach="background" args={['#fdfaf4']} />
        <fog attach="fog" args={['#fdfaf4', 12, 26]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 8, 4]} intensity={0.6} />

        {/* ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <circleGeometry args={[9, 32]} />
          <meshStandardMaterial color="#e7f2ea" roughness={1} />
        </mesh>

        <Paths />
        <LanternsAndPlants />

        {GARDEN_OBJECTS.map((def) => (
          <GardenObject key={def.id} def={def} active={nearestId === def.id} onSelect={onSelectObject} />
        ))}

        {members.map((m) => (
          <group key={m.id} position={[m.position[0] * 4.5, 0, m.position[1] * 4.5]}>
            <GardenAvatar avatarId={m.avatarId} codename={m.codename} mood={m.mood} />
          </group>
        ))}

        <GardenPlayer controls={controls} avatarId={playerAvatarId} onNearestChange={onNearestChange} />
      </Canvas>
    </div>
  )
}
