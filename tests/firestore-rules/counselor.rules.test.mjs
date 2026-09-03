// ECHO Counselor (ครูแนะแนว) — Firestore security-rules verification.
//
// Validates firestore.rules (as it actually exists on disk, read verbatim) against the
// counselorThreads/{studentUid} + messages/readState subcollections, and the
// 'counselor_reply' branch added to the shared notifications collection. The admin side is
// simulated via @firebase/rules-unit-testing's authenticatedContext(uid, {admin: true}) —
// the exact same mechanism a real Firebase Auth ID token custom claim surfaces as
// request.auth.token.admin, so this is a faithful test of the real isAdmin() rule helper,
// not a hand-rolled reimplementation of it.
//
// Run via:
//   firebase emulators:exec --only firestore "node tests/firestore-rules/counselor.rules.test.mjs"
// (or: npm run test:counselor-rules)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc, addDoc, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_PATH = path.join(__dirname, '..', '..', 'firestore.rules')
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST_ONLY ?? '127.0.0.1'
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080)
const PROJECT_ID = 'echo-hub-counselor-verify'

const UID_A = 'uid-student-alice'
const UID_B = 'uid-student-bob'
const UID_ADMIN = 'uid-admin-teacher'
const PUBLIC_A = 'pub-alice'
const PUBLIC_B = 'pub-bob'
const PUBLIC_ADMIN = 'pub-admin'

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

function dbAs(uid, claims) {
  if (uid === null) return testEnv.unauthenticatedContext().firestore()
  return testEnv.authenticatedContext(uid, claims).firestore()
}

async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()))
}

function newThread(overrides = {}) {
  return {
    studentUid: UID_A,
    studentPublicId: PUBLIC_A,
    studentDisplayName: 'BlueWillow55',
    status: 'waiting_admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastStudentMessageAt: serverTimestamp(),
    lastAdminReplyAt: null,
    unreadForAdmin: true,
    unreadForStudent: false,
    lastMessagePreview: 'หนูมีเรื่องอยากปรึกษาค่ะ',
    ...overrides,
  }
}

