import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GardenAvatar } from './GardenAvatar'
import { lerpAngle } from './gardenMath'
import type { GardenControls } from './useGardenControls'
import { GARDEN_BOUND, GARDEN_OBJECTS, INTERACTION_RADIUS, OBSTACLE_MARGIN, type GardenObjectDef } from './gardenLayout'
import type { GardenAvatarConfig, GardenMember } from '../../../../features/garden/types'

interface GardenPlayerProps {
  controls: GardenControls
  avatarConfig: GardenAvatarConfig
  spawn?: [number, number]
  members?: GardenMember[]
  onNearestChange: (id: GardenObjectDef['id'] | null) => void
  onNearestPlayerChange?: (id: string | null) => void
  onLocalMove?: (x: number, y: number, z: number, rotationY: number) => void
  onFrame?: (deltaSeconds: number) => void
}

const WALK_SPEED = 3.2
const ARRIVE_DISTANCE = 0.18
const BASE_ELEVATION = 0.58
const PLAYER_INTERACTION_RADIUS = 1.6
// Frame-rate independent damping rates (see THREE.MathUtils.damp) — chosen gently on
// purpose: this is specifically to avoid the motion-sickness-inducing snaps/oscillation a
// naive per-frame lerp can produce when frame time varies (e.g. mobile).
const CAMERA_FOLLOW_LAMBDA = 3.2
const CAMERA_RECENTER_LAMBDA = 4
const CAMERA_RECENTER_EPSILON = 0.01

