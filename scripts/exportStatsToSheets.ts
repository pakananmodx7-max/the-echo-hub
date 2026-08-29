/**
 * Offline, developer-only utility that exports today's (or a given date's) aggregate usage
 * statistics from Firestore to the THE ECHO HUB Google Sheet, via the existing Apps Script
 * Web App. This is the ENTIRE admin/export mechanism for this phase — there is no in-app
 * "export" button and no admin role in the client app (none currently exists in this
 * project's auth model; see the project's report for why this is the safer choice than
 * inventing one). Run manually by a developer/staff member who already holds Firebase
 * project credentials — it uses the Firebase Admin SDK, which reads Firestore with full
 * trust and bypasses firestore.rules entirely, exactly like a Cloud Function would.
 *
 * Authentication — two supported paths, in this priority order:
 *
 *  1. FIREBASE_SERVICE_ACCOUNT_PATH env var pointing at a service-account key file on
 *     disk (e.g. for CI). This file is NEVER part of the repo — see .gitignore — and this
 *     script never reads VITE_* env vars, so it can never leak into the student-facing app.
 *
 *  2. Application Default Credentials (ADC) — the normal path for local development.
 *     One-time setup:
 *
 *       gcloud auth application-default login
 *       gcloud config set project the-echo-hub
 *
 *     After that, just run the export — no key file needed. If ADC isn't set up yet, this
 *     script fails fast with a short message telling you to run the command above, instead
 *     of the raw @google-cloud/firestore retry stack trace.
 *
 * The Firebase project id defaults to "the-echo-hub" — override with FIREBASE_PROJECT_ID
 * (or the standard GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT) if you ever need to point this at
 * a different project (e.g. a staging project).
 *
 * Usage:
 *   npm run export:stats -- [YYYY-MM-DD]
 *
 * With no date argument, exports "today" in Asia/Bangkok time. Safe to re-run: the Apps
 * Script endpoint upserts by date, so exporting the same date twice updates the same Sheet
 * row rather than duplicating it.
 *
 * This script NEVER sends message/journal/reflection text, moods tied to a specific
 * student, a codename, publicId, email, uid, or IP address — only the bare aggregate
 * counters already enforced by firestore.rules (see analyticsDaily / analyticsActivityDaily
 * there for exactly what can ever land in these two documents).
 */
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import {
  sendActivityStats,
  sendDailyStats,
  type ActivityStatsPayload,
  type DailyStatsPayload,
} from '../src/features/statistics/googleSheetsStatsService'

const DEFAULT_PROJECT_ID = 'the-echo-hub'

const BANGKOK_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function todayBangkok(): string {
  return BANGKOK_DATE_FORMATTER.format(new Date())
}

function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function num(data: FirebaseFirestore.DocumentData | undefined, field: string): number {
  const v = data?.[field]
  return typeof v === 'number' ? v : 0
}

function resolveProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID
}

/** Marks an error as already having a friendly message printed — main()'s catch skips its own generic dump for these. */
class FriendlyExitError extends Error {}

function printAdcHelp(projectId: string, cause: unknown): void {
  console.error('')
  console.error('✖ Could not find Google Cloud Application Default Credentials.')
  console.error('')
  console.error('  Run this once, then try the export again:')
  console.error('')
  console.error('    gcloud auth application-default login')
  console.error('')
  console.error(`  Then make sure gcloud/ADC is pointed at the right project (using an`)
  console.error(`  account that has Firestore read access on it):`)
  console.error('')
  console.error(`    gcloud config set project ${projectId}`)
  console.error('')
  console.error('  Alternative (e.g. CI): set FIREBASE_SERVICE_ACCOUNT_PATH to a service-')
  console.error('  account key file on disk instead — never commit that file to the repo.')
  console.error('')
  if (process.env.DEBUG) {
    console.error('Underlying error (DEBUG set):', cause)
  } else {
    console.error('(Set DEBUG=1 to see the underlying error.)')
  }
  console.error('')
}

/** Resolves and sanity-checks credentials/project access BEFORE any Firestore call, so a
 * missing/broken ADC setup fails in a few lines instead of surfacing as a deep
 * @google-cloud/firestore retry stack trace. */
