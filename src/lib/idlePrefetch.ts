/**
 * True when the connection looks slow or constrained (data saver on, or 2G/3G-class) —
 * prefetching a route's code in the background isn't worth the bandwidth there, matching
 * "never prefetch on a slow/mobile connection" for the same reason Garden itself is never
 * eagerly prefetched.
 */
function isSlowConnection(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  const conn = nav.connection
  if (!conn) return false
  if (conn.saveData) return true
  return conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g'
}

/**
 * Runs `fn` once the browser is idle (falling back to a short delay on browsers without
 * requestIdleCallback, e.g. Safari), skipped entirely on a slow/data-saver connection.
 * Returns a cleanup that cancels the pending call if the component unmounts first.
 */
export function prefetchWhenIdle(fn: () => void): () => void {
  if (isSlowConnection()) return () => {}

  const w = window as typeof window & {
    requestIdleCallback?: (callback: () => void) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn)
    return () => w.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(fn, 1500)
  return () => window.clearTimeout(id)
}
