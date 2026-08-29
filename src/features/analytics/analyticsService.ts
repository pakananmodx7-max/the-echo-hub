import { doc, increment, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { firebaseConfigured, getFirebaseFirestore } from '../../lib/firebase'
import { getBangkokDateString } from '../../lib/thailandDate'
import type { MoodId } from '../../types'

/**
 * Privacy-safe, aggregate-only usage counters for the Google Sheets statistics dashboard —
 * see firestore.rules for exactly what each collection here allows. Firebase remains the
 * source of truth; nothing here is ever read by normal client code (every collection this
 * file writes to is `allow read: if false`) — the only reader is the offline admin export
 * script (scripts/exportStatsToSheets.ts), which uses the Firebase Admin SDK and bypasses
 * these rules entirely. NEVER add a field here that could identify a student to someone
 * reading the exported Sheet: no codename, publicId, uid, email, or message/journal/
 * reflection text — every write below is either a bare counter or a private idempotency
 * marker (uid-scoped, unread by anyone, and never exported).
 */

/** analyticsDaily/{date} field names — kept centralized so every call site agrees exactly. */
export const MOOD_CATEGORY_BY_ID: Record<MoodId, string> = {
  good: 'moodHappy',
  okay: 'moodCalm',
  'need-ear': 'moodListen',
  tired: 'moodTired',
  'ready-to-listen': 'moodReadyToListen',
}

export type ActivityStatKey =
  | 'sendSong'
  | 'sayItToday'
  | 'hearSomeone'
  | 'friendBond'
  | 'whoAmI'
  | 'echoJournal'
  | 'drawListen'
  | 'garden'

/**
 * Records this account as a Daily Active User for today's Bangkok calendar date, exactly
 * once — refreshing, opening a second tab, logging out/in the same day, or using a second
 * device all collapse to the same already-exists marker and are safe no-ops. Mirrors the
 * exact pattern rewardsService.awardDailyMission already uses (create-once marker read
 * inside the same transaction as the counter increment).
 */
export async function recordDailyActiveUser(uid: string): Promise<void> {
  if (!firebaseConfigured) return
  const db = getFirebaseFirestore()
  const dateStr = getBangkokDateString()
  const markerRef = doc(db, 'analyticsDailyUsers', dateStr, 'users', uid)
  const dailyRef = doc(db, 'analyticsDaily', dateStr)
  try {
    await runTransaction(db, async (tx) => {
      const markerSnap = await tx.get(markerRef)
      if (markerSnap.exists()) return
      tx.set(markerRef, { createdAt: serverTimestamp() })
      tx.set(dailyRef, { dailyActiveUsers: increment(1) }, { merge: true })
    })
  } catch (err) {
    console.error('[analytics] recordDailyActiveUser failed', err)
  }
}

/** Records a genuinely new account completing onboarding — once ever per uid, never on login. */
export async function recordNewUser(uid: string): Promise<void> {
  if (!firebaseConfigured) return
  const db = getFirebaseFirestore()
  const dateStr = getBangkokDateString()
  const markerRef = doc(db, 'analyticsNewUserMarkers', uid)
  const dailyRef = doc(db, 'analyticsDaily', dateStr)
  try {
    await runTransaction(db, async (tx) => {
      const markerSnap = await tx.get(markerRef)
      if (markerSnap.exists()) return
      tx.set(markerRef, { createdAt: serverTimestamp() })
      tx.set(dailyRef, { newUsers: increment(1) }, { merge: true })
    })
  } catch (err) {
    console.error('[analytics] recordNewUser failed', err)
  }
}

/**
 * Records (or re-categorizes) today's one daily mood check-in for this account.
 * First check-in of the day: moodCheckins +1 and exactly one category +1.
 * A same-day re-check-in with a DIFFERENT category: the old category -1, the new one +1,
 * moodCheckins left unchanged (still one check-in for the day, per spec).
 * Re-submitting the SAME category again: a no-op — never double-counted.
 */
export async function recordMoodCheckin(uid: string, moodId: MoodId): Promise<void> {
  if (!firebaseConfigured) return
  const category = MOOD_CATEGORY_BY_ID[moodId]
  if (!category) return
  const db = getFirebaseFirestore()
  const dateStr = getBangkokDateString()
  const markerRef = doc(db, 'analyticsMoodDaily', dateStr, 'users', uid)
  const dailyRef = doc(db, 'analyticsDaily', dateStr)
  try {
    await runTransaction(db, async (tx) => {
      const markerSnap = await tx.get(markerRef)
      if (!markerSnap.exists()) {
        tx.set(markerRef, { category, updatedAt: serverTimestamp() })
        tx.set(dailyRef, { moodCheckins: increment(1), [category]: increment(1) }, { merge: true })
        return
      }
      const prevCategory = markerSnap.data().category as string | undefined
      if (prevCategory === category) return
      tx.set(markerRef, { category, updatedAt: serverTimestamp() }, { merge: true })
      const patch: Record<string, ReturnType<typeof increment>> = { [category]: increment(1) }
      if (prevCategory) patch[prevCategory] = increment(-1)
      tx.set(dailyRef, patch, { merge: true })
    })
  } catch (err) {
    console.error('[analytics] recordMoodCheckin failed', err)
  }
}

// In-memory only, per browser tab — never written anywhere. Exists purely so a send handler
// that accidentally fires twice for the exact same blocked draft (e.g. an Enter-key handler
// and a click handler both firing) doesn't count it twice; the text itself is discarded
// immediately after computing this short key and is never persisted or transmitted.
let lastBlockDedupeKey = ''
let lastBlockAt = 0
const SAFETY_BLOCK_DEDUPE_MS = 1500

/**
 * Counts one blocked-message event — never the message text, the matched term, the
 * sender, or the recipient, only the count. `rawText` is used only to build a short-lived
 * in-memory dedupe key and is never stored or sent anywhere.
 */
export async function recordSafetyBlock(rawText: string): Promise<void> {
  if (!firebaseConfigured) return
  const key = rawText.trim().slice(0, 200)
  const now = Date.now()
  if (key === lastBlockDedupeKey && now - lastBlockAt < SAFETY_BLOCK_DEDUPE_MS) return
  lastBlockDedupeKey = key
  lastBlockAt = now
  const db = getFirebaseFirestore()
  const dateStr = getBangkokDateString()
  try {
    await setDoc(doc(db, 'analyticsDaily', dateStr), { safetyBlocks: increment(1) }, { merge: true })
  } catch (err) {
    console.error('[analytics] recordSafetyBlock failed', err)
  }
}

/** Counts one meaningful completion of an activity — see each call site for what counts as "meaningful" (never a bare page view). */
export async function recordActivity(key: ActivityStatKey): Promise<void> {
  if (!firebaseConfigured) return
  const db = getFirebaseFirestore()
  const dateStr = getBangkokDateString()
  try {
    await setDoc(doc(db, 'analyticsActivityDaily', dateStr), { [key]: increment(1) }, { merge: true })
  } catch (err) {
    console.error('[analytics] recordActivity failed', { key, message: err instanceof Error ? err.message : String(err) })
  }
}