async function initAdmin(): Promise<void> {
  if (getApps().length > 0) return
  const projectId = resolveProjectId()

  // Firestore emulator (local testing only — never used for a real export): the emulator
  // needs no real credentials at all, and checking ADC first would wrongly block this path.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId })
    return
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (serviceAccountPath) {
    if (!existsSync(serviceAccountPath)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH does not exist: ${serviceAccountPath}`)
    }
    const require = createRequire(import.meta.url)
    const serviceAccount = require(serviceAccountPath)
    initializeApp({ credential: cert(serviceAccount), projectId })
    return
  }

  // Application Default Credentials — the normal local-development path. Fetching an
  // access token here (before initializeApp) is what lets us fail fast and friendly: if
  // `gcloud auth application-default login` was never run, this throws immediately rather
  // than the first Firestore read failing deep inside the SDK's own retry logic.
  try {
    const credential = applicationDefault()
    await credential.getAccessToken()
    initializeApp({ credential, projectId })
  } catch (err) {
    printAdcHelp(projectId, err)
    throw new FriendlyExitError('Application Default Credentials not available.')
  }
}

function printFirestoreAccessHelp(projectId: string, cause: unknown): void {
  const code = (cause as { code?: number } | undefined)?.code
  console.error('')
  console.error(`✖ Could not read Firestore for project "${projectId}".`)
  console.error('')
  if (code === 7) {
    console.error('  Your credentials are valid, but that account does not have permission')
    console.error(`  to read Firestore on project "${projectId}". Ask a project owner to`)
    console.error('  grant a role with Firestore read access (e.g. "Firebase Admin" or')
    console.error('  "Cloud Datastore Viewer"), or sign in with a different account:')
    console.error('')
    console.error('    gcloud auth application-default login')
  } else if (code === 5) {
    console.error(`  Project "${projectId}" was not found, or Firestore isn't enabled on it.`)
    console.error('  Double-check the project id — set FIREBASE_PROJECT_ID to override —')
    console.error('  and that Firestore is enabled for it in the Firebase console.')
  } else {
    console.error('  Underlying error:', cause instanceof Error ? cause.message : String(cause))
  }
  console.error('')
}

async function main() {
  const dateArg = process.argv[2]
  const date = dateArg ?? todayBangkok()
  if (!isValidDateString(date)) {
    console.error(`Invalid date argument "${dateArg}" — expected YYYY-MM-DD.`)
    process.exit(1)
  }

  const projectId = resolveProjectId()
  await initAdmin()
  const db = getFirestore()

  let dailySnap: FirebaseFirestore.DocumentSnapshot
  let activitySnap: FirebaseFirestore.DocumentSnapshot
  try {
    ;[dailySnap, activitySnap] = await Promise.all([
      db.doc(`analyticsDaily/${date}`).get(),
      db.doc(`analyticsActivityDaily/${date}`).get(),
    ])
  } catch (err) {
    printFirestoreAccessHelp(projectId, err)
    throw new FriendlyExitError('Could not read Firestore.')
  }
  const dailyData = dailySnap.data()
  const activityData = activitySnap.data()

  const dailyPayload: DailyStatsPayload = {
    type: 'daily',
    date,
    dailyActiveUsers: num(dailyData, 'dailyActiveUsers'),
    newUsers: num(dailyData, 'newUsers'),
    moodCheckins: num(dailyData, 'moodCheckins'),
    moodHappy: num(dailyData, 'moodHappy'),
    moodCalm: num(dailyData, 'moodCalm'),
    moodListen: num(dailyData, 'moodListen'),
    moodTired: num(dailyData, 'moodTired'),
    moodReadyToListen: num(dailyData, 'moodReadyToListen'),
    missionsCompleted: num(dailyData, 'missionsCompleted'),
    gardenVisits: num(dailyData, 'gardenVisits'),
    chatSessionsStarted: num(dailyData, 'chatSessionsStarted'),
    chatSessionsEnded: num(dailyData, 'chatSessionsEnded'),
    safetyBlocks: num(dailyData, 'safetyBlocks'),
  }

  const activityPayload: ActivityStatsPayload = {
    type: 'activity',
    date,
    sendSong: num(activityData, 'sendSong'),
    sayItToday: num(activityData, 'sayItToday'),
    hearSomeone: num(activityData, 'hearSomeone'),
    friendBond: num(activityData, 'friendBond'),
    whoAmI: num(activityData, 'whoAmI'),
    echoJournal: num(activityData, 'echoJournal'),
    drawListen: num(activityData, 'drawListen'),
    garden: num(activityData, 'garden'),
  }

  console.log(`[export] date=${date}`)
  console.log('[export] daily payload:', JSON.stringify(dailyPayload))
  console.log('[export] activity payload:', JSON.stringify(activityPayload))

  const [dailyResult, activityResult] = await Promise.all([
    sendDailyStats(dailyPayload),
    sendActivityStats(activityPayload),
  ])

  console.log('[export] daily POST result:', JSON.stringify(dailyResult))
  console.log('[export] activity POST result:', JSON.stringify(activityResult))

  if (!dailyResult.ok || !activityResult.ok) {
    console.error('[export] one or both POSTs did not succeed — see rawBody above for the actual response (a redirect or HTML page there means the endpoint needs to be re-checked; see the project report\'s CORS/redirect note).')
    process.exit(1)
  }

  console.log('[export] done.')
}

main().catch((err) => {
  // FriendlyExitError means a short, targeted explanation was already printed above
  // (missing ADC, or a Firestore project/permission problem) — no need to also dump the
  // raw error/stack trace on top of it.
  if (err instanceof FriendlyExitError) {
    process.exit(1)
  }
  console.error('[export] failed:', err)
  process.exit(1)
})
