/** Shortest-path angle interpolation (handles the -π/π wraparound) — shared by the local player and remote avatar smoothing. */
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}
