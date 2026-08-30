// Garden V2 — RTDB security-rules verification.
//
// Validates database.rules.json (as it actually exists on disk, read verbatim — this
// script never embeds a copy of the rules) against the exact write shapes used by
// gardenPresenceService.ts, gardenSeatService.ts, and gardenEmoteService.ts.
//
// Requires the Firebase Realtime Database emulator already running and reachable — this
// script does NOT start it itself. Run it via:
//   firebase emulators:exec --only database "node tests/rtdb-rules/garden-v2.rules.test.mjs"
// (emulators:exec starts the emulator, waits for it to be ready, runs the command, then
// shuts the emulator down — the standard firebase-tools pattern for scripted rules tests.)
//
// Every test uses assertSucceeds/assertFails from @firebase/rules-unit-testing against a
// REAL rules-evaluation engine loaded from the actual database.rules.json file — nothing
// here is a hand-rolled reimplementation of the rules logic. A FAIL means the rules file
// does not behave the way the app's own service code (or an attacker) would observe.
//
// This script never weakens or works around a rule to make a test pass. If a test here
// ever fails against the current database.rules.json, the fix is to correct the rule
// (tighten or fix the bug), then re-run this script — never to loosen the rule or delete
// the test.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { ref, set, update, remove, serverTimestamp, runTransaction } from 'firebase/database'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RULES_PATH = path.join(__dirname, '..', '..', 'database.rules.json')
const DB_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST_ONLY ?? '127.0.0.1'
const DB_PORT = Number(process.env.FIREBASE_DATABASE_EMULATOR_PORT ?? 9000)
const PROJECT_ID = 'echo-hub-rtdb-verify'

const UID_A = 'uid-A-alice'
const UID_B = 'uid-B-bob'
const PUB_A = 'pub-alice'
const PUB_B = 'pub-bob'

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
  return uid === null ? testEnv.unauthenticatedContext().database() : testEnv.authenticatedContext(uid).database()
}

async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => fn(ctx.database()))
}

