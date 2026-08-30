import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GardenControls } from './useGardenControls'
import { GARDEN_BOUND } from './gardenLayout'

interface TapToMoveControllerProps {
  controls: GardenControls
}

const DRAG_THRESHOLD_PX = 8
const MIN_CAMERA_DIST = 4
// Garden V2: nudged up from 10 so the bigger map (GARDEN_BOUND 16) can still be seen
// zoomed all the way out — a numeric zoom-range tweak only, no change to the camera's
// rotation/follow behavior itself (see the camera-preservation notes throughout this file).
const MAX_CAMERA_DIST = 13

/**
 * Owns every pointer gesture on the garden canvas: single-finger drag
 * rotates/tilts the camera, pinch (or mouse wheel) zooms, and a quick tap/click raycasts
 * onto the ground plane to set a tap-to-move target. Lives inside the R3F
 * <Canvas> (via useThree) so it has direct access to the camera for
 * raycasting, and attaches native listeners to the real canvas DOM element
 * so touch and mouse both work identically.
 */
export function TapToMoveController({ controls }: TapToMoveControllerProps) {
  const { camera, gl } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])

  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const lastSingleRef = useRef({ x: 0, y: 0 })
  const startRef = useRef({ x: 0, y: 0 })
  const draggedRef = useRef(false)
  const multiTouchRef = useRef(false)
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartCamDistRef = useRef(controls.cameraDistRef.current)

  useEffect(() => {
    const dom = gl.domElement

    function toNDC(clientX: number, clientY: number) {
      const rect = dom.getBoundingClientRect()
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
    }

    function pinchDistance() {
      const pts = Array.from(pointersRef.current.values())
      if (pts.length < 2) return null
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    }

    function onPointerDown(e: PointerEvent) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointersRef.current.size === 1) {
        startRef.current = { x: e.clientX, y: e.clientY }
        lastSingleRef.current = { x: e.clientX, y: e.clientY }
        draggedRef.current = false
        multiTouchRef.current = false
      } else {
        multiTouchRef.current = true
        pinchStartDistRef.current = pinchDistance()
        pinchStartCamDistRef.current = controls.cameraDistRef.current
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointersRef.current.size >= 2) {
        const dist = pinchDistance()
        if (dist && pinchStartDistRef.current) {
          const ratio = pinchStartDistRef.current / dist
          controls.cameraDistRef.current = THREE.MathUtils.clamp(
            pinchStartCamDistRef.current * ratio,
            MIN_CAMERA_DIST,
            MAX_CAMERA_DIST,
          )
        }
        return
      }

      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y
      if (!draggedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        draggedRef.current = true
      }
      if (draggedRef.current) {
        const stepX = e.clientX - lastSingleRef.current.x
        const stepY = e.clientY - lastSingleRef.current.y
        controls.cameraYawRef.current -= stepX * 0.007
        controls.cameraPitchRef.current = THREE.MathUtils.clamp(
          controls.cameraPitchRef.current - stepY * 0.005,
          -0.35,
          0.55,
        )
      }
      lastSingleRef.current = { x: e.clientX, y: e.clientY }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      controls.cameraDistRef.current = THREE.MathUtils.clamp(
        controls.cameraDistRef.current + e.deltaY * 0.0035,
        MIN_CAMERA_DIST,
        MAX_CAMERA_DIST,
      )
    }

    function onPointerUp(e: PointerEvent) {
      const wasSingle = pointersRef.current.size === 1
      pointersRef.current.delete(e.pointerId)

      if (pointersRef.current.size === 0) {
        pinchStartDistRef.current = null
      }

      if (!wasSingle || multiTouchRef.current || draggedRef.current) {
        return
      }

      // Garden V2 req. #14/#24: sitting ignores tap-to-move entirely — the player must
      // stand up first. Drag-to-rotate above this check still works while seated (the
      // camera is never frozen, only movement).
      if (controls.sittingSeatIdRef.current) return

      // Quick tap/click with no drag: raycast onto the garden ground plane.
      const ndc = toNDC(e.clientX, e.clientY)
      raycaster.setFromCamera(ndc, camera)
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        const x = THREE.MathUtils.clamp(hit.x, -GARDEN_BOUND, GARDEN_BOUND)
        const z = THREE.MathUtils.clamp(hit.z, -GARDEN_BOUND, GARDEN_BOUND)
        controls.moveTargetRef.current = [x, z]
      }
    }

    dom.style.touchAction = 'none'
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
      dom.removeEventListener('wheel', onWheel)
    }
  }, [camera, gl, controls, raycaster, groundPlane])

  return null
}
