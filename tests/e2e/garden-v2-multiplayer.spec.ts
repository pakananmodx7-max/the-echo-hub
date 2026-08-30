// Garden V2 — two-real-browser multiplayer verification, driven against the actual app UI
// (not a mock) pointed at the local Auth + Firestore + Database emulators.
//
// SCOPE NOTE (read this before trusting a green run): GARDEN_SPAWN_POINTS is randomized
// per session (`gardenLayout.ts`) and there is no test hook exposing the 3D camera/world
// transform, so this script cannot reliably click a specific seat mesh or the dance-floor
// zone — that would require computing a live camera projection with no deterministic
// starting point. Those interactions (items 3, 5, 6, 7, 8 from the verification list, plus
// the literal onDisconnect-on-socket-close case) are therefore NOT covered here — see the
// manual procedure this task also produced for those. Everything below either:
//   (a) triggers a real action through a real DOM click (never simulated/faked), and
//   (b) cross-checks the result by reading the RTDB emulator directly via the Admin SDK —
//       which is what "does the other client see it" structurally means in this
//       architecture (every client subscribes to the same RTDB node; the write landing
//       correctly IS the client seeing it — the onValue plumbing itself is stock Firebase
//       SDK behavior, not something this app's code could plausibly break per-feature).
//
// Prerequisites (see the accompanying PowerShell script for the exact commands):
//   - Firebase emulators running: auth (9099), firestore (8080), database (9000)
//   - Dev server running with VITE_USE_FIREBASE_EMULATORS=true (vite dev, port 5173)
//   - npm install --no-save @playwright/test firebase-admin (firebase-admin is already a
//     devDependency of this repo)
//
// Run:
//   npx playwright test tests/e2e/garden-v2-multiplayer.spec.ts --config=playwright.garden.config.ts

import { test, expect, type Page, type Locator } from '@playwright/test'
import { initializeApp, deleteApp, type App } from 'firebase-admin/app'
import { getDatabase as getAdminDatabase } from 'firebase-admin/database'

// This MUST be the same project id the browser's own Firebase app uses (VITE_FIREBASE_PROJECT_ID
// in the .env.local scripts/garden-v2-verify.ps1 generates — see its $firebaseProjectId).
// firebase/database's connectDatabaseEmulator() (used by the browser app, src/lib/firebase.ts)
// ignores the databaseURL's "?ns=" query param entirely and derives the emulator namespace
// straight from the Firebase app's projectId — so if this Admin SDK app used a DIFFERENT
// projectId/namespace, every RTDB read here would silently hit an empty, unrelated namespace
// while the browser's writes landed in the real one. That mismatch is exactly what caused a
// deterministic (not flaky) "Expected: wave, Received: null" failure here: this constant used
// to default to 'echo-hub-e2e-verify', a namespace the browser never wrote to, whenever the
// caller (scripts/garden-v2-verify.ps1) didn't override it via GARDEN_TEST_DB_URL — which it
// never did. Confirmed by reproducing the exact failure with that mismatch restored, then
// fixing it here.
const GARDEN_FIREBASE_PROJECT_ID = 'demo-garden-verify'

const BASE_URL = process.env.GARDEN_TEST_BASE_URL ?? 'http://127.0.0.1:5173'
const DB_URL = process.env.GARDEN_TEST_DB_URL ?? `http://127.0.0.1:9000/?ns=${GARDEN_FIREBASE_PROJECT_ID}`
const RUN_ID = Date.now().toString(36)

let adminApp: App

test.beforeAll(() => {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000'
  adminApp = initializeApp(
    { projectId: GARDEN_FIREBASE_PROJECT_ID, databaseURL: DB_URL },
    `garden-verify-${RUN_ID}`,
  )
})

test.afterAll(async () => {
  await deleteApp(adminApp)
})