async function main() {
  const rules = readFileSync(RULES_PATH, 'utf8')
  console.log(`Loaded rules from ${RULES_PATH}`)

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { rules, host: DB_HOST, port: DB_PORT },
  })

  // Seed the uid -> publicId mapping directly (bypassing rules) — this mapping's own
  // write path is pre-existing/unchanged by Garden V2 and out of scope for this suite;
  // every test below exercises the NEW Garden V2 rule blocks that read it.
  await seed(async (db) => {
    await set(ref(db, `uidToPublicId/${UID_A}`), PUB_A)
    await set(ref(db, `uidToPublicId/${UID_B}`), PUB_B)
  })

  const dbA = dbAs(UID_A)
  const dbB = dbAs(UID_B)
  const dbAnon = dbAs(null)

  // ---------------------------------------------------------------------------------
  // gardenPresence — write shape used by gardenPresenceService.ts's goOnline/onDisconnect
  // (full record) and reportLocalMove/updateMood/goOffline (partial update).
  // ---------------------------------------------------------------------------------
  console.log('\ngardenPresence')

  const fullPresenceRecord = (overrides = {}) => ({
    publicId: PUB_A,
    codename: 'Alice',
    avatarId: 'cloud',
    avatarConfig: { bodyType: 'round', topStyle: 'hoodie' },
    mood: 'okay',
    x: 0,
    y: 0.58,
    z: 0,
    rotationY: 0,
    state: 'online',
    lastChanged: serverTimestamp(),
    ...overrides,
  })

  await test('goOnline: full-shape presence set by the owning user succeeds', async () => {
    await assertSucceeds(set(ref(dbA, `gardenPresence/${PUB_A}`), fullPresenceRecord()))
  })

  await test('reportLocalMove: partial x/z/rotationY/lastChanged update by owner succeeds', async () => {
    await assertSucceeds(
      update(ref(dbA, `gardenPresence/${PUB_A}`), { x: 3.2, z: -1.1, rotationY: 1.4, lastChanged: serverTimestamp() }),
    )
  })

  await test('updateMood: partial mood/lastChanged update by owner succeeds', async () => {
    await assertSucceeds(update(ref(dbA, `gardenPresence/${PUB_A}`), { mood: 'sad', lastChanged: serverTimestamp() }))
  })

  await test('goOffline: partial state/lastChanged update by owner succeeds', async () => {
    await assertSucceeds(update(ref(dbA, `gardenPresence/${PUB_A}`), { state: 'offline', lastChanged: serverTimestamp() }))
  })

  await test('item 13: B cannot write A\'s gardenPresence node', async () => {
    await assertFails(set(ref(dbB, `gardenPresence/${PUB_A}`), fullPresenceRecord({ codename: 'Forged' })))
  })

  await test('item 13: B cannot partial-update A\'s gardenPresence node', async () => {
    await assertFails(update(ref(dbB, `gardenPresence/${PUB_A}`), { x: 99, lastChanged: serverTimestamp() }))
  })

  await test('x/z out of the ±17 GARDEN_BOUND-derived range is denied', async () => {
    await assertFails(set(ref(dbA, `gardenPresence/${PUB_A}`), fullPresenceRecord({ x: 18 })))
  })

  await test('unauthenticated write to gardenPresence is denied', async () => {
    await assertFails(set(ref(dbAnon, `gardenPresence/${PUB_A}`), fullPresenceRecord()))
  })

  // ---------------------------------------------------------------------------------
  // gardenSeats — write shape used by gardenSeatService.ts's claimSeat (transaction),
  // releaseSeat (remove), and the onDisconnect(seatRef).remove() registered after claim.
  // ---------------------------------------------------------------------------------
  console.log('\ngardenSeats')

  const SEAT = 'waterfall_chair_01'

  await test('item 3/4: A claims an empty seat (set matching claimSeat\'s committed shape) succeeds', async () => {
    await assertSucceeds(set(ref(dbA, `gardenSeats/${SEAT}`), { publicId: PUB_A, claimedAt: serverTimestamp() }))
  })

  await test('item 5: B attempting to claim the now-occupied seat fails', async () => {
    await assertFails(set(ref(dbB, `gardenSeats/${SEAT}`), { publicId: PUB_B, claimedAt: serverTimestamp() }))
  })

  await test('item 14: forged ownership — A cannot claim a seat under B\'s publicId', async () => {
    await assertFails(set(ref(dbA, `gardenSeats/free_seat_1`), { publicId: PUB_B, claimedAt: serverTimestamp() }))
  })

  await test('item 14: forged timestamp — claimedAt not equal to server now is denied', async () => {
    await assertFails(set(ref(dbA, `gardenSeats/free_seat_2`), { publicId: PUB_A, claimedAt: 1730000000000 }))
  })

  await test('item 14: extra field on a seat record is denied ($other: false)', async () => {
    await assertFails(
      set(ref(dbA, `gardenSeats/free_seat_3`), { publicId: PUB_A, claimedAt: serverTimestamp(), note: 'nope' }),
    )
  })

  await test('item 14: B cannot release A\'s seat (forged release)', async () => {
    await assertFails(remove(ref(dbB, `gardenSeats/${SEAT}`)))
  })

  await test('item 6/7/8 (rule guarantee): the true occupant (A) can release/onDisconnect-remove their own seat', async () => {
    await assertSucceeds(remove(ref(dbA, `gardenSeats/${SEAT}`)))
  })

  await test('item 6: B can claim the seat once released', async () => {
    await assertSucceeds(set(ref(dbB, `gardenSeats/${SEAT}`), { publicId: PUB_B, claimedAt: serverTimestamp() }))
  })

  await test('race semantics: two concurrent transactions on one seat — exactly one commits', async () => {
    await seed(async (db) => remove(ref(db, `gardenSeats/race_seat`)))
    const seatA = ref(dbA, 'gardenSeats/race_seat')
    const seatB = ref(dbB, 'gardenSeats/race_seat')
    const claim = (seatRef, publicId) =>
      runTransaction(seatRef, (current) => (current !== null ? undefined : { publicId, claimedAt: serverTimestamp() }))
    const [resA, resB] = await Promise.all([claim(seatA, PUB_A), claim(seatB, PUB_B)])
    const committedCount = [resA, resB].filter((r) => r.committed).length
    if (committedCount !== 1) {
      throw new Error(`expected exactly 1 commit, got ${committedCount} (A committed=${resA.committed}, B committed=${resB.committed})`)
    }
  })

  await test('unauthenticated cannot claim a seat', async () => {
    await assertFails(set(ref(dbAnon, `gardenSeats/anon_seat`), { publicId: PUB_A, claimedAt: serverTimestamp() }))
  })

  // ---------------------------------------------------------------------------------
  // gardenEmotes / gardenEmoteCooldown — write shape used by gardenEmoteService.ts's
  // setEmote (set) and clearEmote (remove).
  // ---------------------------------------------------------------------------------
  console.log('\ngardenEmotes')

  await test('item 9/10: A sets a valid emote (matches setEmote\'s committed shape) succeeds', async () => {
    await assertSucceeds(set(ref(dbA, `gardenEmotes/${PUB_A}`), { emote: 'wave', startedAt: serverTimestamp() }))
  })

  await test('item 13: forged emote — B cannot set an emote under A\'s publicId', async () => {
    await assertFails(set(ref(dbB, `gardenEmotes/${PUB_A}`), { emote: 'wave', startedAt: serverTimestamp() }))
  })

  await test('item 13: B cannot clear A\'s active emote', async () => {
    await assertFails(remove(ref(dbB, `gardenEmotes/${PUB_A}`)))
  })

  await test('item 14: an emote id outside the fixed allow-list is denied', async () => {
    await assertFails(set(ref(dbB, `gardenEmotes/${PUB_B}`), { emote: 'not_a_real_emote', startedAt: serverTimestamp() }))
  })

  await test('item 14: forged startedAt (not server now) is denied', async () => {
    await assertFails(set(ref(dbB, `gardenEmotes/${PUB_B}`), { emote: 'wave', startedAt: 123 }))
  })

  await test('item 11/12: clearing an emote (stand/move) by the owner succeeds', async () => {
    await assertSucceeds(remove(ref(dbA, `gardenEmotes/${PUB_A}`)))
  })

  await test('cooldown: a second emote inside the 500ms window is denied', async () => {
    await seed(async (db) => set(ref(db, `gardenEmoteCooldown/${PUB_B}`), serverTimestamp()))
    await assertFails(set(ref(dbB, `gardenEmotes/${PUB_B}`), { emote: 'clap', startedAt: serverTimestamp() }))
  })

  await test('gardenEmoteCooldown: forged cooldown timestamp is denied', async () => {
    await assertFails(set(ref(dbA, `gardenEmoteCooldown/${PUB_A}`), 111))
  })

  await test('gardenEmoteCooldown: B cannot write A\'s cooldown marker', async () => {
    await assertFails(set(ref(dbB, `gardenEmoteCooldown/${PUB_A}`), serverTimestamp()))
  })

  // ---------------------------------------------------------------------------------
  // item 15 — existing Garden presence / World Chat still work (regression, rules-level).
  // ---------------------------------------------------------------------------------
  console.log('\nitem 15: existing systems unaffected')

  await test('World Chat: a valid text message from its true author succeeds', async () => {
    await assertSucceeds(
      set(ref(dbA, 'gardenChat/messages/msg_1'), {
        authorPublicId: PUB_A,
        authorCodename: 'Alice',
        authorAvatarId: 'cloud',
        kind: 'text',
        text: 'hello garden',
        createdAt: serverTimestamp(),
      }),
    )
  })

  await test('World Chat: a forged authorPublicId is denied', async () => {
    await assertFails(
      set(ref(dbB, 'gardenChat/messages/msg_2'), {
        authorPublicId: PUB_A,
        authorCodename: 'Alice',
        authorAvatarId: 'cloud',
        kind: 'text',
        text: 'pretending to be Alice',
        createdAt: serverTimestamp(),
      }),
    )
  })

  await test('gardenPresence: a fresh online goOnline-shaped write still succeeds end-to-end', async () => {
    await assertSucceeds(set(ref(dbB, `gardenPresence/${PUB_B}`), fullPresenceRecord({ publicId: PUB_B, codename: 'Bob' })))
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
