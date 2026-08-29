import type { CSSProperties } from 'react'

interface HeartConfig {
  top: number
  left: number
  size: number
  color: string
  opacity: number
  duration: number
  delay: number
  tx: number
  ty: number
  rot: number
}

interface SparkleConfig {
  top: number
  left: number
  size: number
  color: string
  opacity: number
  duration: number
  delay: number
}

interface LineConfig {
  d: string
  color: string
  opacity: number
  width: number
  duration: number
  dash: string
}

interface RippleGroupConfig {
  top: number
  left: number
  color: string
}

// Hand-placed rather than Math.random() at render time — a fixed, once-composed layout
// reads calmer than a reshuffled one and never changes between renders. Kept as module
// constants (no useMemo needed: nothing here is derived or recomputed).
const HEARTS: HeartConfig[] = [
  // small
  { top: 6, left: 8, size: 14, color: '#d9cbff', opacity: 0.28, duration: 11, delay: 0, tx: 10, ty: 18, rot: 4 },
  { top: 9, left: 90, size: 16, color: '#ffd7e6', opacity: 0.3, duration: 13, delay: 1.4, tx: -12, ty: 20, rot: -4 },
  { top: 88, left: 7, size: 15, color: '#c9b8f0', opacity: 0.26, duration: 12.5, delay: 2.6, tx: 14, ty: -22, rot: 3 },
  { top: 91, left: 89, size: 13, color: 'rgba(255,255,255,0.9)', opacity: 0.35, duration: 10.5, delay: 0.8, tx: -10, ty: -18, rot: -3 },
  // medium
  { top: 22, left: 4, size: 24, color: '#ffd7e6', opacity: 0.2, duration: 15, delay: 3.4, tx: 16, ty: 24, rot: 4 },
  { top: 18, left: 94, size: 26, color: '#d9cbff', opacity: 0.22, duration: 16.5, delay: 1.9, tx: -18, ty: 26, rot: -4 },
  { top: 78, left: 93, size: 22, color: '#c9b8f0', opacity: 0.24, duration: 14, delay: 4.2, tx: 15, ty: -20, rot: 3 },
  { top: 72, left: 3, size: 25, color: 'rgba(255,255,255,0.85)', opacity: 0.3, duration: 17, delay: 2.2, tx: -14, ty: -24, rot: -4 },
  // large
  { top: 4, left: 30, size: 42, color: '#ece5ff', opacity: 0.16, duration: 18, delay: 0.5, tx: 12, ty: 20, rot: 3 },
  { top: 95, left: 68, size: 38, color: '#ffe3ec', opacity: 0.18, duration: 17.5, delay: 3.9, tx: -12, ty: -18, rot: -3 },
]

const SPARKLES: SparkleConfig[] = [
  { top: 8, left: 20, size: 3, color: '#ffffff', opacity: 0.5, duration: 5, delay: 0 },
  { top: 14, left: 78, size: 4, color: '#e8ddff', opacity: 0.45, duration: 6, delay: 1.2 },
  { top: 26, left: 10, size: 2, color: '#ffffff', opacity: 0.4, duration: 4.5, delay: 2.4 },
  { top: 30, left: 88, size: 3, color: '#ffe1ec', opacity: 0.5, duration: 5.5, delay: 0.6 },
  { top: 46, left: 6, size: 5, color: '#ffffff', opacity: 0.35, duration: 7, delay: 3.1 },
  { top: 50, left: 94, size: 3, color: '#e8ddff', opacity: 0.45, duration: 6.2, delay: 1.8 },
  { top: 64, left: 14, size: 4, color: '#ffffff', opacity: 0.4, duration: 5.8, delay: 2.9 },
  { top: 68, left: 84, size: 6, color: '#ffe1ec', opacity: 0.3, duration: 7.5, delay: 0.3 },
  { top: 80, left: 24, size: 2, color: '#ffffff', opacity: 0.5, duration: 4.8, delay: 3.6 },
  { top: 84, left: 76, size: 3, color: '#e8ddff', opacity: 0.4, duration: 6.5, delay: 1.1 },
  { top: 12, left: 50, size: 2, color: '#ffffff', opacity: 0.35, duration: 5.2, delay: 2.1 },
  { top: 90, left: 46, size: 3, color: '#ffe1ec', opacity: 0.35, duration: 6.8, delay: 0.9 },
]