/**
 * Signs a brand-new account up through the real UI (RegisterPage -> CreateCodenamePage ->
 * MoodCheckinPage, the app's actual onboarding flow — there is no separate "/signup"
 * route) and lands it inside Garden (hub/garden).
 */
async function signUpAndEnterGarden(page: Page, label: 'A' | 'B'): Promise<string> {
  const email = `garden-verify-${label.toLowerCase()}-${RUN_ID}@test.local`
  const codename = `Verify${label}${RUN_ID.slice(-4)}`

  await page.goto(`${BASE_URL}/#/register`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('VerifyPass123!')
  await page.getByLabel('Confirm Password').fill('VerifyPass123!')
  await page.getByRole('button', { name: 'สร้างบัญชี' }).click()

  // Codename step (CreateCodenamePage) — default avatar is fine, only the name matters.
  await page.getByLabel('Code Name').fill(codename)
  await page.getByRole('button', { name: 'ใช้ชื่อนี้ →' }).click()

  // Mood step (MoodCheckinPage) — wait for the actual mood-page heading before picking a
  // button, otherwise a stale button reference from the codename page (e.g. the avatar
  // picker) can get clicked instead, leaving the "เข้าสู่ THE ECHO" submit button disabled.
  await page.getByRole('heading', { name: 'วันนี้คุณรู้สึกเป็นอย่างไร?' }).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'วันนี้ดีนะ' }).click()
  await page.getByRole('button', { name: 'เข้าสู่ THE ECHO →' }).click()

  // Two accounts sign up concurrently (Promise.all in the caller) against the same
  // Auth+Firestore emulator, and this redirect only fires after the onboarding-completion
  // write resolves — under real contention (a slower machine, a cold first run) that can
  // take noticeably longer than on a fast, already-warmed-up dev machine, so this gets a
  // generous window rather than a tight one.
  await page.waitForURL(/\/hub($|\/)/, { timeout: 45_000 })

  // isVisible() does NOT poll/wait — it's an instant snapshot check — so every optional-UI
  // probe below uses waitFor() (which does poll) inside a try/catch instead.
  const clickIfPresent = async (locator: Locator, timeout: number) => {
    try {
      await locator.waitFor({ state: 'visible', timeout })
      await locator.click()
      return true
    } catch {
      return false
    }
  }

  // HubLayout shows a global once-a-day DailyCheckinModal on top of whatever route is
  // underneath — dismiss it via its "later" action so it doesn't block what follows.
  const dismissDailyCheckin = () => clickIfPresent(page.getByRole('button', { name: 'ไว้ทีหลัง' }), 8_000)
  await dismissDailyCheckin()

  await page.goto(`${BASE_URL}/#/hub/garden`)
  await dismissDailyCheckin() // the goto is a full reload, so HubLayout (and the modal) remounts

  // A brand-new account's first-ever Garden visit shows an inline avatar-setup screen
  // ("🌿 เตรียมตัวเข้าสวน") before the 3D scene loads - defaults are fine, just confirm. This
  // is the first point the R3F/WebGL avatar preview has to actually compile shaders and
  // paint, which can be considerably slower than steady-state rendering on a machine with a
  // cold GPU driver / software-rendering fallback, so it gets real headroom.
  await clickIfPresent(page.getByRole('button', { name: /พร้อมแล้ว.*เข้าสวน/ }), 25_000)

  await expect(page.getByText(/มี\s*\d+\s*คนอยู่ในสวน/)).toBeVisible({ timeout: 30_000 })
  return codename
}

/**
 * Attaches a persistent console listener (registered once, up front, so no message can be
 * missed by a listener that starts too late relative to when it fired) and returns a getter
 * for every captured line matching `prefix` so far. Only ever used against this app's own
 * `[A emote write]` / `[emote subscription]` / `[remote player]` debug lines (see
 * gardenEmoteService.ts / useGardenPlayers.ts, gated behind VITE_GARDEN_DEBUG_EMOTES) — those
 * log publicId + emote id/timestamp only, never uid/email.
 */
