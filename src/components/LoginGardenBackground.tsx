import { useMemo, type CSSProperties } from 'react'

interface Firefly {
  top: number
  left: number
  size: number
  flyDuration: number
  glowDuration: number
  delay: number
}

interface Star {
  top: number
  left: number
  size: number
  delay: number
  duration: number
}

interface Leaf {
  left: number
  scale: number
  swayDuration: number
  delay: number
}

// Hand-placed rather than Math.random() at render time — a fixed, once-designed layout
// reads calmer and more "composed" than a reshuffled one, and never changes between
// renders/re-mounts (no need for useMemo's dependency array to matter here; kept as a
// module constant so the array itself is never recreated).
const FIREFLIES: Firefly[] = [
  { top: 62, left: 12, size: 3.5, flyDuration: 17, glowDuration: 4.2, delay: 0 },
  { top: 48, left: 22, size: 2.5, flyDuration: 21, glowDuration: 5, delay: 1.4 },
  { top: 70, left: 30, size: 3, flyDuration: 16, glowDuration: 3.8, delay: 2.8 },
  { top: 40, left: 8, size: 2, flyDuration: 19, glowDuration: 4.6, delay: 0.6 },
  { top: 78, left: 45, size: 3.5, flyDuration: 22, glowDuration: 5.4, delay: 3.6 },
  { top: 55, left: 62, size: 2.5, flyDuration: 18, glowDuration: 4, delay: 1.9 },
  { top: 35, left: 78, size: 3, flyDuration: 20, glowDuration: 4.8, delay: 0.2 },
  { top: 66, left: 85, size: 2, flyDuration: 16.5, glowDuration: 3.6, delay: 2.3 },
  { top: 82, left: 70, size: 3.5, flyDuration: 23, glowDuration: 5.2, delay: 4.1 },
  { top: 27, left: 55, size: 2.5, flyDuration: 19.5, glowDuration: 4.4, delay: 1.1 },
  { top: 74, left: 92, size: 2, flyDuration: 17.5, glowDuration: 3.9, delay: 3.2 },
]

const STARS: Star[] = [
  { top: 8, left: 15, size: 2, delay: 0, duration: 6 },
  { top: 14, left: 40, size: 1.5, delay: 1.5, duration: 7 },
  { top: 6, left: 62, size: 2, delay: 3, duration: 5.5 },
  { top: 18, left: 80, size: 1.5, delay: 0.8, duration: 6.5 },
  { top: 10, left: 90, size: 2, delay: 2.2, duration: 7.5 },
  { top: 22, left: 25, size: 1.5, delay: 4, duration: 6 },
]

const LEAVES: Leaf[] = [
  { left: 4, scale: 1, swayDuration: 6.5, delay: 0 },
  { left: 14, scale: 0.75, swayDuration: 7.2, delay: 0.6 },
  { left: 26, scale: 1.1, swayDuration: 6, delay: 1.4 },
  { left: 60, scale: 0.85, swayDuration: 7.8, delay: 0.3 },
  { left: 74, scale: 1, swayDuration: 6.8, delay: 1.1 },
  { left: 88, scale: 0.7, swayDuration: 7, delay: 1.8 },
]

/**
 * A calm, animated evening-garden scene for the Login page only — never shared with
 * AmbientBackground (used by Welcome/Register/onboarding), so this can't affect any other
 * page. Pure CSS + inline SVG (no Three.js, no video, no per-frame JS): a slow drifting
 * warm/lavender/mint glow, distant hill and tree silhouettes, a still pond with a soft
 * waterfall streak, a few echo ripples fading outward, gently swaying foreground leaves,
 * faint stars, and a small handful of glowing fireflies. Every animation is slow and
 * loops in place — no camera motion, no zoom, no parallax — and everything backs off to
 * a static scene under prefers-reduced-motion (see the .echo-bg-* rules in index.css).
 */
export function LoginGardenBackground() {
  // useMemo purely to satisfy "no impure calls during render" for consistency with the
  // rest of the codebase's conventions — these arrays are static, so this never recomputes.
  const fireflies = useMemo(() => FIREFLIES, [])
  const stars = useMemo(() => STARS, [])
  const leaves = useMemo(() => LEAVES, [])

  return (
    <div className="echo-login-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="echo-login-bg__glow absolute inset-0" />

      {stars.map((s, i) => (
        <span
          key={`star-${i}`}
          className="echo-bg-star absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Distant hills, trees, pond + waterfall — a flat, stylized silhouette, not a
          literal scene. Scales with viewport width; height pinned to the lower half. */}
      <svg
        viewBox="0 0 400 220"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[46%] w-full"
      >
        <path d="M0,150 C60,120 120,135 180,118 C240,102 300,128 400,110 L400,220 L0,220 Z" fill="#ece5ff" opacity="0.55" />
        <path d="M0,180 C70,150 140,168 210,150 C280,132 330,162 400,145 L400,220 L0,220 Z" fill="#cdeee0" opacity="0.65" />

        {/* pond + waterfall, tucked into the left third */}
        <ellipse cx="70" cy="196" rx="46" ry="11" fill="#f6f3ff" opacity="0.5" />
        <rect x="63" y="150" width="7" height="46" rx="3.5" fill="url(#echo-waterfall-fade)" />
        <rect x="74" y="158" width="5" height="38" rx="2.5" fill="url(#echo-waterfall-fade)" opacity="0.7" />
        <defs>
          <linearGradient id="echo-waterfall-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fd6b4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#f6f3ff" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* tree/bush blobs along the front hill line */}
        {[
          [140, 152, 20],
          [168, 146, 15],
          [230, 158, 24],
          [262, 150, 16],
          [320, 154, 22],
          [350, 146, 14],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 === 0 ? '#bfa6ff' : '#8fd6b4'} opacity="0.32" />
        ))}
      </svg>

      {/* Echo ripples — the app's own motif, gently expanding and fading over the pond. */}
      <div className="absolute" style={{ left: '17.5%', bottom: '9%' }}>
        {[0, 2.3, 4.6].map((delay, i) => (
          <span
            key={i}
            className="echo-bg-ripple absolute rounded-full border border-lavender-300/70"
            style={{ width: 70, height: 70, marginLeft: -35, marginTop: -35, animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      {fireflies.map((f, i) => (
        <span
          key={`firefly-${i}`}
          className="echo-bg-firefly absolute rounded-full"
          style={
            {
              top: `${f.top}%`,
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              background: '#ffe9b8',
              boxShadow: '0 0 6px 2px rgba(255, 233, 184, 0.75)',
              '--fly-duration': `${f.flyDuration}s`,
              '--glow-duration': `${f.glowDuration}s`,
              animationDelay: `${f.delay}s, ${f.delay * 0.6}s`,
            } as CSSProperties
          }
        />
      ))}

      {/* Foreground leaves — closest layer, swaying just slightly for depth. */}
      <div className="absolute inset-x-0 bottom-0 h-16">
        {leaves.map((l, i) => (
          <svg
            key={i}
            className="echo-bg-leaf absolute bottom-0"
            style={{
              left: `${l.left}%`,
              width: 34 * l.scale,
              height: 52 * l.scale,
              '--sway-duration': `${l.swayDuration}s`,
              animationDelay: `${l.delay}s`,
            } as CSSProperties}
            viewBox="0 0 34 52"
          >
            <path d="M17,52 C6,40 4,22 17,0 C30,22 28,40 17,52 Z" fill="#7bb894" opacity="0.28" />
          </svg>
        ))}
      </div>
    </div>
  )
}
