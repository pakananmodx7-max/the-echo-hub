import * as THREE from 'three'

let grassTexture: THREE.CanvasTexture | null = null
let pathTexture: THREE.CanvasTexture | null = null
let waterfallTexture: THREE.CanvasTexture | null = null

/** Small procedural canvas textures — no external asset downloads, cached once per session. */
export function createGrassTexture(): THREE.CanvasTexture {
  if (grassTexture) return grassTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#8fbf7a'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(118,163,95,0.45)' : 'rgba(176,205,148,0.4)'
    ctx.beginPath()
    ctx.arc(x, y, 1 + Math.random() * 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(9, 9)
  texture.colorSpace = THREE.SRGBColorSpace
  grassTexture = texture
  return texture
}

export function createPathTexture(): THREE.CanvasTexture {
  if (pathTexture) return pathTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e6d6b3'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(196,171,124,0.5)' : 'rgba(238,224,192,0.5)'
    ctx.beginPath()
    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 13)
  texture.colorSpace = THREE.SRGBColorSpace
  pathTexture = texture
  return texture
}

/**
 * Vertical streaks in soft blue/white — animated by scrolling `texture.offset.y` each
 * frame (see Waterfall.tsx). Deliberately no shader/fluid-sim work: a scrolling canvas
 * texture is the cheapest possible "moving water" that still reads as alive on mobile.
 */
export function createWaterfallTexture(): THREE.CanvasTexture {
  if (waterfallTexture) return waterfallTexture
  const w = 64
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, 'rgba(223,244,247,0.95)')
  gradient.addColorStop(1, 'rgba(150,206,219,0.85)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const streakH = 10 + Math.random() * 22
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(210,238,242,0.4)'
    ctx.fillRect(x, y, 1.5 + Math.random(), streakH)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 3)
  texture.colorSpace = THREE.SRGBColorSpace
  waterfallTexture = texture
  return texture
}