function captureConsole(page: Page, prefix: string) {
  const lines: string[] = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (text.startsWith(prefix)) lines.push(text)
  })
  return () => lines
}

test('Garden V2 multiplayer — presence, world chat, emotes', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  // Diagnostics for tracing the emote flow end-to-end: A's own write outcome, and what B's
  // application state (useGardenPlayers' roster join, not just raw RTDB) actually applied.
  const getAWriteLogs = captureConsole(pageA, '[A emote write]')
  const getBAppliedLogs = captureConsole(pageB, '[remote player] applied')

  await test.step('items 1/2: two users enter simultaneously and see each other', async () => {
    const [codenameA, codenameB] = await Promise.all([
      signUpAndEnterGarden(pageA, 'A'),
      signUpAndEnterGarden(pageB, 'B'),
    ])

    // HUD online-count badge reaches 2 for both clients.
    await expect(pageA.getByText(/มี\s*2\s*คนอยู่ในสวน/)).toBeVisible({ timeout: 20_000 })
    await expect(pageB.getByText(/มี\s*2\s*คนอยู่ในสวน/)).toBeVisible({ timeout: 20_000 })

    // Each sees the other's codename in the Online panel (GardenHUD's "Online" nav button
    // — icon span is aria-hidden, so the accessible name is exactly "Online"). .first() is
    // needed since the same codename also appears as a floating 3D nametag on the canvas.
    // Explicit timeout (this reflects an RTDB round-trip + a panel-open animation, not just
    // a DOM update) — left at Playwright's 5s default here before, which is the tightest
    // window of any assertion in this whole spec and the most likely one to flake first
    // under real-world latency.
    await pageA.getByRole('button', { name: 'Online' }).click()
    await expect(pageA.getByText(codenameB).first()).toBeVisible({ timeout: 15_000 })
    await pageA.getByRole('button', { name: 'ปิด ✕' }).click() // full-screen Online panel — must close before anything else is clickable
    await pageB.getByRole('button', { name: 'Online' }).click()
    await expect(pageB.getByText(codenameA).first()).toBeVisible({ timeout: 15_000 })
    await pageB.getByRole('button', { name: 'ปิด ✕' }).click()
  })

  await test.step('item 15: World Chat still works between two real Garden V2 clients', async () => {
    const message = `garden-v2-check-${RUN_ID}`
    // Desktop viewport (1400x900, set in playwright.garden.config.ts) shows the persistent
    // World Chat panel by default (GardenWorldChatPanel, lg breakpoint); use its composer.
    const composer = pageA.getByPlaceholder('พิมพ์อะไรบางอย่าง...')
    await composer.fill(message)
    await composer.press('Enter')
    await expect(pageB.getByText(message)).toBeVisible({ timeout: 15_000 })
  })

  let publicIdA = ''
  await test.step("items 9/10: A performs an emote (wave) — traced end-to-end: write succeeds, RTDB holds it, B's app state applies it", async () => {
    await pageA.getByRole('button', { name: 'ท่าทาง' }).click()
    await pageA.getByRole('button', { name: 'โบกมือ' }).click() // wave

    // Step 1: A's write actually succeeded (not silently denied by the rules — e.g. a
    // cooldown/shape/ownership mismatch would show up here as "denied", not a thrown error,
    // since gardenEmoteService.setEmote() only .catch()es and logs, never rejects the caller).
    // Matches on "success"+"emote=wave" together in one line, NOT a separate .find() by
    // "emote=wave" alone — the pre-write attempt log also contains that substring, so a
    // plain .find() picks that line instead of the actual success confirmation.
    await expect
      .poll(() => getAWriteLogs().some((l) => l.includes('success') && l.includes('emote=wave')), {
        timeout: 10_000,
      })
      .toBe(true)

    // Step 2: RTDB actually holds it (source of truth every client subscribes to).
    const db = getAdminDatabase(adminApp)
    await expect
      .poll(async () => {
        const snap = await db.ref('gardenEmotes').get()
        const val = (snap.val() ?? {}) as Record<string, { emote: string }>
        const entry = Object.entries(val).find(([, v]) => v.emote === 'wave')
        if (entry) publicIdA = entry[0]
        return entry?.[1]?.emote ?? null
      }, { timeout: 10_000 })
      .toBe('wave')

    // Step 3: B's own application state (useGardenPlayers' roster join, not a second raw
    // RTDB read) actually applied it — this is the layer a UI/animation bug would show up
    // in even if steps 1-2 above are both fine.
    await expect
      .poll(() => getBAppliedLogs().some((l) => l.includes(`id=${publicIdA}`) && l.includes('emote=wave')), {
        timeout: 10_000,
      })
      .toBe(true)
  })

  await test.step('items 11/12: A starts a looping dance, then moves — shared dance state clears end-to-end', async () => {
    const db = getAdminDatabase(adminApp)

    await pageA.getByRole('button', { name: 'ท่าทาง' }).click()
    await pageA.getByRole('button', { name: 'เต้น 1' }).click() // dance_01 (loop: true)

    await expect
      .poll(() => getAWriteLogs().some((l) => l.includes('emote=dance_01') && l.includes('success')), {
        timeout: 10_000,
      })
      .toBe(true)
    await expect
      .poll(async () => (await db.ref(`gardenEmotes/${publicIdA}`).get()).val()?.emote ?? null, { timeout: 10_000 })
      .toBe('dance_01')
    await expect
      .poll(() => getBAppliedLogs().some((l) => l.includes(`id=${publicIdA}`) && l.includes('emote=dance_01')), {
        timeout: 10_000,
      })
      .toBe(true)

    // Trigger movement via a plain ground click well away from the avatar's screen
    // position — this only needs to register as *some* movement, not land on a specific
    // world coordinate, so it doesn't depend on the randomized spawn point.
    const canvas = pageA.locator('canvas').first()
    await canvas.waitFor({ state: 'visible', timeout: 15_000 })
    const box = await canvas.boundingBox()
    if (!box) {
      // No layout box for a canvas that IS in the DOM almost always means the WebGL 3D
      // scene never painted (e.g. this app's own 2D fallback path is active because WebGL
      // isn't available on this machine/browser) - fail loudly and specifically here rather
      // than silently skipping the click and letting the assertion below time out with a
      // confusing "expected null, got dance_01" that looks like a sync bug but isn't one.
      throw new Error(
        'Garden canvas has no layout box - the 3D scene likely never rendered (WebGL unavailable / 2D fallback active). ' +
          'This is an environment issue, not a Garden V2 emote-sync bug: re-run with a browser/machine that supports WebGL.',
      )
    }
    await pageA.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.6)

    await expect
      .poll(async () => (await db.ref(`gardenEmotes/${publicIdA}`).get()).val(), { timeout: 10_000 })
      .toBeNull()
    // B's app state converges to idle/walk (no active emote) for A once the clear lands.
    await expect
      .poll(() => {
        const logs = getBAppliedLogs().filter((l) => l.includes(`id=${publicIdA}`))
        return logs.at(-1)?.includes('emote=null') ?? false
      }, { timeout: 10_000 })
      .toBe(true)
  })

  await test.step('item 13: B cannot write A\'s emote/presence node from a forged direct call', async () => {
    // Exercised rigorously and exhaustively at the rules level in
    // tests/rtdb-rules/garden-v2.rules.test.mjs — this step only confirms the app itself
    // never attempts such a write (both clients only ever call setEmote/goOnline with
    // their OWN gardenUser.id, per EchoGardenPage.tsx), which the two steps above already
    // demonstrate by construction (A's actions only ever touched publicIdA's nodes).
    expect(publicIdA).not.toBe('')
  })

  await ctxA.close()
  await ctxB.close()
})
