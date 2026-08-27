import { useCallback, useEffect, useRef, useState } from 'react'

export type MotionSupport = 'checking' | 'unsupported' | 'needs-permission' | 'ready' | 'denied'

interface DeviceOrientationEventWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/** Degrees of deviation from the calibrated baseline needed to fire a gesture. */
const TILT_THRESHOLD_DEG = 28
/** Must return within this band of baseline before the next gesture can arm. */
const RETURN_TO_NEUTRAL_DEG = 14
/** Minimum time between fired gestures, on top of the return-to-neutral lock. */
const COOLDOWN_MS = 650

export function motionApiAvailable(): boolean {
  return typeof window !== 'undefined' && typeof DeviceOrientationEvent !== 'undefined'
}

interface UseMotionGesturesOptions {
  /** Listen and fire gestures only while true (paused during countdown, hints, timeout, etc). */
  active: boolean
  onTiltUp: () => void
  onTiltDown: () => void
}

export function useMotionGestures({ active, onTiltUp, onTiltDown }: UseMotionGesturesOptions) {
  const [support, setSupport] = useState<MotionSupport>(() => (motionApiAvailable() ? 'checking' : 'unsupported'))

  const baselineRef = useRef<number | null>(null)
  const armedRef = useRef(true)
  const lastFireRef = useRef(0)
  const activeRef = useRef(active)
  activeRef.current = active
  const onTiltUpRef = useRef(onTiltUp)
  onTiltUpRef.current = onTiltUp
  const onTiltDownRef = useRef(onTiltDown)
  onTiltDownRef.current = onTiltDown

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta === null || e.beta === undefined) return

    if (baselineRef.current === null) {
      baselineRef.current = e.beta
      return
    }
    if (!activeRef.current) return

    const delta = e.beta - baselineRef.current
    const now = Date.now()

    if (!armedRef.current) {
      if (Math.abs(delta) < RETURN_TO_NEUTRAL_DEG) armedRef.current = true
      return
    }

    if (now - lastFireRef.current < COOLDOWN_MS) return

    if (delta >= TILT_THRESHOLD_DEG) {
      armedRef.current = false
      lastFireRef.current = now
      onTiltUpRef.current()
    } else if (delta <= -TILT_THRESHOLD_DEG) {
      armedRef.current = false
      lastFireRef.current = now
      onTiltDownRef.current()
    }
  }, [])

  useEffect(() => {
    if (!motionApiAvailable()) {
      setSupport('unsupported')
      return
    }
    const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission
    setSupport(typeof ctor.requestPermission === 'function' ? 'needs-permission' : 'ready')
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!motionApiAvailable()) {
      setSupport('unsupported')
      return false
    }
    const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission
    if (typeof ctor.requestPermission !== 'function') {
      setSupport('ready')
      return true
    }
    try {
      const result = await ctor.requestPermission()
      if (result === 'granted') {
        setSupport('ready')
        return true
      }
      setSupport('denied')
      return false
    } catch {
      setSupport('denied')
      return false
    }
  }, [])

  /** Discard the current baseline so the next orientation reading recalibrates neutral. */
  const recalibrate = useCallback(() => {
    baselineRef.current = null
    armedRef.current = true
  }, [])

  useEffect(() => {
    if (support !== 'ready') return
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [support, handleOrientation])

  return { support, requestPermission, recalibrate }
}