const LINES: LineConfig[] = [
  { d: 'M-10,60 C 80,20 160,90 260,40 C 320,10 380,45 410,30', color: '#d9cbff', opacity: 0.35, width: 1.2, duration: 24, dash: '8 14' },
  { d: 'M-10,180 C 70,140 150,210 240,160 C 310,120 370,170 410,150', color: '#ffd7e6', opacity: 0.3, width: 1, duration: 28, dash: '6 12' },
  { d: 'M-10,520 C 90,480 170,540 260,500 C 330,470 380,510 410,495', color: '#d9cbff', opacity: 0.3, width: 1.2, duration: 22, dash: '8 14' },
  { d: 'M-10,640 C 100,610 180,660 270,630 C 340,605 380,635 410,620', color: '#c9b8f0', opacity: 0.25, width: 1, duration: 26, dash: '5 10' },
]

const RIPPLE_GROUPS: RippleGroupConfig[] = [
  { top: 14, left: 10, color: '#c9b8f0' },
  { top: 82, left: 88, color: '#ffb8d2' },
  { top: 86, left: 12, color: '#b8a6e8' },
]

const HEART_PATH =
  'M16,29 C16,29 0,18.5 0,8.9 C0,2.7 5.1,0 9.3,0 C12.7,0 15.1,2.1 16,3.9 C16.9,2.1 19.3,0 22.7,0 C26.9,0 32,2.7 32,8.9 C32,18.5 16,29 16,29 Z'

/** Layer 0 — four large blurred corner blobs on a warm-cream base. Their radial-gradient
 * falloff plus blur keeps the 40–55% center of the screen essentially white/cream. */
function GradientBlobs() {
  return (
    <>
      <div
        className="ewbg-blob ewbg-blob--a"
        style={{
          top: '-18%',
          left: '-16%',
          width: '62vw',
          height: '62vw',
          maxWidth: 520,
          maxHeight: 520,
          background: 'radial-gradient(circle, rgba(224,214,255,0.55), rgba(224,214,255,0) 70%)',
        }}
      />
      <div
        className="ewbg-blob ewbg-blob--b"
        style={{
          top: '-16%',
          right: '-18%',
          width: '58vw',
          height: '58vw',
          maxWidth: 480,
          maxHeight: 480,
          background: 'radial-gradient(circle, rgba(255,224,198,0.45), rgba(255,224,198,0) 70%)',
        }}
      />
      <div
        className="ewbg-blob ewbg-blob--c"
        style={{
          bottom: '-18%',
          left: '-16%',
          width: '58vw',
          height: '58vw',
          maxWidth: 480,
          maxHeight: 480,
          background: 'radial-gradient(circle, rgba(214,199,255,0.4), rgba(214,199,255,0) 70%)',
        }}
      />
      <div
        className="ewbg-blob ewbg-blob--d"
        style={{
          bottom: '-18%',
          right: '-16%',
          width: '62vw',
          height: '62vw',
          maxWidth: 520,
          maxHeight: 520,
          background: 'radial-gradient(circle, rgba(255,199,224,0.45), rgba(255,199,224,0) 70%)',
        }}
      />
    </>
  )
}

/** Layer 1 — a huge, near-invisible "ECHO" watermark behind the content; drifts a few
 * pixels horizontally and breathes in opacity, never darker than the real page title. */