function studentMessage(overrides = {}) {
  return {
    senderUid: UID_A,
    senderRole: 'student',
    text: 'หนูมีเรื่องอยากปรึกษาค่ะ',
    createdAt: serverTimestamp(),
    readAt: null,
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

  // Seed users/{uid}.publicId docs — myPublicId() in the rules reads these.
  await seed(async (db) => {
    await setDoc(doc(db, 'users', UID_A), { publicId: PUBLIC_A })
    await setDoc(doc(db, 'users', UID_B), { publicId: PUBLIC_B })
    await setDoc(doc(db, 'users', UID_ADMIN), { publicId: PUBLIC_ADMIN })
  })

  const dbA = dbAs(UID_A)
  const dbB = dbAs(UID_B)
  const dbAdmin = dbAs(UID_ADMIN, { admin: true })
  const dbAnon = dbAs(null)

  console.log('\ncounselorThreads — create-shape rejections (each against a fresh, never-created doc id, so these genuinely exercise the CREATE branch, not update)')

  await test('B cannot create a thread at A\'s uid path (path uid must equal the caller\'s own uid)', async () => {
    await assertFails(setDoc(doc(dbB, 'counselorThreads', 'uid-fresh-1'), newThread({ studentUid: 'uid-fresh-1' })))
  })

  await test('A cannot create a thread at their own path whose studentUid field points elsewhere', async () => {
    await assertFails(setDoc(doc(dbA, 'counselorThreads', UID_A), newThread({ studentUid: UID_B })))
  })

  await test('a thread create with an unrecognized extra field is rejected', async () => {
    await assertFails(setDoc(doc(dbA, 'counselorThreads', UID_A), { ...newThread(), sneakyField: 'nope' }))
  })

  await test('a thread create with the wrong initial status is rejected', async () => {
    await assertFails(setDoc(doc(dbA, 'counselorThreads', UID_A), newThread({ status: 'closed' })))
  })

  await test('a thread create claiming unreadForAdmin: false is rejected (must start true)', async () => {
    await assertFails(setDoc(doc(dbA, 'counselorThreads', UID_A), newThread({ unreadForAdmin: false })))
  })

  console.log('\ncounselorThreads — create (student\'s first message, the real one used for the rest of this file)')

  await test('A creates their own thread: succeeds', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'counselorThreads', UID_A), newThread()))
  })

  await test('A adds their own first message into it: succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(collection(dbA, 'counselorThreads', UID_A, 'messages'), 'msg1'), studentMessage()),
    )
  })

  console.log('\ncounselorThreads — read access')

  await test('A can read their own thread', async () => {
    const snap = await getDoc(doc(dbA, 'counselorThreads', UID_A))
    if (!snap.exists()) throw new Error('thread did not persist')
  })

  await test('B cannot read A\'s thread', async () => {
    await assertFails(getDoc(doc(dbB, 'counselorThreads', UID_A)))
  })

  await test('an unauthenticated caller cannot read A\'s thread', async () => {
    await assertFails(getDoc(doc(dbAnon, 'counselorThreads', UID_A)))
  })

  await test('the admin CAN read A\'s thread', async () => {
    await assertSucceeds(getDoc(doc(dbAdmin, 'counselorThreads', UID_A)))
  })

  console.log('\ncounselorThreads/messages — cross-student + forgery denial')

  await test('B cannot read A\'s messages', async () => {
    await assertFails(getDoc(doc(dbB, 'counselorThreads', UID_A, 'messages', 'msg1')))
  })

  await test('B cannot write a message into A\'s thread', async () => {
    await assertFails(
      setDoc(doc(collection(dbB, 'counselorThreads', UID_A, 'messages'), 'msg-evil'), studentMessage({ senderUid: UID_B })),
    )
  })

  await test('A cannot forge senderRole "admin" on their own message', async () => {
    await assertFails(
      setDoc(
        doc(collection(dbA, 'counselorThreads', UID_A, 'messages'), 'msg-forge-admin'),
        studentMessage({ senderRole: 'admin' }),
      ),
    )
  })

  await test('A cannot forge senderUid to someone else\'s uid', async () => {
    await assertFails(
      setDoc(
        doc(collection(dbA, 'counselorThreads', UID_A, 'messages'), 'msg-forge-uid'),
        studentMessage({ senderUid: UID_B }),
      ),
    )
  })

  await test('an empty-text message is rejected', async () => {
    await assertFails(
      setDoc(doc(collection(dbA, 'counselorThreads', UID_A, 'messages'), 'msg-empty'), studentMessage({ text: '' })),
    )
  })

  await test('a message over 5000 characters is rejected', async () => {
    await assertFails(
      setDoc(
        doc(collection(dbA, 'counselorThreads', UID_A, 'messages'), 'msg-toolong'),
        studentMessage({ text: 'a'.repeat(5001) }),
      ),
    )
  })

  await test('a forged (non-server-time) createdAt is rejected', async () => {
    await assertFails(
      setDoc(
        doc(collection(dbA, 'counselorThreads', UID_A, 'messages'), 'msg-forge-time'),
        studentMessage({ createdAt: new Date() }),
      ),
    )
  })

  console.log('\ncounselorThreads — student sends a follow-up message (update)')

  await test('A sends a second message and flips the thread back to waiting_admin: succeeds', async () => {
    await assertSucceeds(
      updateDoc(doc(dbA, 'counselorThreads', UID_A), {
        status: 'waiting_admin',
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastStudentMessageAt: serverTimestamp(),
        unreadForAdmin: true,
        lastMessagePreview: 'มีอีกเรื่องนึงค่ะ',
      }),
    )
  })

  await test('A cannot set status to something other than waiting_admin on their own update', async () => {
    await assertFails(
      updateDoc(doc(dbA, 'counselorThreads', UID_A), {
        status: 'closed',
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastStudentMessageAt: serverTimestamp(),
        unreadForAdmin: true,
        lastMessagePreview: 'x',
      }),
    )
  })

  await test('A cannot touch unreadForStudent while sending their own message', async () => {
    await assertFails(
      updateDoc(doc(dbA, 'counselorThreads', UID_A), {
        status: 'waiting_admin',
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastStudentMessageAt: serverTimestamp(),
        unreadForAdmin: true,
        unreadForStudent: true,
        lastMessagePreview: 'x',
      }),
    )
  })

  console.log('\ncounselorThreads — admin reply (update + message + notification)')

  await test('the admin can reply: thread flips to waiting_student', async () => {
    await assertSucceeds(
      updateDoc(doc(dbAdmin, 'counselorThreads', UID_A), {
        status: 'waiting_student',
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastAdminReplyAt: serverTimestamp(),
        unreadForStudent: true,
        lastMessagePreview: 'ครูรับข้อความแล้วนะ',
      }),
    )
  })

  await test('the admin can add an admin-authored message', async () => {
    await assertSucceeds(
      setDoc(doc(collection(dbAdmin, 'counselorThreads', UID_A, 'messages'), 'msg-admin-1'), {
        senderUid: UID_ADMIN,
        senderRole: 'admin',
        text: 'ครูรับข้อความแล้วนะ เล่าเพิ่มเติมได้เลย',
        createdAt: serverTimestamp(),
        readAt: null,
      }),
    )
  })

  await test('the admin cannot forge senderRole "student" on their own message', async () => {
    await assertFails(
      setDoc(doc(collection(dbAdmin, 'counselorThreads', UID_A, 'messages'), 'msg-admin-forge'), {
        senderUid: UID_ADMIN,
        senderRole: 'student',
        text: 'sneaky',
        createdAt: serverTimestamp(),
        readAt: null,
      }),
    )
  })

  await test('a non-admin student cannot write an admin-shaped update to A\'s thread', async () => {
    await assertFails(
      updateDoc(doc(dbB, 'counselorThreads', UID_A), {
        status: 'waiting_student',
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastAdminReplyAt: serverTimestamp(),
        unreadForStudent: true,
        lastMessagePreview: 'not really the counselor',
      }),
    )
  })

  await test('the admin can create a counselor_reply notification addressed to A', async () => {
    await assertSucceeds(
      addDoc(collection(dbAdmin, 'notifications'), {
        type: 'counselor_reply',
        ownerPublicId: PUBLIC_A,
        fromPublicId: PUBLIC_ADMIN,
        fromCodename: 'ครูแนะแนว',
        requestId: null,
        roomId: null,
        counselorThreadId: UID_A,
        preview: 'ครูรับข้อความแล้วนะ',
        read: false,
        createdAt: serverTimestamp(),
      }),
    )
  })

  await test('a non-admin cannot create a counselor_reply notification', async () => {
    await assertFails(
      addDoc(collection(dbB, 'notifications'), {
        type: 'counselor_reply',
        ownerPublicId: PUBLIC_A,
        fromPublicId: PUBLIC_B,
        fromCodename: 'not the counselor',
        requestId: null,
        roomId: null,
        counselorThreadId: UID_A,
        preview: 'fake',
        read: false,
        createdAt: serverTimestamp(),
      }),
    )
  })

  await test('the admin cannot address a counselor_reply notification to the wrong student', async () => {
    await assertFails(
      addDoc(collection(dbAdmin, 'notifications'), {
        type: 'counselor_reply',
        ownerPublicId: PUBLIC_B, // thread UID_A's studentPublicId is PUBLIC_A, not PUBLIC_B
        fromPublicId: PUBLIC_ADMIN,
        fromCodename: 'ครูแนะแนว',
        requestId: null,
        roomId: null,
        counselorThreadId: UID_A,
        preview: 'forged owner',
        read: false,
        createdAt: serverTimestamp(),
      }),
    )
  })

  console.log('\ncounselorThreads — mark-read flags + readState cursor')
  // Ordered so each cross-field denial test is a genuine attempted VALUE CHANGE (both flags
  // are still their post-reply `true` at this point: unreadForAdmin was never touched since
  // thread creation, unreadForStudent was just set true by the admin's reply above) — a
  // same-value no-op write is invisible to Firestore's diff()-based affectedKeys() check
  // (see the rule's own comment), so testing the denial before either flag is actually
  // cleared is what makes this a real test of "wrong party, wrong field" rather than an
  // accidental no-op that happens to look denied for the wrong reason.

  await test('A cannot clear unreadForAdmin (not their own side)', async () => {
    await assertFails(updateDoc(doc(dbA, 'counselorThreads', UID_A), { unreadForAdmin: false }))
  })

  await test('the admin cannot clear unreadForStudent (not their own side)', async () => {
    await assertFails(updateDoc(doc(dbAdmin, 'counselorThreads', UID_A), { unreadForStudent: false }))
  })

  await test('A can clear their own unreadForStudent flag', async () => {
    await assertSucceeds(updateDoc(doc(dbA, 'counselorThreads', UID_A), { unreadForStudent: false }))
  })

  await test('the admin can clear their own unreadForAdmin flag', async () => {
    await assertSucceeds(updateDoc(doc(dbAdmin, 'counselorThreads', UID_A), { unreadForAdmin: false }))
  })

  await test('A can write their own readState/student cursor', async () => {
    await assertSucceeds(setDoc(doc(dbA, 'counselorThreads', UID_A, 'readState', 'student'), { lastReadAt: serverTimestamp() }))
  })

  await test('A cannot write the admin\'s readState/admin cursor', async () => {
    await assertFails(setDoc(doc(dbA, 'counselorThreads', UID_A, 'readState', 'admin'), { lastReadAt: serverTimestamp() }))
  })

  await test('the admin can write the readState/admin cursor', async () => {
    await assertSucceeds(setDoc(doc(dbAdmin, 'counselorThreads', UID_A, 'readState', 'admin'), { lastReadAt: serverTimestamp() }))
  })

  await test('the admin cannot write the student\'s readState/student cursor', async () => {
    await assertFails(setDoc(doc(dbAdmin, 'counselorThreads', UID_A, 'readState', 'student'), { lastReadAt: serverTimestamp() }))
  })

  console.log('\ncounselorThreads — reopen from closed')

  await seed(async (db) => {
    await updateDoc(doc(db, 'counselorThreads', UID_A), { status: 'closed', updatedAt: serverTimestamp() })
  })

  await test('a new student message reopens a closed thread to waiting_admin', async () => {
    await assertSucceeds(
      updateDoc(doc(dbA, 'counselorThreads', UID_A), {
        status: 'waiting_admin',
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastStudentMessageAt: serverTimestamp(),
        unreadForAdmin: true,
        lastMessagePreview: 'ขอคุยต่ออีกครั้งค่ะ',
      }),
    )
  })

  console.log('\ncounselorThreads — never deleted')

  await test('nobody can delete a thread — not the student, not the admin', async () => {
    await assertFails(writeBatch(dbA).delete(doc(dbA, 'counselorThreads', UID_A)).commit())
    await assertFails(writeBatch(dbAdmin).delete(doc(dbAdmin, 'counselorThreads', UID_A)).commit())
  })

  console.log('\nAdmin is NEVER granted access outside counselorThreads (journal privacy)')

  await seed(async (db) => {
    await setDoc(doc(db, 'users', UID_A, 'dailyJournal', '2026-08-30'), {
      date: '2026-08-30',
      content: 'private journal entry',
      mood: 'good',
      theme: 'cream',
      stickers: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  await test('the admin CANNOT read a student\'s Daily Journal entry', async () => {
    await assertFails(getDoc(doc(dbAdmin, 'users', UID_A, 'dailyJournal', '2026-08-30')))
  })

  await test('the admin CANNOT read a student\'s private users/{uid} doc', async () => {
    await assertFails(getDoc(doc(dbAdmin, 'users', UID_A)))
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
