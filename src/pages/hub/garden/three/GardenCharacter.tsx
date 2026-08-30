import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { SKIN_TONES } from '../../../../data/gardenAvatarOptions'
import type { GardenAvatarConfig } from '../../../../features/garden/types'
import type { GardenEmoteId } from '../../../../data/gardenEmotes'

interface GardenCharacterProps {
  config: GardenAvatarConfig
  /** When provided, walking bob/sway plays while this ref is true — read every frame, not React state. */
  walkingRef?: { current: boolean }
  /** Garden V2: bends the legs at a hip pivot for a seated silhouette (see LegsMesh). */
  seated?: boolean
  /** Garden V2 emotes — id + a start timestamp (ms, Date.now()-comparable). Every client
   * (owner and viewers alike) derives elapsed time locally from `emoteStartedAt`; no
   * animation frames are ever synced over the network — see gardenEmoteService.ts. */
  emote?: GardenEmoteId | null
  emoteStartedAt?: number | null
}

function skinHex(tone: GardenAvatarConfig['skinTone']): string {
  return SKIN_TONES.find((t) => t.id === tone)?.hex ?? '#e8c19d'
}

export function GardenCharacter({ config, walkingRef, seated = false, emote = null, emoteStartedAt = null }: GardenCharacterProps) {
  const bodyRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)
  const t0 = useRef(Math.random() * Math.PI * 2)

  const skin = skinHex(config.skinTone)

  useFrame((state) => {
    const t = state.clock.elapsedTime + t0.current
    const walking = walkingRef?.current ?? false
    const elapsed = emote && emoteStartedAt != null ? Math.max(0, (Date.now() - emoteStartedAt) / 1000) : 0

    if (bodyRef.current) {
      const bobSpeed = walking ? 8 : 1.6
      const bobAmount = walking ? 0.035 : 0.018
      let posY = Math.sin(t * bobSpeed) * bobAmount
      let rotZ = walking ? Math.sin(t * bobSpeed) * 0.05 : 0
      let rotY = 0

      // Emote poses reuse the same body/arm refs the walk-bob animation already drives —
      // no extra meshes, just different rotation targets. "spin" and "dance_02" rotate
      // ONLY this character's own group Y (never GardenPlayer's movement-facing yaw or the
      // camera — see the Garden V2 plan's camera-preservation requirement).
      if (emote === 'dance_01') {
        posY += Math.abs(Math.sin(elapsed * 6)) * 0.05
        rotZ = Math.sin(elapsed * 6) * 0.16
      } else if (emote === 'dance_02') {
        rotY = Math.sin(elapsed * 4.5) * 0.3
      } else if (emote === 'spin') {
        rotY = (elapsed / 0.9) * Math.PI * 2
      } else if (emote === 'jump') {
        posY += Math.sin(Math.min(elapsed / 0.9, 1) * Math.PI) * 0.22
      }
      bodyRef.current.position.y = posY
      bodyRef.current.rotation.z = rotZ
      bodyRef.current.rotation.y = rotY
    }

    if (leftArmRef.current && rightArmRef.current) {
      let leftX = walking ? Math.sin(t * 8) * 0.35 : Math.sin(t * 1.6) * 0.03
      let rightX = walking ? -Math.sin(t * 8) * 0.35 : -Math.sin(t * 1.6) * 0.03
      let leftZ = 0
      let rightZ = 0

      if (emote === 'wave') {
        rightX = -2.2 + Math.sin(elapsed * 9) * 0.3
      } else if (emote === 'clap') {
        leftX = -1.6
        rightX = -1.6
        leftZ = Math.sin(elapsed * 12) * 0.18
        rightZ = -Math.sin(elapsed * 12) * 0.18
      } else if (emote === 'dance_01') {
        const s = Math.sin(elapsed * 6)
        leftX = -0.5 + s * 0.7
        rightX = -0.5 - s * 0.7
      } else if (emote === 'dance_02') {
        leftX = -0.35 + Math.sin(elapsed * 5) * 0.5
        rightX = -0.35 + Math.cos(elapsed * 5) * 0.5
      } else if (emote === 'raise_hands') {
        leftX = -2.5
        rightX = -2.5
        leftZ = 0.3
        rightZ = -0.3
      } else if (emote === 'jump') {
        leftX = -1.7
        rightX = -1.7
      }

      leftArmRef.current.rotation.x = leftX
      rightArmRef.current.rotation.x = rightX
      leftArmRef.current.rotation.z = leftZ
      rightArmRef.current.rotation.z = rightZ
    }
  })

  return (
    <group ref={bodyRef}>
      <LegsMesh config={config} skin={skin} seated={seated} />

      {/* Everything above the hips shifts down together when seated, so the head/torso
          settle onto the now-bent legs instead of floating at standing height. */}
      <group position={[0, seated ? -0.28 : 0, 0]}>
        {/* torso */}
        <mesh position={[0, 0.73, 0]} castShadow>
          <capsuleGeometry args={[0.235, 0.33, 4, 10]} />
          <meshStandardMaterial color={config.topColor} roughness={0.75} />
        </mesh>

        {/* arms */}
        <mesh ref={leftArmRef} position={[-0.31, 0.78, 0]}>
          <capsuleGeometry args={[0.075, 0.32, 4, 8]} />
          <meshStandardMaterial color={config.topStyle === 'tshirt' ? skin : config.topColor} roughness={0.75} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.31, 0.78, 0]}>
          <capsuleGeometry args={[0.075, 0.32, 4, 8]} />
          <meshStandardMaterial color={config.topStyle === 'tshirt' ? skin : config.topColor} roughness={0.75} />
        </mesh>

        {/* head */}
        <mesh position={[0, 1.18, 0]}>
          <sphereGeometry args={[0.22, 16, 14]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>

        {/* eyes */}
        <mesh position={[-0.08, 1.2, 0.195]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshStandardMaterial color="#3a3245" />
        </mesh>
        <mesh position={[0.08, 1.2, 0.195]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshStandardMaterial color="#3a3245" />
        </mesh>

        <HairMesh config={config} />
        <AccessoryMesh config={config} />

        {config.accessory === 'backpack' ? (
          <mesh position={[0, 0.75, -0.24]}>
            <capsuleGeometry args={[0.14, 0.24, 4, 8]} />
            <meshStandardMaterial color="#8a6a4f" roughness={0.85} />
          </mesh>
        ) : null}

        {emote === 'heart' && emoteStartedAt != null ? <HeartPop startedAt={emoteStartedAt} /> : null}
      </group>
    </group>
  )
}

/** A small "🤍" that floats up and fades — the one emote that needed a visual beyond arm/body rotation. Own useFrame so it animates independent of the parent's render cycle, same as every other emote pose here. */
function HeartPop({ startedAt }: { startedAt: number }) {
  const DURATION = 1.6
  const groupRef = useRef<THREE.Group>(null)
  const divRef = useRef<HTMLDivElement>(null)

  useFrame(() => {
    const progress = Math.min(Math.max(0, (Date.now() - startedAt) / 1000) / DURATION, 1)
    if (groupRef.current) groupRef.current.position.y = 1.5 + progress * 0.6
    if (divRef.current) divRef.current.style.opacity = String(1 - progress)
  })

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      <Html center distanceFactor={9} occlude={false}>
        <div ref={divRef} className="pointer-events-none select-none text-2xl" aria-hidden>
          🤍
        </div>
      </Html>
    </group>
  )
}

