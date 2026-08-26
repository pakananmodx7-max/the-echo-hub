import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SKIN_TONES } from '../../../../data/gardenAvatarOptions'
import type { GardenAvatarConfig } from '../../../../features/garden/types'

interface GardenCharacterProps {
  config: GardenAvatarConfig
  /** When provided, walking bob/sway plays while this ref is true — read every frame, not React state. */
  walkingRef?: { current: boolean }
}

function skinHex(tone: GardenAvatarConfig['skinTone']): string {
  return SKIN_TONES.find((t) => t.id === tone)?.hex ?? '#e8c19d'
}

export function GardenCharacter({ config, walkingRef }: GardenCharacterProps) {
  const bodyRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)
  const t0 = useRef(Math.random() * Math.PI * 2)

  const skin = skinHex(config.skinTone)

  useFrame((state) => {
    const t = state.clock.elapsedTime + t0.current
    const walking = walkingRef?.current ?? false
    if (bodyRef.current) {
      const bobSpeed = walking ? 8 : 1.6
      const bobAmount = walking ? 0.035 : 0.018
      bodyRef.current.position.y = Math.sin(t * bobSpeed) * bobAmount
      bodyRef.current.rotation.z = walking ? Math.sin(t * bobSpeed) * 0.05 : 0
    }
    if (leftArmRef.current && rightArmRef.current) {
      const swing = walking ? Math.sin(t * 8) * 0.35 : Math.sin(t * 1.6) * 0.03
      leftArmRef.current.rotation.x = swing
      rightArmRef.current.rotation.x = -swing
    }
  })

  return (
    <group ref={bodyRef}>
      <LegsMesh config={config} skin={skin} />

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
    </group>
  )
}

function LegsMesh({ config, skin }: { config: GardenAvatarConfig; skin: string }) {
  if (config.bottomStyle === 'skirt') {
    return (
      <>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.24, 0.34, 12]} />
          <meshStandardMaterial color={config.bottomColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.11, 0.2, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
      </>
    )
  }
  const height = config.bottomStyle === 'shorts' ? 0.26 : 0.48
  const y = config.bottomStyle === 'shorts' ? 0.13 : 0.25
  return (
    <>
      <mesh position={[0, y, 0]}>
        <cylinderGeometry args={[0.15, 0.17, height, 10]} />
        <meshStandardMaterial color={config.bottomColor} roughness={0.85} />
      </mesh>
      {config.bottomStyle === 'shorts' ? (
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.11, 0.24, 8]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
      ) : null}
    </>
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
