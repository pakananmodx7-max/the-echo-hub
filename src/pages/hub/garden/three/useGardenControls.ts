import { useEffect, useMemo } from 'react'

export interface GardenControls {
  keysRef: { current: Set<string> }
  joystickRef: { current: { x: number; y: number } }
  cameraYawRef: { current: number }
}

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

/**
 * Desktop keyboard (WASD/arrows) + a place for the mobile joystick and
 * camera-drag yaw to write into. Plain refs on purpose — read every render
 * frame inside useFrame, so they must not trigger React re-renders.
 */
export function useGardenControls(): GardenControls {
  const controls = useMemo<GardenControls>(
    () => ({
      keysRef: { current: new Set<string>() },
      joystickRef: { current: { x: 0, y: 0 } },
      cameraYawRef: { current: 0 },
    }),
    [],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (MOVE_KEYS.has(key)) {
        controls.keysRef.current.add(key)
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
