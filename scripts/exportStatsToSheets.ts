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
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json \
 *     npm run export:stats -- [YYYY-MM-DD]
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
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import {
  sendActivityStats,
  sendDailyStats,
  type ActivityStatsPayload,
  type DailyStatsPayload,
} from '../src/features/statistics/googleSheetsStatsService'

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

function initAdmin() {
  if (getApps().length > 0) return
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (serviceAccountPath) {
    if (!existsSync(serviceAccountPath)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH does not exist: ${serviceAccountPath}`)
    }
    const require = createRequire(import.meta.url)
    const serviceAccount = require(serviceAccountPath)
    initializeApp({ credential: cert(serviceAccount) })
    return
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS / any other Application Default
  // Credentials source already configured in the environment.
  initializeApp()
}

async function main() {
  const dateArg = process.argv[2]
  const date = dateArg ?? todayBangkok()
  if (!isValidDateString(date)) {
    console.error(`Invalid date argument "${dateArg}" — expected YYYY-MM-DD.`)
    process.exit(1)
  }

  initAdmin()
  const db = getFirestore()

  const [dailySnap, activitySnap] = await Promise.all([
    db.doc(`analyticsDaily/${date}`).get(),
    db.doc(`analyticsActivityDaily/${date}`).get(),
  ])
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
  console.error('[export] failed:', err)
  process.exit(1)
})
