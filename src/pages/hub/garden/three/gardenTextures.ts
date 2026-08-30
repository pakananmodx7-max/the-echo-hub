import * as THREE from 'three'

let grassTexture: THREE.CanvasTexture | null = null
let grassNormalTexture: THREE.CanvasTexture | null = null
let pathTexture: THREE.CanvasTexture | null = null
let pathNormalTexture: THREE.CanvasTexture | null = null
let waterfallTexture: THREE.CanvasTexture | null = null
let woodTexture: THREE.CanvasTexture | null = null
let skyGradientTexture: THREE.CanvasTexture | null = null
let poolGradientTexture: THREE.CanvasTexture | null = null

/**
 * A cheap "fake normal map" — not a real height-derived normal map (that would need a
 * heightfield pass), just small random-tinted RGB blobs centered on the flat-normal color
 * (128,128,255). Read at a low `normalScale` this reads as fine surface roughness/grain
 * without any extra geometry or a real bump-to-normal conversion — same canvas-texture-
 * per-session-singleton approach as every other texture in this file, so it costs nothing
 * beyond one more small cached image.
 */
function createFakeNormalTexture(size: number, grain: number, strength: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < grain; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const nx = 128 + (Math.random() - 0.5) * 255 * strength
    const ny = 128 + (Math.random() - 0.5) * 255 * strength
    ctx.fillStyle = `rgb(${nx | 0},${ny | 0},255)`
    ctx.beginPath()
    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/** Small procedural canvas textures — no external asset downloads, cached once per session. */
export function createGrassTexture(): THREE.CanvasTexture {
  if (grassTexture) return grassTexture
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  // Base wash blends two green tones instead of one flat fill, so even the "empty" parts
  // of the tile read as slightly uneven turf rather than a single flat color.
  const base = ctx.createLinearGradient(0, 0, size, size)
  base.addColorStop(0, '#84b876')
  base.addColorStop(1, '#93c583')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  // Three passes of speckling at different tones/sizes reads as real color variation in
  // the turf (dry patches, denser clumps) rather than one uniform speckle density.
  const speckleColors = [
    'rgba(108,150,86,0.45)',
    'rgba(176,205,148,0.4)',
    'rgba(140,178,110,0.35)',
    'rgba(200,214,150,0.3)',
  ]
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.fillStyle = speckleColors[(Math.random() * speckleColors.length) | 0]
    ctx.beginPath()
    ctx.arc(x, y, 1 + Math.random() * 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // A handful of tiny darker "blade cluster" strokes for a bit of texture at close range.
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.strokeStyle = 'rgba(74,110,58,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (Math.random() - 0.5) * 5, y - 3 - Math.random() * 4)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(14, 14)
  texture.colorSpace = THREE.SRGBColorSpace
  grassTexture = texture
  return texture
}

/** Companion normal map for createGrassTexture — same repeat count, applied at a low normalScale. */
export function createGrassNormalTexture(): THREE.CanvasTexture {
  if (grassNormalTexture) return grassNormalTexture
  const texture = createFakeNormalTexture(256, 900, 0.55)
  texture.repeat.set(14, 14)
  grassNormalTexture = texture
  return texture
}

export function createPathTexture(): THREE.CanvasTexture {
  if (pathTexture) return pathTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e2d0a9'
  ctx.fillRect(0, 0, size, size)
  // Loose paving-stone grid: soft grout lines plus per-stone tint variation, so the path
  // reads as compact garden stone/paving rather than a plain dirt fill.
  const cols = 6
  const rows = 6
  const cellW = size / cols
  const cellH = size / rows
  const stoneShades = ['#e9d9b4', '#ddc79c', '#e2d0a9', '#d4bd8f']
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = (Math.random() - 0.5) * cellW * 0.15
      const jitterY = (Math.random() - 0.5) * cellH * 0.15
      const x = c * cellW + jitterX
      const y = r * cellH + jitterY
      const w = cellW * (0.86 + Math.random() * 0.1)
      const h = cellH * (0.86 + Math.random() * 0.1)
      ctx.fillStyle = stoneShades[(Math.random() * stoneShades.length) | 0]
      ctx.fillRect(x, y, w, h)
    }
  }
  ctx.strokeStyle = 'rgba(150,128,88,0.35)'
  ctx.lineWidth = 2
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * cellH)
    ctx.lineTo(size, r * cellH)
    ctx.stroke()
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath()
    ctx.moveTo(c * cellW, 0)
    ctx.lineTo(c * cellW, size)
    ctx.stroke()
  }
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(196,171,124,0.4)' : 'rgba(238,224,192,0.4)'
    ctx.beginPath()
    ctx.arc(x, y, 1 + Math.random() * 1.6, 0, Math.PI * 2)
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

/** Companion normal map for createPathTexture — emphasizes the grout-line grid a little more than the grass one does. */
export function createPathNormalTexture(): THREE.CanvasTexture {
  if (pathNormalTexture) return pathNormalTexture
  const texture = createFakeNormalTexture(128, 200, 0.4)
  pathNormalTexture = texture
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

/** Grain-streaked wood tone for furniture/stage tops — replaces the old flat wood color. */
export function createWoodTexture(): THREE.CanvasTexture {
  if (woodTexture) return woodTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#c98a5f'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 40; i++) {
    const y = (i / 40) * size + (Math.random() - 0.5) * 6
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(138,90,60,0.28)' : 'rgba(224,168,120,0.25)'
    ctx.lineWidth = 1 + Math.random() * 1.8
    ctx.beginPath()
    ctx.moveTo(0, y)
    let x = 0
    while (x < size) {
      x += 14 + Math.random() * 10
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 4)
    }
    ctx.stroke()
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.fillStyle = 'rgba(120,78,50,0.18)'
    ctx.beginPath()
    ctx.ellipse(x, y, 3 + Math.random() * 3, 1.5 + Math.random(), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  texture.colorSpace = THREE.SRGBColorSpace
  woodTexture = texture
  return texture
}

/**
 * A vertical warm-horizon-to-cool-zenith gradient, mapped onto a large inverted sphere
 * (see GardenSky.tsx) — the cheapest possible "evening gradient sky": one small texture,
 * one extra unlit draw call, no volumetric/atmospheric shader work.
 */
export function createSkyGradientTexture(): THREE.CanvasTexture {
  if (skyGradientTexture) return skyGradientTexture
  const w = 8
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, '#5a5290')
  gradient.addColorStop(0.35, '#8b7bb8')
  gradient.addColorStop(0.62, '#e8a98f')
  gradient.addColorStop(0.78, '#fbd9a8')
  gradient.addColorStop(1, '#fdf3df')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  skyGradientTexture = texture
  return texture
}

/** A soft radial gradient (light center → deep edge) for the waterfall pool — the "gentle
 * color gradient" the spec asks for, cheaper than a real depth-based shader. */
export function createPoolGradientTexture(): THREE.CanvasTexture {
  if (poolGradientTexture) return poolGradientTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, '#c9edf0')
  gradient.addColorStop(0.55, '#9fd8de')
  gradient.addColorStop(1, '#5f9ba8')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  poolGradientTexture = texture
  return texture
}