/** Approximate hip height — the pivot the whole leg swings from when seated (see below). */
const HIP_Y = 0.42

/**
 * Garden V2: when `seated`, the legs swing forward from a hip-height pivot instead of
 * hanging straight down — this rig has one rigid leg segment (no separate knee joint), so
 * it's a single hinge rotation rather than a true bent-knee pose, but it reads as
 * "sitting on the seat" well enough at this character's scale/style. When NOT seated the
 * pivot group's own offset exactly cancels out (position.y = HIP_Y, each mesh's local y =
 * original_y - HIP_Y), so the standing pose is pixel-identical to before this change.
 */
function LegsMesh({ config, skin, seated }: { config: GardenAvatarConfig; skin: string; seated: boolean }) {
  if (config.bottomStyle === 'skirt') {
    // A rigid hinge rotation doesn't read as "bent" on a cone skirt — settle it a little
    // lower when seated instead of attempting a bend.
    return (
      <group position={[0, seated ? -0.06 : 0, 0]}>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.24, 0.34, 12]} />
          <meshStandardMaterial color={config.bottomColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.11, 0.2, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
      </group>
    )
  }
  const height = config.bottomStyle === 'shorts' ? 0.26 : 0.48
  const y = config.bottomStyle === 'shorts' ? 0.13 : 0.25
  return (
    <group position={[0, HIP_Y, seated ? 0.04 : 0]} rotation={[seated ? -1.42 : 0, 0, 0]}>
      <mesh position={[0, y - HIP_Y, 0]}>
        <cylinderGeometry args={[0.15, 0.17, height, 10]} />
        <meshStandardMaterial color={config.bottomColor} roughness={0.85} />
      </mesh>
      {config.bottomStyle === 'shorts' ? (
        <mesh position={[0, 0.1 - HIP_Y, 0]}>
          <cylinderGeometry args={[0.1, 0.11, 0.24, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
      ) : null}
    </group>
  )
}

function HairMesh({ config }: { config: GardenAvatarConfig }) {
  const { hairStyle, hairColor } = config
  const mat = <meshStandardMaterial color={hairColor} roughness={0.7} />

  if (hairStyle === 'short') {
    return (
      <mesh position={[0, 1.27, -0.01]} scale={[1.06, 0.62, 1.06]}>
        <sphereGeometry args={[0.225, 14, 12]} />
        {mat}
      </mesh>
    )
  }
  if (hairStyle === 'medium') {
    return (
      <group>
        <mesh position={[0, 1.27, -0.01]} scale={[1.08, 0.68, 1.08]}>
          <sphereGeometry args={[0.225, 14, 12]} />
          {mat}
        </mesh>
        <mesh position={[-0.2, 1.13, -0.03]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          {mat}
        </mesh>
        <mesh position={[0.2, 1.13, -0.03]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          {mat}
        </mesh>
      </group>
    )
  }
  if (hairStyle === 'tied') {
    return (
      <group>
        <mesh position={[0, 1.27, -0.01]} scale={[1.06, 0.62, 1.06]}>
          <sphereGeometry args={[0.225, 14, 12]} />
          {mat}
        </mesh>
        <mesh position={[0, 1.22, -0.24]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          {mat}
        </mesh>
      </group>
    )
  }
  if (hairStyle === 'wavy') {
    const bumps = [0, 1, 2, 3, 4, 5]
    return (
      <group>
        <mesh position={[0, 1.27, -0.01]} scale={[1.08, 0.66, 1.08]}>
          <sphereGeometry args={[0.225, 14, 12]} />
          {mat}
        </mesh>
        {bumps.map((i) => {
          const angle = (i / bumps.length) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.2, 1.12 + (i % 2) * 0.03, Math.sin(angle) * 0.2]}
            >
              <sphereGeometry args={[0.065, 8, 8]} />
              {mat}
            </mesh>
          )
        })}
      </group>
    )
  }
  // long
  return (
    <group>
      <mesh position={[0, 1.27, -0.01]} scale={[1.08, 0.66, 1.08]}>
        <sphereGeometry args={[0.225, 14, 12]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.98, -0.16]} rotation={[0.25, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.42, 4, 8]} />
        {mat}
      </mesh>
    </group>
  )
}

