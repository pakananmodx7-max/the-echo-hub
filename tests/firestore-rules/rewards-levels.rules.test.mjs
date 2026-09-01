// 50-level ECHO Points system — Firestore security-rules verification for the reward-amount
// audit (spec §13: checkin retargeted to +3, hearwithheart retargeted to +5) and the
// anti-forgery guarantees the level system depends on (spec §23, §25).
//
// Levels/titles/badges are NEVER stored as their own Firestore fields anywhere in this app
// (see src/features/rewards/levelConfig.ts's top comment) — they are always derived
// client-side from totalPoints. That means there is no separate "currentLevel"/"badge" field
// a client could ever forge independently of totalPoints itself, so the real security
// boundary to verify is exactly what it always was: the create-once reward ledger, and the
// users/{uid} update rule's bounded-delta check on totalPoints. This script exercises both
// against the NEW point values from the reward audit, plus a few forged-write attempts a
// malicious client might try once a 50-level system exists to want to fake.
//
// Requires the Firebase Firestore emulator already running and reachable — this script does
// NOT start it itself. Run it via:
//   firebase emulators:exec --only firestore "node tests/firestore-rules/rewards-levels.rules.test.mjs"
//
// Every test uses assertSucceeds/assertFails from @firebase/rules-unit-testing against a
// REAL rules-evaluation engine loaded from the actual firestore.rules file — nothing here is
// a hand-rolled reimplementation of the rules logic. A FAIL means the rules file does not
// behave the way the app's own service code (or an attacker) would observe.
//
// This script never weakens or works around a rule to make a test pass. If a test here ever
// fails against the current firestore.rules, the fix is to correct the rule (tighten or fix
// the bug), then re-run this script — never to loosen the rule or delete the test.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_PATH = path.join(__dirname, '..', '..', 'firestore.rules')
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST_ONLY ?? '127.0.0.1'
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080)
const PROJECT_ID = 'echo-hub-rewards-levels-verify'

const UID_A = 'uid-A-alice'
const DATE = '2026-09-01'

const results = []
let testEnv

async function test(name, fn) {
  try {
    await fn()
    results.push({ name, pass: true })
    console.log(`  PASS  ${name}`)
  } catch (err) {
    results.push({ name, pass: false, err })
    console.log(`  FAIL  ${name}`)
    console.log(`        ${err instanceof Error ? err.message : String(err)}`)
  }
}

function dbAs(uid) {
  return uid === null ? testEnv.unauthenticatedContext().firestore() : testEnv.authenticatedContext(uid).firestore()
}

async function seedUserDoc(uid, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), data)
  })
}

async function main() {
  const rules = readFileSync(RULES_PATH, 'utf8')
  console.log(`Loaded rules from ${RULES_PATH}`)

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: FIRESTORE_HOST, port: FIRESTORE_PORT },
  })

  const dbA = dbAs(UID_A)

  console.log('\nrewards ledger — checkin retargeted to +3 (was +5)')

  await test('a checkin reward at 3 points is accepted', async () => {
    await assertSucceeds(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `checkin_${DATE}`), {
        type: 'checkin',
        points: 3,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a second checkin reward for the same account/date is rejected (create-once)', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `checkin_${DATE}`), {
        type: 'checkin',
        points: 3,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a checkin reward claiming the OLD 5-point value is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', 'checkin_2026-09-02'), {
        type: 'checkin',
        points: 5,
        date: '2026-09-02',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  console.log('\nrewards ledger — hearwithheart retargeted to +5 (was +10)')

  await test('a hearwithheart reward at 5 points is accepted', async () => {
    await assertSucceeds(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `hearwithheart_${DATE}`), {
        type: 'hearwithheart',
        points: 5,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a hearwithheart reward claiming the OLD 10-point value is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', 'hearwithheart_2026-09-02'), {
        type: 'hearwithheart',
        points: 10,
        date: '2026-09-02',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  console.log('\nrewards ledger — journal/friendbond unchanged at +10')

  await test('a journal reward at 10 points is still accepted', async () => {
    await assertSucceeds(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `journal_${DATE}`), {
        type: 'journal',
        points: 10,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a journal reward claiming 5 points instead of 10 is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', 'journal_2026-09-02'), {
        type: 'journal',
        points: 5,
        date: '2026-09-02',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  console.log('\nusers/{uid} totalPoints — bounded-delta acceptance for the new point values')

  await seedUserDoc(UID_A, { codename: 'Cedar', totalPoints: 0, currentStreak: 0, bestStreak: 0, lastCheckinDate: null })

  await test('a lone +5 totalPoints delta (e.g. hearwithheart) is accepted', async () => {
    await assertSucceeds(updateDoc(doc(dbA, 'users', UID_A), { totalPoints: 5 }))
  })

  await test('a lone +10 totalPoints delta (e.g. journal/friendbond) is accepted', async () => {
    await assertSucceeds(updateDoc(doc(dbA, 'users', UID_A), { totalPoints: 15 }))
  })

  await test('the checkin-specific +3 delta with an advancing lastCheckinDate is accepted', async () => {
    await assertSucceeds(
      updateDoc(doc(dbA, 'users', UID_A), {
        totalPoints: 18,
        currentStreak: 1,
        bestStreak: 1,
        lastCheckinDate: DATE,
      }),
    )
  })

  await test('replaying the SAME lastCheckinDate a second time is rejected (no streak replay)', async () => {
    await assertFails(
      updateDoc(doc(dbA, 'users', UID_A), {
        totalPoints: 21,
        currentStreak: 2,
        bestStreak: 2,
        lastCheckinDate: DATE,
      }),
    )
  })

  console.log('\nusers/{uid} totalPoints — forged/implausible writes are rejected')

  await test('a forged direct jump to totalPoints=999999 is rejected', async () => {
    await assertFails(updateDoc(doc(dbA, 'users', UID_A), { totalPoints: 999999 }))
  })

  await test('a forged checkin-shaped write using the OLD +5 delta is rejected (must be +3)', async () => {
    await assertFails(
      updateDoc(doc(dbA, 'users', UID_A), {
        totalPoints: 23,
        currentStreak: 3,
        bestStreak: 3,
        lastCheckinDate: '2026-09-03',
      }),
    )
  })

  await test('writing an arbitrary +9450 totalPoints jump to fake reaching Level 50 in one write is rejected', async () => {
    await assertFails(updateDoc(doc(dbA, 'users', UID_A), { totalPoints: 9468 }))
  })

  await test('the account\'s real totalPoints after only the legitimate writes above is exactly 18 (not forged)', async () => {
    const snap = await getDoc(doc(dbA, 'users', UID_A))
    if (snap.data().totalPoints !== 18) {
      throw new Error(`expected totalPoints to remain 18 after all rejected forgeries, got ${snap.data().totalPoints}`)
    }
  })

  await testEnv.cleanup()

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length > 0) {
    console.log('\nFAILED:')
    for (const f of failed) console.log(`  - ${f.name}`)
    process.exitCode = 1
  } else {
    console.log('\nALL PASS')
  }
}

main().catch((err) => {
  console.error('\nTest script crashed before completing:')
  console.error(err)
  process.exitCode = 1
})
