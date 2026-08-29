/**
 * Thin, environment-agnostic POST wrapper for the Google Apps Script Web App that backs
 * THE ECHO HUB's statistics dashboard (a Google Sheet). Works from plain Node (used by
 * scripts/exportStatsToSheets.ts, the offline admin export utility) and would work from a
 * browser too — it has no Firebase dependency of its own. Nothing in the running app
 * currently calls this: see the analytics section of the project's report for why the
 * export path is an offline admin script rather than an in-app call.
 *
 * IMPORTANT: this module only ever sends the two aggregate payload shapes below — bare
 * counters and a YYYY-MM-DD date string, nothing else. Never pass it message/journal/
 * reflection text, a codename, publicId, email, or uid.
 */

export const DEFAULT_STATS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyfA8ViSDTxvjQaK_4yKChbfhpH2SC__4czGttcwgco_0Am4HFmdJv5Ba5umXUaCaol/exec'

export interface DailyStatsPayload {
  type: 'daily'
  date: string
  dailyActiveUsers: number
  newUsers: number
  moodCheckins: number
  moodHappy: number
  moodCalm: number
  moodListen: number
  moodTired: number
  moodReadyToListen: number
  missionsCompleted: number
  gardenVisits: number
  chatSessionsStarted: number
  chatSessionsEnded: number
  safetyBlocks: number
}

export interface ActivityStatsPayload {
  type: 'activity'
  date: string
  sendSong: number
  sayItToday: number
  hearSomeone: number
  friendBond: number
  whoAmI: number
  echoJournal: number
  drawListen: number
  garden: number
}

export interface StatsExportResult {
  ok: boolean
  status?: number
  /** The raw response body, truncated — logged by the export script so a redirect/HTML
   * response (the classic Apps Script CORS/redirect gotcha, see the project report) is
   * immediately visible instead of silently swallowed. */
  rawBody?: string
  error?: string
}

interface PostOptions {
  /** Overrides DEFAULT_STATS_ENDPOINT — mainly for tests. */
  endpointOverride?: string
  /** Total attempts including the first — defaults to 3 (1 try + 2 retries). */
  attempts?: number
  /** Base backoff between retries, doubled each attempt. */
  backoffMs?: number
  /** Per-attempt abort timeout. */
  timeoutMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postOnce(endpoint: string, payload: unknown, timeoutMs: number): Promise<StatsExportResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    })
    const rawBody = (await res.text()).slice(0, 2000)
    return { ok: res.ok, status: res.status, rawBody }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Never throws — always resolves to a result the caller inspects. This is what makes a
 * Google-side outage/CORS surprise fail gracefully: the export script logs and exits
 * non-zero, but nothing in the running app is ever blocked on this (see call sites — there
 * are none in the student-facing app itself, only in the offline export script).
 */
async function postWithRetry(payload: unknown, opts: PostOptions = {}): Promise<StatsExportResult> {
  const endpoint = opts.endpointOverride ?? DEFAULT_STATS_ENDPOINT
  const attempts = opts.attempts ?? 3
  const backoffMs = opts.backoffMs ?? 1000
  const timeoutMs = opts.timeoutMs ?? 15000

  let last: StatsExportResult = { ok: false, error: 'not attempted' }
  for (let i = 0; i < attempts; i++) {
    last = await postOnce(endpoint, payload, timeoutMs)
    if (last.ok) return last
    if (i < attempts - 1) await sleep(backoffMs * 2 ** i)
  }
  return last
}

export async function sendDailyStats(payload: DailyStatsPayload, opts?: PostOptions): Promise<StatsExportResult> {
  return postWithRetry(payload, opts)
}

export async function sendActivityStats(payload: ActivityStatsPayload, opts?: PostOptions): Promise<StatsExportResult> {
  return postWithRetry(payload, opts)
}
