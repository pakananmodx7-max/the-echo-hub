import { useEffect, useRef, useState } from 'react'

export type GardenQualityMode = 'auto' | 'high' | 'balanced' | 'performance'
export type GardenQualityPreset = 'high' | 'balanced' | 'performance'

export interface GardenQualitySettings {
  dpr: [number, number]
  shadows: boolean
  decorationDensity: number
  antialias: boolean
}

const QUALITY_KEY = 'echoHub.demo.gardenQuality'

const PRESETS: Record<GardenQualityPreset, GardenQualitySettings> = {
  high: { dpr: [1, 2], shadows: true, decorationDensity: 1, antialias: true },
  balanced: { dpr: [1, 1.5], shadows: true, decorationDensity: 0.75, antialias: true },
  performance: { dpr: [1, 1], shadows: false, decorationDensity: 0.45, antialias: false },
}

export function qualitySettingsFor(preset: GardenQualityPreset): GardenQualitySettings {
  return PRESETS[preset]
}

/**
 * Manages the user's quality preference (persisted) plus a lightweight
 * "auto" resolution: assume 'balanced' immediately (never a blank/expensive
 * first paint), then sample real frame times for ~1.5s after the garden
 * mounts and drop to 'performance' if the device is visibly struggling.
 */
export function useGardenQuality() {
  const [mode, setModeState] = useState<GardenQualityMode>(() => {
    try {
      const raw = localStorage.getItem(QUALITY_KEY)
      if (raw === 'auto' || raw === 'high' || raw === 'balanced' || raw === 'performance') return raw
      return 'auto'
    } catch {
      return 'auto'
    }
  })
  const [autoPreset, setAutoPreset] = useState<GardenQualityPreset>('balanced')
  const sampleStart = useRef<number | null>(null)
  const frameTimes = useRef<number[]>([])

  function setMode(next: GardenQualityMode) {
    setModeState(next)
    try {
      localStorage.setItem(QUALITY_KEY, next)
    } catch {
      // ignore
    }
    if (next === 'auto') {
      sampleStart.current = null
      frameTimes.current = []
      setAutoPreset('balanced')
    }
  }

  const effectivePreset: GardenQualityPreset = mode === 'auto' ? autoPreset : mode

  function reportFrame(deltaSeconds: number) {
    if (mode !== 'auto') return
    const now = performance.now()
    if (sampleStart.current === null) sampleStart.current = now
    frameTimes.current.push(deltaSeconds)
    if (now - sampleStart.current > 1500 && frameTimes.current.length > 10) {
      const avg = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length
      const fps = 1 / avg
      setAutoPreset(fps < 40 ? 'performance' : 'balanced')
      sampleStart.current = null
      frameTimes.current = []
    }
  }

  useEffect(() => {
    if (mode !== 'auto') {
      sampleStart.current = null
      frameTimes.current = []
    }
  }, [mode])

  return {
    mode,
    setMode,
    effectivePreset,
    settings: qualitySettingsFor(effectivePreset),
    reportFrame,
  }
}