export function GardenPlayer({
  controls,
  avatarConfig,
  spawn,
  members,
  onNearestChange,
  onNearestPlayerChange,
  onLocalMove,
  onFrame,
}: GardenPlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const { camera } = useThree()
  const spawnPoint = useRef(spawn ?? [0, 3.5]).current
  const posRef = useRef({ x: spawnPoint[0], z: spawnPoint[1] })
  const yawRef = useRef(Math.PI)
  const nearestRef = useRef<GardenObjectDef['id'] | null>(null)
  const nearestPlayerRef = useRef<string | null>(null)
  const camPos = useRef(new THREE.Vector3(0, 4.5, 9.5))
  const camTarget = useRef(new THREE.Vector3())
  const isMovingRef = useRef(false)
  // Kept in sync every render so the 60fps useFrame loop can scan the latest roster
  // without restarting the frame-loop closure on every presence update.
  const membersRef = useRef(members ?? [])
  membersRef.current = members ?? []

  useFrame((_, rawDelta) => {
    onFrame?.(rawDelta)
    const delta = Math.min(rawDelta, 0.05)
    const joy = controls.joystickRef.current
    const keys = controls.keysRef.current

    let mx = joy.x
    let mz = joy.y
    let moving = false

    if (Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05) {
      moving = true
      controls.moveTargetRef.current = null
    } else {
      mx = 0
      mz = 0
      if (keys.has('w') || keys.has('arrowup')) mz -= 1
      if (keys.has('s') || keys.has('arrowdown')) mz += 1
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1
      if (keys.has('d') || keys.has('arrowright')) mx += 1
      if (mx !== 0 || mz !== 0) {
        moving = true
        controls.moveTargetRef.current = null
      } else {
        const target = controls.moveTargetRef.current
        if (target) {
          const dx = target[0] - posRef.current.x
          const dz = target[1] - posRef.current.z
          const dist = Math.hypot(dx, dz)
          if (dist < ARRIVE_DISTANCE) {
            controls.moveTargetRef.current = null
          } else {
            mx = dx / dist
            mz = dz / dist
            moving = true
          }
        }
      }
    }

    const len = Math.hypot(mx, mz)
    if (moving && len > 0.001) {
      mx /= len
      mz /= len
      let nextX = THREE.MathUtils.clamp(posRef.current.x + mx * WALK_SPEED * delta, -GARDEN_BOUND, GARDEN_BOUND)
      let nextZ = THREE.MathUtils.clamp(posRef.current.z + mz * WALK_SPEED * delta, -GARDEN_BOUND, GARDEN_BOUND)

      for (const obj of GARDEN_OBJECTS) {
        const radius = obj.obstacleRadius + OBSTACLE_MARGIN
        const dx = nextX - obj.position[0]
        const dz = nextZ - obj.position[1]
        const d = Math.hypot(dx, dz)
        if (d < radius && d > 0.0001) {
          nextX = obj.position[0] + (dx / d) * radius
          nextZ = obj.position[1] + (dz / d) * radius
        }
      }

      posRef.current.x = nextX
      posRef.current.z = nextZ
      const targetYaw = Math.atan2(mx, mz)
      yawRef.current = lerpAngle(yawRef.current, targetYaw, 0.18)
    }
    isMovingRef.current = moving && len > 0.001

    if (groupRef.current) {
      groupRef.current.position.set(posRef.current.x, 0, posRef.current.z)
      groupRef.current.rotation.y = yawRef.current
    }

    // Explicit, one-shot "recenter camera behind the avatar" — only ever runs while a user
    // has pressed the optional recenter button (never automatically on move/stop/turn/
    // arrive), and stops itself once the yaw is close enough so it doesn't fight a
    // subsequent drag.
    if (controls.cameraRecenterRequestRef.current) {
      controls.cameraYawRef.current = lerpAngle(controls.cameraYawRef.current, yawRef.current, 1 - Math.exp(-CAMERA_RECENTER_LAMBDA * delta))
      if (Math.abs(((yawRef.current - controls.cameraYawRef.current + Math.PI) % (Math.PI * 2)) - Math.PI) < CAMERA_RECENTER_EPSILON) {
        controls.cameraRecenterRequestRef.current = false
      }
    }

    // Spherical orbit camera: yaw/pitch/distance come ONLY from user drag, pinch, and the
    // optional recenter above — deliberately never from the avatar's own rotation or
    // movement/destination direction, so walking never spins the camera (motion-sickness
    // fix). Only the orbit CENTER (posRef, i.e. the player's position) follows movement.
    const camYaw = controls.cameraYawRef.current
    const elevation = THREE.MathUtils.clamp(BASE_ELEVATION + controls.cameraPitchRef.current, 0.22, 1.25)
    const camDist = controls.cameraDistRef.current
    const horizR = camDist * Math.cos(elevation)
    const vertR = camDist * Math.sin(elevation)
    camPos.current.set(
      posRef.current.x - Math.sin(camYaw) * horizR,
      0.9 + vertR,
      posRef.current.z - Math.cos(camYaw) * horizR,
    )
    // Gentle, delta-based position follow (never snaps, frame-rate independent) — the
    // camera's orientation itself is set directly from camYaw/elevation above, never eased,
    // so there is nothing here that can introduce unwanted rotation drift.
    const followAlpha = 1 - Math.exp(-CAMERA_FOLLOW_LAMBDA * delta)
    camera.position.lerp(camPos.current, followAlpha)
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

    // proximity → nearest real player (for the "wave / request private chat" prompt)
    if (onNearestPlayerChange) {
      let nearestPlayerId: string | null = null
      let nearestPlayerDist = PLAYER_INTERACTION_RADIUS
      for (const member of membersRef.current) {
        const dx = member.x - posRef.current.x
        const dz = member.z - posRef.current.z
        const dist = Math.hypot(dx, dz)
        if (dist < nearestPlayerDist) {
          nearestPlayerDist = dist
          nearestPlayerId = member.id
        }
      }
      if (nearestPlayerId !== nearestPlayerRef.current) {
        nearestPlayerRef.current = nearestPlayerId
        onNearestPlayerChange(nearestPlayerId)
      }
    }

    onLocalMove?.(posRef.current.x, BASE_ELEVATION, posRef.current.z, yawRef.current)
  })

  return (
    <group ref={groupRef} position={[spawnPoint[0], 0, spawnPoint[1]]}>
      <GardenAvatar avatarId={null} config={avatarConfig} showLabel={false} walkingRef={isMovingRef} />
    </group>
  )
}
