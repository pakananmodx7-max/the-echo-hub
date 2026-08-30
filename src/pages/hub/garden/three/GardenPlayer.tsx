import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GardenAvatar } from './GardenAvatar'
import { lerpAngle } from './gardenMath'
import type { GardenControls } from './useGardenControls'
import {
  DANCE_FLOOR_POSITION,
  DANCE_FLOOR_RADIUS,
  GARDEN_BOUND,
  GARDEN_DECOR_OBSTACLES,
  GARDEN_OBJECTS,
  INTERACTION_RADIUS,
  OBSTACLE_MARGIN,
  SEAT_INTERACTION_RADIUS,
  SEATS,
  SEATS_BY_ID,
  type GardenObjectDef,
} from './gardenLayout'
import type { GardenAvatarConfig, GardenMember } from '../../../../features/garden/types'
import type { GardenEmoteId } from '../../../../data/gardenEmotes'

interface GardenPlayerProps {
  controls: GardenControls
  avatarConfig: GardenAvatarConfig
  spawn?: [number, number]
  members?: GardenMember[]
  /** seatId -> occupant publicId, for every currently-claimed seat (see useGardenSeats) — used to filter the nearest-seat scan down to seats that are actually free. */
  seatOccupancy?: Record<string, string>
  /** The seat id EchoGardenPage's React state says the local player currently occupies,
   * or null — the actual source of truth. Synced into controls.sittingSeatIdRef (a plain
   * ref, read every frame by this component's own useFrame and by TapToMoveController's
   * native pointer handlers) via an effect below; also used directly here for the
   * avatar's `seated` prop, since a ref read at render time would go stale — GardenPlayer
   * only re-renders when a normal prop changes, not when a ref mutates. */
  sittingSeatId?: string | null
  /** The local player's own current emote, so their own avatar plays it too (not just remote viewers). */
  emote?: GardenEmoteId | null
  emoteStartedAt?: number | null
  onNearestChange: (id: GardenObjectDef['id'] | null) => void
  onNearestPlayerChange?: (id: string | null) => void
  /** Nearest currently-unoccupied seat within range, or null — drives the "🪑 นั่ง" HUD prompt. */
  onNearestSeatChange?: (seatId: string | null) => void
  /** Whether the player is standing inside the dance-floor proximity zone — drives the "💃 เต้น" HUD prompt. */
  onDanceZoneChange?: (inZone: boolean) => void
  /** Fires once, edge-triggered, the instant real movement starts (tap/keyboard/joystick) — EchoGardenPage uses this to cancel a standing emote per spec #24, never fires while seated (sitting ignores movement input entirely). */
  onMovementStart?: () => void
  onLocalMove?: (x: number, y: number, z: number, rotationY: number) => void
  onFrame?: (deltaSeconds: number) => void
}

