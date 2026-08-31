// FAMILY & FRIENDS (Know Me Better / Open Heart Question / Family Memory) — Firestore
// security-rules verification.
//
// Validates firestore.rules (as it actually exists on disk, read verbatim) against the
// exact write shapes used by openHeartAnswerService.ts and familyMemoryService.ts, plus the
// private-ownership guarantee that is the whole point of this section being private by
// default (spec section 7). Mirrors tests/firestore-rules/daily-journal.rules.test.mjs.
//
// Requires the Firebase Firestore emulator already running and reachable — this script does
// NOT start it itself. Run it via:
//   firebase emulators:exec --only firestore "node tests/firestore-rules/family-friends.rules.test.mjs"
//
// Every test uses assertSucceeds/assertFails from @firebase/rules-unit-testing against a
// REAL rules-evaluation engine loaded from the actual firestore.rules file. A FAIL means the
// rules file does not behave the way the app's own service code (or an attacker) would
// observe. This script never weakens or works around a rule to make a test pass.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_PATH = path.join(__dirname, '..', '..', 'firestore.rules')
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST_ONLY ?? '127.0.0.1'
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080)
const PROJECT_ID = 'echo-hub-family-verify'

const UID_A = 'uid-A-alice'
const UID_B = 'uid-B-bob'
const DATE = '2026-08-30'

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

