import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GardenCharacter } from '../three/GardenCharacter'
import type { GardenAvatarConfig } from '../../../../features/garden/types'

interface AvatarPreviewCanvasProps {
  config: GardenAvatarConfig
}

const MIN_DIST = 1.7
const MAX_DIST = 3.8

function PreviewRig({ config }: { config: GardenAvatarConfig }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { gl, camera } = useThree()
  const rotationRef = useRef(0.5)
  const distRef = useRef(2.6)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const lastXRef = useRef(0)
  const pinchStartRef = useRef<number | null>(null)
  const pinchStartDistValueRef = useRef(2.6)

  useEffect(() => {
    const dom = gl.domElement

    function pinchDistance() {
      const pts = Array.from(pointersRef.current.values())
      if (pts.length < 2) return null
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    }

    function onDown(e: PointerEvent) {
      dom.setPointerCapture(e.pointerId)
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointersRef.current.size === 1) {
        lastXRef.current = e.clientX
      } else {
        pinchStartRef.current = pinchDistance()
        pinchStartDistValueRef.current = distRef.current
      }
    }
    function onMove(e: PointerEvent) {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointersRef.current.size >= 2) {
        const dist = pinchDistance()
        if (dist && pinchStartRef.current) {
          const ratio = pinchStartRef.current / dist
          distRef.current = THREE.MathUtils.clamp(pinchStartDistValueRef.current * ratio, MIN_DIST, MAX_DIST)
        }
        return
      }
      const dx = e.clientX - lastXRef.current
      lastXRef.current = e.clientX
      rotationRef.current += dx * 0.012
    }
    function onUp(e: PointerEvent) {
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) pinchStartRef.current = null
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      distRef.current = THREE.MathUtils.clamp(distRef.current + e.deltaY * 0.0018, MIN_DIST, MAX_DIST)
    }

    dom.style.touchAction = 'none'
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointercancel', onUp)
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointercancel', onUp)
      dom.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y = rotationRef.current
    camera.position.set(0, 1.05, distRef.current)
    camera.lookAt(0, 1.0, 0)
  })

  return (
    <group ref={groupRef}>
      <GardenCharacter config={config} />
    </group>
  )
}

export function AvatarPreviewCanvas({ config }: AvatarPreviewCanvasProps) {
  return (
    <div className="h-64 w-full overflow-hidden rounded-3xl bg-gradient-to-b from-lavender-100 to-mint/30">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'low-power' }}>
        <ambientLight intensity={0.95} />
        <directionalLight position={[2.5, 4, 3]} intensity={0.75} />
        <hemisphereLight args={['#fdfaf4', '#cdeee0', 0.5]} />
        <PreviewRig config={config} />
      </Canvas>
    </div>
  )
}