function AccessoryMesh({ config }: { config: GardenAvatarConfig }) {
  const { accessory } = config
  if (accessory === 'none') return null

  if (accessory === 'glasses') {
    return (
      <group position={[0, 1.2, 0.2]}>
        <mesh position={[-0.08, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.05, 0.012, 8, 16]} />
          <meshStandardMaterial color="#3a3245" />
        </mesh>
        <mesh position={[0.08, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.05, 0.012, 8, 16]} />
          <meshStandardMaterial color="#3a3245" />
        </mesh>
      </group>
    )
  }
  if (accessory === 'cap') {
    return (
      <group>
        <mesh position={[0, 1.3, -0.01]} scale={[1.12, 0.55, 1.12]}>
          <sphereGeometry args={[0.235, 14, 12]} />
          <meshStandardMaterial color={config.topColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.24, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.035, 16]} />
          <meshStandardMaterial color={config.topColor} roughness={0.7} />
        </mesh>
      </group>
    )
  }
  if (accessory === 'beanie') {
    return (
      <group>
        <mesh position={[0, 1.29, -0.01]} scale={[1.14, 0.72, 1.14]}>
          <sphereGeometry args={[0.235, 14, 12]} />
          <meshStandardMaterial color={config.hairColor} roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.42, -0.01]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#fdfaf4" roughness={0.9} />
        </mesh>
      </group>
    )
  }
  if (accessory === 'headphones') {
    return (
      <group>
        <mesh position={[-0.21, 1.18, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#3a3245" />
        </mesh>
        <mesh position={[0.21, 1.18, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#3a3245" />
        </mesh>
        <mesh position={[0, 1.42, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.22, 0.014, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#3a3245" />
        </mesh>
      </group>
    )
  }
  return null
}