function answerEntry(overrides = {}) {
  return {
    date: DATE,
    questionId: 'ohq-today-001',
    questionText: 'วันนี้มีเรื่องเล็ก ๆ อะไรที่ทำให้ยิ้ม?',
    answer: 'เจอเพื่อนเก่าโดยบังเอิญ',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

function memoryEntry(overrides = {}) {
  return {
    date: DATE,
    title: 'วันนี้กินข้าวพร้อมหน้ากัน',
    description: 'บรรยากาศดีมาก',
    emoji: '🍚',
    tag: 'ครอบครัว',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
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

  // ---------------------------------------------------------------------------------
  console.log('\nopenHeartAnswers')
  // ---------------------------------------------------------------------------------

  await test('A writes today\'s answer: create succeeds', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'users', UID_A, 'openHeartAnswers', DATE), answerEntry()))
  })

  await test('A can read the answer back', async () => {
    const snap = await getDoc(doc(dbA, 'users', UID_A, 'openHeartAnswers', DATE))
    if (!snap.exists()) throw new Error('answer did not persist')
  })

  await test('B cannot read A\'s answer', async () => {
    await assertFails(getDoc(doc(dbB, 'users', UID_A, 'openHeartAnswers', DATE)))
  })

  await test('B cannot write into A\'s openHeartAnswers subcollection', async () => {
    await assertFails(setDoc(doc(dbB, 'users', UID_A, 'openHeartAnswers', DATE), answerEntry()))
  })

  await test('a document id that does not match the entry\'s own date field is rejected', async () => {
    await assertFails(setDoc(doc(dbA, 'users', UID_A, 'openHeartAnswers', DATE), answerEntry({ date: '2026-08-31' })))
  })

  await test('an answer over the 5000-char limit is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'openHeartAnswers', '2026-08-01'), answerEntry({ date: '2026-08-01', answer: 'a'.repeat(5001) })),
    )
  })

  await test('a questionText over the 300-char limit is rejected', async () => {
    await assertFails(
      setDoc(
        doc(dbA, 'users', UID_A, 'openHeartAnswers', '2026-08-02'),
        answerEntry({ date: '2026-08-02', questionText: 'a'.repeat(301) }),
      ),
    )
  })

  await test('a forged (non-server-time) updatedAt is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'openHeartAnswers', '2026-08-03'), answerEntry({ date: '2026-08-03', updatedAt: new Date() })),
    )
  })

  await test('editing today\'s answer updates the SAME document (still exactly one per day)', async () => {
    await assertSucceeds(
      setDoc(
        doc(dbA, 'users', UID_A, 'openHeartAnswers', DATE),
        { date: DATE, questionId: 'ohq-today-001', questionText: 'x', answer: 'คำตอบใหม่', updatedAt: serverTimestamp() },
        { merge: true },
      ),
    )
    const snap = await getDoc(doc(dbA, 'users', UID_A, 'openHeartAnswers', DATE))
    if (snap.data().answer !== 'คำตอบใหม่') throw new Error('edit did not land on the same document')
  })

  await test('an update may not change createdAt away from its original value', async () => {
    await assertFails(updateDoc(doc(dbA, 'users', UID_A, 'openHeartAnswers', DATE), { createdAt: serverTimestamp() }))
  })

  // ---------------------------------------------------------------------------------
  console.log('\nfamilyMemories')
  // ---------------------------------------------------------------------------------

  const memRef = doc(collection(dbA, 'users', UID_A, 'familyMemories'))

  await test('A creates a memory (auto-id): create succeeds', async () => {
    await assertSucceeds(setDoc(memRef, memoryEntry()))
  })

  await test('A can read the memory back', async () => {
    const snap = await getDoc(memRef)
    if (!snap.exists()) throw new Error('memory did not persist')
  })

  await test('B cannot read A\'s memory', async () => {
    await assertFails(getDoc(doc(dbB, 'users', UID_A, 'familyMemories', memRef.id)))
  })

  await test('B cannot create a memory in A\'s collection', async () => {
    await assertFails(setDoc(doc(dbB, 'users', UID_A, 'familyMemories', 'forged'), memoryEntry()))
  })

  await test('a memory with an empty title is rejected', async () => {
    await assertFails(setDoc(doc(collection(dbA, 'users', UID_A, 'familyMemories')), memoryEntry({ title: '' })))
  })

  await test('a title over the 100-char limit is rejected', async () => {
    await assertFails(setDoc(doc(collection(dbA, 'users', UID_A, 'familyMemories')), memoryEntry({ title: 'a'.repeat(101) })))
  })

  await test('a description over the 1000-char limit is rejected', async () => {
    await assertFails(
      setDoc(doc(collection(dbA, 'users', UID_A, 'familyMemories')), memoryEntry({ description: 'a'.repeat(1001) })),
    )
  })

  await test('an emoji outside the curated set is rejected', async () => {
    await assertFails(setDoc(doc(collection(dbA, 'users', UID_A, 'familyMemories')), memoryEntry({ emoji: '💀' })))
  })

  await test('a tag over the 30-char limit is rejected', async () => {
    await assertFails(setDoc(doc(collection(dbA, 'users', UID_A, 'familyMemories')), memoryEntry({ tag: 'a'.repeat(31) })))
  })

  await test('a forged (non-server-time) updatedAt is rejected', async () => {
    await assertFails(setDoc(doc(collection(dbA, 'users', UID_A, 'familyMemories')), memoryEntry({ updatedAt: new Date() })))
  })

  await test('A edits the memory (title/description/emoji/tag) — update succeeds', async () => {
    await assertSucceeds(
      setDoc(
        memRef,
        { date: DATE, title: 'แก้ไขแล้ว', description: 'เพิ่มรายละเอียด', emoji: '🎂', tag: 'เพื่อน', updatedAt: serverTimestamp() },
        { merge: true },
      ),
    )
  })

  await test('an update may not change createdAt away from its original value', async () => {
    await assertFails(updateDoc(memRef, { createdAt: serverTimestamp() }))
  })

  await test('B cannot delete A\'s memory', async () => {
    await assertFails(deleteDoc(doc(dbB, 'users', UID_A, 'familyMemories', memRef.id)))
  })

  await test('A can delete her own memory (spec: edit + delete allowed)', async () => {
    await assertSucceeds(deleteDoc(memRef))
  })

  await test('A can list her own familyMemories collection', async () => {
    await assertSucceeds(getDocs(collection(dbA, 'users', UID_A, 'familyMemories')))
  })

  // ---------------------------------------------------------------------------------
  console.log('\nreward ledger (know_me_better / open_heart_question / shared_memory, +5 each)')
  // ---------------------------------------------------------------------------------

  for (const type of ['know_me_better', 'open_heart_question', 'shared_memory']) {
    await test(`${type} reward ledger entry is accepted at 5 points`, async () => {
      await assertSucceeds(
        setDoc(doc(dbA, 'users', UID_A, 'rewards', `${type}_${DATE}`), { type, points: 5, date: DATE, awardedAt: serverTimestamp() }),
      )
    })

    await test(`a second ${type} reward for the same account/date is rejected (create-once)`, async () => {
      await assertFails(
        setDoc(doc(dbA, 'users', UID_A, 'rewards', `${type}_${DATE}`), { type, points: 5, date: DATE, awardedAt: serverTimestamp() }),
      )
    })
  }

  await test('a know_me_better reward claiming 10 points instead of 5 is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', 'know_me_better_2026-08-09'), {
        type: 'know_me_better',
        points: 10,
        date: '2026-08-09',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  // ---------------------------------------------------------------------------------
  console.log('\nanalyticsActivityDaily counters (knowMeBetter / openHeartQuestion / sharedMemoryCreated)')
  // ---------------------------------------------------------------------------------

  await test('a +1 knowMeBetter-only delta succeeds', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'analyticsActivityDaily', DATE), { knowMeBetter: 1 }, { merge: true }))
  })

  await test('a +1 openHeartQuestion-only delta succeeds', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'analyticsActivityDaily', DATE), { openHeartQuestion: 1 }, { merge: true }))
  })

  await test('a +1 sharedMemoryCreated-only delta succeeds', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'analyticsActivityDaily', DATE), { sharedMemoryCreated: 1 }, { merge: true }))
  })

  await test('a +2 sharedMemoryCreated delta in one write is rejected (must be exactly +1)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'analyticsActivityDaily', '2026-08-11'), { sharedMemoryCreated: 0 })
    })
    await assertFails(setDoc(doc(dbA, 'analyticsActivityDaily', '2026-08-11'), { sharedMemoryCreated: 2 }, { merge: true }))
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
