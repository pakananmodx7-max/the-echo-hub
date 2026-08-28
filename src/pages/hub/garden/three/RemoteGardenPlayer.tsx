import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GardenAvatar } from './GardenAvatar'
import { lerpAngle } from './gardenMath'
import type { GardenMember } from '../../../../features/garden/types'

interface RemoteGardenPlayerProps {
  member: GardenMember
}

// Exponential-smoothing rate (frame-rate independent via THREE.MathUtils.damp) — network
// updates only arrive a few times a second, but the avatar still glides between them
// instead of snapping, per the "smooth remote movement" requirement.
const SMOOTH_LAMBDA = 9
const WALK_THRESHOLD = 0.03

/**
 * One other real person currently in the garden. Reads the latest RTDB-reported position
 * from `member` (updated only a few times a second by useGardenPlayers) but renders a
 * continuously interpolated position every frame — never jumps between network updates.
 */
export function RemoteGardenPlayer({ member }: RemoteGardenPlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const current = useRef({ x: member.x, z: member.z, rotationY: member.rotationY })
  const walkingRef = useRef(false)
  // Kept in sync on every render (a few times/sec) and read from inside useFrame (60fps) —
  // avoids restarting the frame-loop closure on every position update.
  const targetRef = useRef({ x: member.x, z: member.z, rotationY: member.rotationY })
  targetRef.current = { x: member.x, z: member.z, rotationY: member.rotationY }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const target = targetRef.current
    const dx = target.x - current.current.x
    const dz = target.z - current.current.z
    walkingRef.current = Math.hypot(dx, dz) > WALK_THRESHOLD

    current.current.x = THREE.MathUtils.damp(current.current.x, target.x, SMOOTH_LAMBDA, delta)
    current.current.z = THREE.MathUtils.damp(current.current.z, target.z, SMOOTH_LAMBDA, delta)
    current.current.rotationY = lerpAngle(current.current.rotationY, target.rotationY, 1 - Math.exp(-SMOOTH_LAMBDA * delta))

    if (groupRef.current) {
      groupRef.current.position.set(current.current.x, 0, current.current.z)
      groupRef.current.rotation.y = current.current.rotationY
    }
  })

  return (
    <group ref={groupRef} position={[member.x, 0, member.z]}>
      <GardenAvatar
        avatarId={member.avatarId}
        config={member.avatarConfig}
        codename={member.codename}
        mood={member.mood}
        walkingRef={walkingRef}
      />
    </group>
  )
}
