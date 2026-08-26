import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GardenAvatar } from './GardenAvatar'
import type { GardenControls } from './useGardenControls'
import { GARDEN_BOUND, GARDEN_OBJECTS, INTERACTION_RADIUS, type GardenObjectDef } from './gardenLayout'

interface GardenPlayerProps {
  controls: GardenControls
  avatarId: string | null
  onNearestChange: (id: GardenObjectDef['id'] | null) => void
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

export function GardenPlayer({ controls, avatarId, onNearestChange }: GardenPlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const { camera } = useThree()
  const posRef = useRef({ x: 0, z: 3.5 })
  const yawRef = useRef(Math.PI)
  const nearestRef = useRef<GardenObjectDef['id'] | null>(null)
  const camPos = useRef(new THREE.Vector3(0, 4.5, 9.5))
  const camTarget = useRef(new THREE.Vector3())

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const joy = controls.joystickRef.current
    const keys = controls.keysRef.current

    let mx = joy.x
    let mz = joy.y
    if (Math.abs(mx) < 0.05 && Math.abs(mz) < 0.05) {
      mx = 0
      mz = 0
      if (keys.has('w') || keys.has('arrowup')) mz -= 1
      if (keys.has('s') || keys.has('arrowdown')) mz += 1
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1
      if (keys.has('d') || keys.has('arrowright')) mx += 1
    }

    const len = Math.hypot(mx, mz)
    if (len > 0.001) {
      mx /= len
      mz /= len
      const speed = 3.2
      posRef.current.x = THREE.MathUtils.clamp(posRef.current.x + mx * speed * delta, -GARDEN_BOUND, GARDEN_BOUND)
      posRef.current.z = THREE.MathUtils.clamp(posRef.current.z + mz * speed * delta, -GARDEN_BOUND, GARDEN_BOUND)
      const targetYaw = Math.atan2(mx, mz)
      yawRef.current = lerpAngle(yawRef.current, targetYaw, 0.18)
    }

    if (groupRef.current) {
      groupRef.current.position.set(posRef.current.x, 0, posRef.current.z)
      groupRef.current.rotation.y = yawRef.current
    }

    // camera follows behind the player, offset by manual drag yaw
    const camYaw = yawRef.current + controls.cameraYawRef.current
    const camDist = 6.2
    const camHeight = 4.6
    camPos.current.set(
      posRef.current.x - Math.sin(camYaw) * camDist,
      camHeight,
      posRef.current.z - Math.cos(camYaw) * camDist,
    )
    camera.position.lerp(camPos.current, 0.09)
    camTarget.current.set(posRef.current.x, 0.9, posRef.current.z)
    camera.lookAt(camTarget.current)

    // proximity → nearest interactive object
    let nearestId: GardenObjectDef['id'] | null = null
    let nearestDist = INTERACTION_RADIUS
    for (const obj of GARDEN_OBJECTS) {
      const dx = obj.position[0] - posRef.current.x
      const dz = obj.position[1] - posRef.current.z
      const dist = Math.hypot(dx, dz)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestId = obj.id
      }
    }
    if (nearestId !== nearestRef.current) {
      nearestRef.current = nearestId
      onNearestChange(nearestId)
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 3.5]}>
      <GardenAvatar avatarId={avatarId} showLabel={false} />
    </group>
  )
}