const WALK_SPEED = 3.2
const ARRIVE_DISTANCE = 0.18
const BASE_ELEVATION = 0.58
const PLAYER_INTERACTION_RADIUS = 1.6
const SIT_TURN_RATE = 0.35
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
  onFrame,
}: GardenPlayerProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const { camera } = useThree()
  const spawnPoint = useRef(spawn ?? [0, 3.5]).current
  const posRef = useRef({ x: spawnPoint[0], z: spawnPoint[1] })
  const yawRef = useRef(Math.PI)
  const nearestRef = useRef<GardenObjectDef['id'] | null>(null)
  const nearestPlayerRef = useRef<string | null>(null)
  const nearestSeatRef = useRef<string | null>(null)
  const inDanceZoneRef = useRef(false)
  const camPos = useRef(new THREE.Vector3(0, 4.5, 9.5))
  const camTarget = useRef(new THREE.Vector3())
  const isMovingRef = useRef(false)
  // Kept in sync every render so the 60fps useFrame loop can scan the latest roster
  // without restarting the frame-loop closure on every presence update.
  const membersRef = useRef(members ?? [])
  membersRef.current = members ?? []
  const seatOccupancyRef = useRef(seatOccupancy ?? {})
  seatOccupancyRef.current = seatOccupancy ?? {}

  // The single place sittingSeatId (real React state, owned by EchoGardenPage) is pushed
  // into the shared plain ref every other seat-aware piece of code reads per-frame/per-
  // event (this component's own useFrame below, and TapToMoveController's native pointer
  // handlers, which only receive `controls` — never this component's props).
  useEffect(() => {
    controls.sittingSeatIdRef.current = sittingSeatId ?? null
  }, [controls, sittingSeatId])

  useFrame((_, rawDelta) => {
    onFrame?.(rawDelta)
    const delta = Math.min(rawDelta, 0.05)
    const sittingSeatId = controls.sittingSeatIdRef.current

    let moving = false

    if (sittingSeatId) {
      // Garden V2 req. #14/#25/#36: seated players ignore ALL movement input (joystick,
      // keyboard, tap-to-move already refuses to set a target — see
      // TapToMoveController.tsx) and never write a position update. The avatar is pinned
      // to the seat's own fixed anchor, eased into place the first couple of frames after
      // sitting down rather than snapping instantly.
      const seat = SEATS_BY_ID[sittingSeatId]
      if (seat) {
        posRef.current.x = THREE.MathUtils.lerp(posRef.current.x, seat.position[0], 0.4)
        posRef.current.z = THREE.MathUtils.lerp(posRef.current.z, seat.position[1], 0.4)
        yawRef.current = lerpAngle(yawRef.current, seat.rotation, SIT_TURN_RATE)
      }
      isMovingRef.current = false
      if (nearestSeatRef.current !== null) {
        nearestSeatRef.current = null
        onNearestSeatChange?.(null)
      }
      if (inDanceZoneRef.current) {
        inDanceZoneRef.current = false
        onDanceZoneChange?.(false)
      }
    } else {
      const joy = controls.joystickRef.current
      const keys = controls.keysRef.current

      let mx = joy.x
      let mz = joy.y

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
      const willMove = moving && len > 0.001
      if (willMove && !isMovingRef.current) onMovementStart?.()
      if (willMove) {
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

        // Map Improvement phase: the waterfall cliff, pool, tables, pavilion posts, flower
        // arch, quiet-zone benches, and (Garden V2) the stage/speakers are non-interactive
        // but still solid — same push-out logic as the interactive GARDEN_OBJECTS above.
        for (const obstacle of GARDEN_DECOR_OBSTACLES) {
          const radius = obstacle.radius + OBSTACLE_MARGIN
          const dx = nextX - obstacle.position[0]
          const dz = nextZ - obstacle.position[1]
          const d = Math.hypot(dx, dz)
          if (d < radius && d > 0.0001) {
            nextX = obstacle.position[0] + (dx / d) * radius
            nextZ = obstacle.position[1] + (dz / d) * radius
          }
        }

        posRef.current.x = nextX
        posRef.current.z = nextZ
        const targetYaw = Math.atan2(mx, mz)
        yawRef.current = lerpAngle(yawRef.current, targetYaw, 0.18)
      }
      isMovingRef.current = willMove

      // proximity → nearest unoccupied seat (Garden V2)
      if (onNearestSeatChange) {
        let nearestSeatId: string | null = null
        let nearestSeatDist = SEAT_INTERACTION_RADIUS
        const occupancy = seatOccupancyRef.current
        for (const seat of SEATS) {
          if (occupancy[seat.id]) continue
          const dx = seat.position[0] - posRef.current.x
          const dz = seat.position[1] - posRef.current.z
          const dist = Math.hypot(dx, dz)
          if (dist < nearestSeatDist) {
            nearestSeatDist = dist
            nearestSeatId = seat.id
          }
        }
        if (nearestSeatId !== nearestSeatRef.current) {
          nearestSeatRef.current = nearestSeatId
          onNearestSeatChange(nearestSeatId)
        }
      }

      // proximity → dance floor zone (Garden V2)
      if (onDanceZoneChange) {
        const dx = DANCE_FLOOR_POSITION[0] - posRef.current.x
        const dz = DANCE_FLOOR_POSITION[1] - posRef.current.z
        const inZone = Math.hypot(dx, dz) < DANCE_FLOOR_RADIUS
        if (inZone !== inDanceZoneRef.current) {
          inDanceZoneRef.current = inZone
          onDanceZoneChange(inZone)
        }
      }
    }

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

    // Garden V2 req. #36: never write a position update while seated — the seat's own
    // fixed anchor is what every other client renders (see SEATS_BY_ID/RemoteGardenPlayer),
    // so there is nothing useful to sync here, and the room ends up quietly frozen at
    // wherever the player happened to be standing when they sat down.
    if (!sittingSeatId) onLocalMove?.(posRef.current.x, BASE_ELEVATION, posRef.current.z, yawRef.current)
  })

  return (
    <group ref={groupRef} position={[spawnPoint[0], 0, spawnPoint[1]]}>
      <GardenAvatar
        avatarId={null}
        config={avatarConfig}
        showLabel={false}
        walkingRef={isMovingRef}
        seated={!!sittingSeatId}
        emote={emote}
        emoteStartedAt={emoteStartedAt}
      />
    </group>
  )
}
