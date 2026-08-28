import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { firebaseConfigured, getFirebaseFirestore } from '../../lib/firebase'
import { getPreviousDateString } from '../../lib/thailandDate'
import { REWARD_POINTS, type MissionId } from './missionCatalog'

export interface DailyProgress {
  date: string
  checkinCompleted: boolean
  missionsCompleted: MissionId[]
  pointsEarned: number
}

function emptyProgress(date: string): DailyProgress {
  return { date, checkinCompleted: false, missionsCompleted: [], pointsEarned: 0 }
}

function toDailyProgress(date: string, data: DocumentData | undefined): DailyProgress {
  if (!data) return emptyProgress(date)
  return {
    date,
    checkinCompleted: !!data.checkinCompleted,
    missionsCompleted: Array.isArray(data.missionsCompleted) ? (data.missionsCompleted as MissionId[]) : [],
    pointsEarned: typeof data.pointsEarned === 'number' ? data.pointsEarned : 0,
  }
}

/**
 * Awards one daily mission's points, exactly once per account/date/mission-type — the
 * REAL guarantee against duplicate/farmed rewards. `users/{uid}/rewards/{type}_{date}` is
 * an immutable, create-once document: Firestore itself refuses a second `create` at the
 * same id, so a refresh, a second tab, or a second device racing this same call all
 * collapse to "already awarded" with no duplicate effect — see firestore.rules for the
 * matching server-side validation (this client check alone is not the security boundary).
 *
 * Returns true if this call actually granted the reward, false if it was already granted
 * (a normal, expected, non-error outcome — never throw for "already done today").
 */
export async function awardDailyMission(uid: string, type: MissionId, dateStr: string): Promise<boolean> {
  if (!firebaseConfigured) return false
  const db = getFirebaseFirestore()
  const points = REWARD_POINTS[type]
  const rewardRef = doc(db, 'users', uid, 'rewards', `${type}_${dateStr}`)
  const userRef = doc(db, 'users', uid)
  const progressRef = doc(db, 'users', uid, 'dailyProgress', dateStr)

  try {
    return await runTransaction(db, async (tx) => {
      const rewardSnap = await tx.get(rewardRef)
      if (rewardSnap.exists()) return false

      const userSnap = await tx.get(userRef)
      const userData = userSnap.data() ?? {}
      const progressSnap = await tx.get(progressRef)
      const progressData = progressSnap.data() ?? {}

      const newTotal = (typeof userData.totalPoints === 'number' ? userData.totalPoints : 0) + points

      const userPatch: DocumentData = { totalPoints: newTotal }
      if (type === 'checkin') {
        const priorLastCheckin = typeof userData.lastCheckinDate === 'string' ? userData.lastCheckinDate : null
        const priorStreak = typeof userData.currentStreak === 'number' ? userData.currentStreak : 0
        const priorBest = typeof userData.bestStreak === 'number' ? userData.bestStreak : 0
        // A streak continues only if yesterday (Bangkok-local) was also checked in —
        // otherwise this check-in starts a fresh one at 1, worded supportively in the UI
        // rather than as a "you lost your streak" failure (see Me tab copy).
        const continuesStreak = priorLastCheckin === getPreviousDateString(dateStr)
        const currentStreak = continuesStreak ? priorStreak + 1 : 1
        userPatch.currentStreak = currentStreak
        userPatch.bestStreak = Math.max(priorBest, currentStreak)
        userPatch.lastCheckinDate = dateStr
      }

      const priorMissions: MissionId[] = Array.isArray(progressData.missionsCompleted)
        ? (progressData.missionsCompleted as MissionId[])
        : []
      const nextMissions = priorMissions.includes(type) ? priorMissions : [...priorMissions, type]

      tx.set(rewardRef, { type, points, date: dateStr, awardedAt: serverTimestamp() })
      tx.set(userRef, userPatch, { merge: true })
      tx.set(
        progressRef,
        {
          checkinCompleted: !!progressData.checkinCompleted || type === 'checkin',
          missionsCompleted: nextMissions,
          pointsEarned: (typeof progressData.pointsEarned === 'number' ? progressData.pointsEarned : 0) + points,
          createdAt: progressSnap.exists() ? progressData.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      return true
    })
  } catch (err) {
    // Best-effort by design (see call sites — a Garden dwell timer or a Journal save must
    // never fail the underlying action just because a reward write hiccuped).
    console.error('[rewards] awardDailyMission failed', { type, dateStr, message: err instanceof Error ? err.message : String(err) })
    return false
  }
}

/** Live today's-progress feed for the Me tab checklist and progress bar. */
export function subscribeDailyProgress(uid: string, dateStr: string, callback: (progress: DailyProgress) => void): () => void {
  if (!firebaseConfigured) {
    callback(emptyProgress(dateStr))
    return () => {}
  }
  const db = getFirebaseFirestore()
  return onSnapshot(
    doc(db, 'users', uid, 'dailyProgress', dateStr),
    (snap) => callback(toDailyProgress(dateStr, snap.data())),
    (err) => console.error('[rewards] subscribeDailyProgress failed', err),
  )
}

/**
 * One-shot fetch of several days' progress by their known date strings (weekly view /
 * history) — reading each day directly by its document id needs no query or composite
 * index at all, since the caller already knows exactly which dates it wants.
 */
export async function fetchProgressForDates(uid: string, dateStrs: string[]): Promise<DailyProgress[]> {
  if (!firebaseConfigured) return dateStrs.map(emptyProgress)
  const db = getFirebaseFirestore()
  const snaps = await Promise.all(dateStrs.map((d) => getDoc(doc(db, 'users', uid, 'dailyProgress', d))))
  return snaps.map((snap, i) => toDailyProgress(dateStrs[i], snap.data()))
}
