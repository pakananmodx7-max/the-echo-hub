import { useEffect, useMemo, useState } from 'react'

export type GardenControlMode = 'tap' | 'joystick'

const CONTROL_MODE_KEY = 'echoHub.demo.gardenControlMode'
const DEFAULT_CAMERA_DIST = 6.2

export interface GardenControls {
  keysRef: { current: Set<string> }
  joystickRef: { current: { x: number; y: number } }
  /** Absolute camera orbit yaw, driven ONLY by user drag/recenter — never by avatar rotation or movement. */
  cameraYawRef: { current: number }
  cameraPitchRef: { current: number }
  cameraDistRef: { current: number }
  /** World-space [x, z] the avatar is currently walking toward, or null. */
  moveTargetRef: { current: [number, number] | null }
  /** Set true to smoothly ease cameraYawRef toward the avatar's current facing — only ever set by an explicit "recenter camera" button press, never automatically. */
  cameraRecenterRequestRef: { current: boolean }
}

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

/**
 * Desktop keyboard (WASD/arrows) + a place for the mobile joystick,
 * tap-to-move target, and camera drag/pinch to write into. Plain refs on
 * purpose — read every render frame inside useFrame, so they must not
 * trigger React re-renders.
 */
export function useGardenControls(): GardenControls {
  const controls = useMemo<GardenControls>(
    () => ({
      keysRef: { current: new Set<string>() },
      joystickRef: { current: { x: 0, y: 0 } },
      // Matches the avatar's initial facing (see GardenPlayer's yawRef default) so the
      // very first frame frames the same view as before — every frame after that, this
      // value only ever changes from user drag or an explicit recenter request.
      cameraYawRef: { current: Math.PI },
      cameraPitchRef: { current: 0 },
      cameraDistRef: { current: DEFAULT_CAMERA_DIST },
      moveTargetRef: { current: null },
      cameraRecenterRequestRef: { current: false },
    }),
    [],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (MOVE_KEYS.has(key)) {
        controls.keysRef.current.add(key)
        controls.moveTargetRef.current = null
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      controls.keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [controls])

  return controls
}

export function useGardenControlMode(): [GardenControlMode, (mode: GardenControlMode) => void] {
  const [mode, setModeState] = useState<GardenControlMode>(() => {
    try {
      const raw = localStorage.getItem(CONTROL_MODE_KEY)
      return raw === 'joystick' ? 'joystick' : 'tap'
    } catch {
      return 'tap'
    }
  })

  function setMode(next: GardenControlMode) {
    setModeState(next)
    try {
      localStorage.setItem(CONTROL_MODE_KEY, next)
    } catch {
      // ignore
    }
  }

  return [mode, setMode]
}
