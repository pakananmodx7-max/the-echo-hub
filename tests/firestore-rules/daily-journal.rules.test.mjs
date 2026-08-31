// Daily Journal — Firestore security-rules verification.
//
// Validates firestore.rules (as it actually exists on disk, read verbatim — this script
// never embeds a copy of the rules) against the exact write shapes used by
// dailyJournalService.ts, plus the private-ownership guarantee ("nobody but the owner may
// ever read this") that is the whole point of Daily Journal being private-by-default.
//
// Requires the Firebase Firestore emulator already running and reachable — this script does
// NOT start it itself. Run it via:
//   firebase emulators:exec --only firestore "node tests/firestore-rules/daily-journal.rules.test.mjs"
// (emulators:exec starts the emulator, waits for it to be ready, runs the command, then
// shuts the emulator down — the standard firebase-tools pattern, mirroring
// tests/rtdb-rules/garden-v2.rules.test.mjs for Firestore instead of RTDB.)
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
const PROJECT_ID = 'echo-hub-journal-verify'

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

async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()))
}

function entry(overrides = {}) {
  return {
    date: DATE,
    content: 'วันนี้เป็นวันที่ดีมาก',
    mood: 'good',
    theme: 'cream',
    stickers: ['🤍', '🌙'],
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
  const dbAnon = dbAs(null)

  console.log('\ndailyJournal — create (first save of the day)')

  await test('A writes today\'s entry: create succeeds', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', DATE), entry()))
  })

  await test('A reloads: the same entry is readable back by its owner', async () => {
    const snap = await getDoc(doc(dbA, 'users', UID_A, 'dailyJournal', DATE))
    if (!snap.exists()) throw new Error('entry did not persist')
    if (snap.data().content !== 'วันนี้เป็นวันที่ดีมาก') throw new Error('content mismatch on reload')
  })

  await test('B cannot read A\'s journal entry', async () => {
    await assertFails(getDoc(doc(dbB, 'users', UID_A, 'dailyJournal', DATE)))
  })

  await test('an unauthenticated caller cannot read A\'s journal entry', async () => {
    await assertFails(getDoc(doc(dbAnon, 'users', UID_A, 'dailyJournal', DATE)))
  })

  await test('B cannot write into A\'s journal subcollection', async () => {
    await assertFails(setDoc(doc(dbB, 'users', UID_A, 'dailyJournal', DATE), entry()))
  })

  await test('a document id that does not match the entry\'s own date field is rejected', async () => {
    await assertFails(setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', DATE), entry({ date: '2026-08-31' })))
  })

  await test('content over the 20000-char limit is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-01'), entry({ date: '2026-08-01', content: 'a'.repeat(20001) })),
    )
  })

  await test('an invalid theme is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-02'), entry({ date: '2026-08-02', theme: 'rainbow-explosion' })),
    )
  })

  await test('an invalid mood is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-03'), entry({ date: '2026-08-03', mood: 'furious' })),
    )
  })

  await test('mood: null (unset) is accepted', async () => {
    await assertSucceeds(
      setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-04'), entry({ date: '2026-08-04', mood: null })),
    )
  })

  await test('a sticker outside the curated set is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-05'), entry({ date: '2026-08-05', stickers: ['💀'] })),
    )
  })

  await test('more than 6 stickers is rejected', async () => {
    await assertFails(
      setDoc(
        doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-06'),
        entry({ date: '2026-08-06', stickers: ['🤍', '🌷', '⭐', '🌙', '☁️', '🌿', '🦋'] }),
      ),
    )
  })

  await test('a forged (non-server-time) updatedAt is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-07'), entry({ date: '2026-08-07', updatedAt: new Date() })),
    )
  })

  await test('an unrecognized extra field is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'dailyJournal', '2026-08-08'), { ...entry({ date: '2026-08-08' }), authorUid: UID_A }),
    )
  })

  console.log('\ndailyJournal — edit the same day (update)')

  await test('A edits today\'s entry: update succeeds and does not require a new document', async () => {
    await assertSucceeds(
      setDoc(
        doc(dbA, 'users', UID_A, 'dailyJournal', DATE),
        { date: DATE, content: 'แก้ไขแล้ว', mood: 'okay', theme: 'lavender', stickers: ['🌷'], updatedAt: serverTimestamp() },
        { merge: true },
      ),
    )
  })

  await test('the edit updated the SAME document (still exactly one entry for that date)', async () => {
    const snap = await getDoc(doc(dbA, 'users', UID_A, 'dailyJournal', DATE))
    if (snap.data().content !== 'แก้ไขแล้ว') throw new Error('edit did not land on the same document')
  })

  await test('theme and sticker changes persist across the edit', async () => {
    const snap = await getDoc(doc(dbA, 'users', UID_A, 'dailyJournal', DATE))
    if (snap.data().theme !== 'lavender') throw new Error('theme change did not persist')
    if (JSON.stringify(snap.data().stickers) !== JSON.stringify(['🌷'])) throw new Error('sticker change did not persist')
  })

  await test('an update may not change createdAt away from its original value', async () => {
    await assertFails(
      updateDoc(doc(dbA, 'users', UID_A, 'dailyJournal', DATE), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    )
  })

  console.log('\ndailyJournal — reward ledger (daily_journal, +5 points, once per account/date)')

  await test('the daily_journal reward ledger entry is accepted at 5 points', async () => {
    await assertSucceeds(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `daily_journal_${DATE}`), {
        type: 'daily_journal',
        points: 5,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a second daily_journal reward for the same account/date is rejected (create-once)', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `daily_journal_${DATE}`), {
        type: 'daily_journal',
        points: 5,
        date: DATE,
        awardedAt: serverTimestamp(),
      }),
    )
  })

  await test('a daily_journal reward claiming 10 points instead of 5 is rejected', async () => {
    await assertFails(
      setDoc(doc(dbA, 'users', UID_A, 'rewards', `daily_journal_2026-08-09`), {
        type: 'daily_journal',
        points: 10,
        date: '2026-08-09',
        awardedAt: serverTimestamp(),
      }),
    )
  })

  console.log('\ndailyJournal — analyticsActivityDaily dailyJournalCompleted counter')

  await test('a +1 dailyJournalCompleted-only delta succeeds', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'analyticsActivityDaily', DATE), { dailyJournalCompleted: 1 }, { merge: true }))
  })

  await test('a +2 dailyJournalCompleted delta in one write is rejected (must be exactly +1)', async () => {
    await seed(async (db) => {
      const { setDoc: rawSetDoc, doc: rawDoc } = await import('firebase/firestore')
      await rawSetDoc(rawDoc(db, 'analyticsActivityDaily', '2026-08-10'), { dailyJournalCompleted: 0 })
    })
    await assertFails(setDoc(doc(dbA, 'analyticsActivityDaily', '2026-08-10'), { dailyJournalCompleted: 2 }, { merge: true }))
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