function EchoWatermark() {
  return (
    <div
      className="ewbg-watermark absolute left-1/2 top-[42%] whitespace-nowrap bg-gradient-to-br from-lavender-300 to-pink-glow bg-clip-text font-display font-extrabold leading-none tracking-tight text-transparent"
      style={{ fontSize: 'clamp(5rem, 26vw, 20rem)' }}
    >
      ECHO
    </div>
  )
}

/** Layer 2a — a few soft curved light lines, flowing via a slow stroke-dashoffset drift. */
function FlowingLines() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 700" preserveAspectRatio="none">
      {LINES.map((line, i) => (
        <path
          key={i}
          d={line.d}
          fill="none"
          stroke={line.color}
          strokeWidth={line.width}
          strokeLinecap="round"
          opacity={line.opacity}
          className="ewbg-line"
          style={{ '--line-duration': `${line.duration}s`, strokeDasharray: line.dash } as CSSProperties}
        />
      ))}
    </svg>
  )
}

/** Layer 2b — a handful of echo-ripple locations: a soft center point with rings that
 * expand and fade outward, staggered so they read as "sound traveling," not radar. */
function EchoRipples() {
  return (
    <>
      {RIPPLE_GROUPS.map((g, i) => (
        <div key={i} className="absolute" style={{ top: `${g.top}%`, left: `${g.left}%` }}>
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 6, height: 6, background: g.color, opacity: 0.4 }}
          />
          {[0, 2.3, 4.6].map((delay, ri) => (
            <span
              key={ri}
              className="ewbg-ripple absolute"
              style={{
                width: 64,
                height: 64,
                color: g.color,
                animationDelay: `${delay}s`,
                '--ripple-duration': '8s',
              } as CSSProperties}
            />
          ))}
        </div>
      ))}
    </>
  )
}

/** Layer 2c — 10 soft hearts drifting independently near the screen edges, well clear
 * of the center content column. */
function FloatingHearts() {
  return (
    <>
      {HEARTS.map((h, i) => (
        <svg
          key={i}
          viewBox="0 0 32 29"
          className="ewbg-heart"
          style={{
            top: `${h.top}%`,
            left: `${h.left}%`,
            width: h.size,
            height: h.size,
            '--heart-opacity': h.opacity,
            '--heart-duration': `${h.duration}s`,
            '--heart-x': `${h.tx}px`,
            '--heart-y': `${h.ty}px`,
            '--heart-r': `${h.rot}deg`,
            animationDelay: `${h.delay}s, ${h.delay}s`,
          } as CSSProperties}
        >
          <path d={HEART_PATH} fill={h.color} />
        </svg>
      ))}
    </>
  )
}

/** Layer 2d — tiny glowing dots that softly pulse and drift; pure CSS, no particle lib. */
function Sparkles() {
  return (
    <>
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="ewbg-sparkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            '--sparkle-opacity': s.opacity,
            '--sparkle-duration': `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          } as CSSProperties}
        />
      ))}
    </>
  )
}

/**
 * A soft, white-centered decorative atmosphere for the Welcome/Landing page only — never
 * shared with AmbientBackground (used by Login/Register/onboarding), so this can't affect
 * any other page. Pure CSS + inline SVG (no Three.js, no canvas loop, no particle lib):
 * four blurred corner gradient blobs on a warm-cream base keep the center of the screen
 * white, a huge near-invisible "ECHO" watermark drifts gently behind the content, a few
 * flowing light-line curves and echo ripples suggest "เสียงสะท้อนกำลังเดินทาง," and a small
 * handful of floating hearts and sparkles fill the edges. Every animation is slow and
 * loops in place — no camera motion, no zoom, no parallax — and everything backs off to a
 * static (but still complete) scene under prefers-reduced-motion (see the .ewbg-* rules in
 * index.css).
 */
export function AnimatedEchoBackground() {
  return (
    <div className="ewbg-root pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <GradientBlobs />
      <EchoWatermark />
      <FlowingLines />
      <EchoRipples />
      <FloatingHearts />
      <Sparkles />
    </div>
  )
}
