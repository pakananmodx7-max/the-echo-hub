import { useRef, useState } from 'react'
import type { GardenControls } from './three/useGardenControls'

interface GardenJoystickProps {
  controls: GardenControls
}

const TRACK_RADIUS = 44

export function GardenJoystick({ controls }: GardenJoystickProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const activePointerId = useRef<number | null>(null)

  function updateFromEvent(clientX: number, clientY: number) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    let dx = clientX - centerX
    let dy = clientY - centerY
    const dist = Math.hypot(dx, dy)
    if (dist > TRACK_RADIUS) {
      dx = (dx / dist) * TRACK_RADIUS
      dy = (dy / dist) * TRACK_RADIUS
    }
    setKnob({ x: dx, y: dy })
    controls.joystickRef.current = { x: dx / TRACK_RADIUS, y: dy / TRACK_RADIUS }
    controls.moveTargetRef.current = null
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointerId.current = e.pointerId
    updateFromEvent(e.clientX, e.clientY)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return
    updateFromEvent(e.clientX, e.clientY)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return
    activePointerId.current = null
    setKnob({ x: 0, y: 0 })
    controls.joystickRef.current = { x: 0, y: 0 }
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative h-[88px] w-[88px] touch-none rounded-full bg-white/40 backdrop-blur-sm"
      aria-label="ควบคุมการเดิน"
      role="slider"
      aria-valuenow={0}
    >
      <div
        className="absolute left-1/2 top-1/2 h-10 w-10 rounded-full bg-white/90 shadow-md"
        style={{ transform: `translate(-50%, -50%) translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
