// ECHO ธรรมอุทยาน retheme — Firestore security-rules verification for the Mindfulness Bell's
// +3 daily reward (spec: "reuse the existing secure idempotent reward architecture", ledger
// key pattern `mindfulness_bell_{YYYY-MM-DD}`).
//
// mindfulness_bell reuses the exact same create-once ledger + bounded-delta totalPoints
// mechanism already verified for checkin/hearwithheart in rewards-levels.rules.test.mjs —
// this file only exercises the NEW type, including that it can never be confused with or
// stand in for the separate daily check-in (distinct ledger doc id, same point value).
//
// Requires the Firebase Firestore emulator already running and reachable — this script does
// NOT start it itself. Run it via:
//   firebase emulators:exec --only firestore "node tests/firestore-rules/mindfulness-bell.rules.test.mjs"
//
// Every test uses assertSucceeds/assertFails from @firebase/rules-unit-testing against a
// REAL rules-evaluation engine loaded from the actual firestore.rules file.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_PATH = path.join(__dirname, '..', '..', 'firestore.rules')
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST_ONLY ?? '127.0.0.1'
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080)
const PROJECT_ID = 'echo-hub-mindfulness-bell-verify'

const UID_A = 'uid-A-alice'
const UID_B = 'uid-B-bob'
const DATE = '2026-09-02'

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
  const dbB = dbAs(UID_B)

  console.log('\nrewards ledger — mindfulness_bell at 3 points')

  await test('a mindfulness_bell reward at 3 points is accepted', async () => {
    await assertSucceeds(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `mindfulness_bell_${DATE}`), {
        type: 'mindfulness_bell',
        points: 3,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a second mindfulness_bell reward for the same account/date is rejected (create-once)', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `mindfulness_bell_${DATE}`), {
        type: 'mindfulness_bell',
        points: 3,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a mindfulness_bell reward claiming 5 points instead of 3 is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', 'mindfulness_bell_2026-09-03'), {
        type: 'mindfulness_bell',
        points: 5,
        date: '2026-09-03',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a mindfulness_bell reward whose id does not match type_date is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', 'wrong_id_2026-09-03'), {
        type: 'mindfulness_bell',
        points: 3,
        date: '2026-09-03',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a different account cannot write into uid A\'s rewards ledger', async () => {
    await assertFails(
      setDoc(doc(dbB, 'users', UID_A, 'rewards', 'mindfulness_bell_2026-09-03'), {
        type: 'mindfulness_bell',
        points: 3,
        date: '2026-09-03',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  console.log('\nmindfulness_bell and checkin are independent ledger slots on the same day')

  await test('a checkin reward on the SAME date the bell was already claimed still succeeds (distinct ledger doc)', async () => {
    await assertSucceeds(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `checkin_${DATE}`), {
        type: 'checkin',
        points: 3,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  console.log('\nusers/{uid} totalPoints — bounded-delta acceptance for the bell\'s +3')

  await seedUserDoc(UID_A, { codename: 'Cedar', totalPoints: 0, currentStreak: 0, bestStreak: 0, lastCheckinDate: null })

  await test('a lone +3 totalPoints delta with no streak fields (the bell\'s shape) is accepted', async () => {
    await assertSucceeds(updateDoc(doc(dbA, 'users', UID_A), { totalPoints: 3 }))
  })

  await test('a second same-shaped +3 delta right after is still accepted by this lightweight cache guard alone (the ledger above is the real duplicate-blocker, not this field)', async () => {
    await assertSucceeds(updateDoc(doc(dbA, 'users', UID_A), { totalPoints: 6 }))
  })

  await test('an implausible +4 totalPoints delta is rejected (3/5/10/checkin-3 are the only valid shapes)', async () => {
    await assertFails(updateDoc(doc(dbA, 'users', UID_A), { totalPoints: 10 }))
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
