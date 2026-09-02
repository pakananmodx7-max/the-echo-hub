// ECHO ธรรมอุทยาน retheme — single-browser verification driven against the actual app UI
// (not a mock), pointed at the local Auth + Firestore + Database emulators. Reuses the same
// real-signup-through-the-UI pattern established in garden-v2-multiplayer.spec.ts.
//
// Covers what a real click can exercise without a 3D-scene test hook (no deterministic way
// to click a specific in-world sign/bell mesh — same limitation documented in
// garden-v2-multiplayer.spec.ts): the Mindfulness Bell flow (reachable via the Activities
// modal's "🔔 ระฆังแห่งสติ" button, not just 3D proximity), its Journal hand-off, and mobile
// viewport layout at 320px/390px. Physical sign readability / passive zone overlays / Tree
// of Goodness require actually walking the 3D world and are NOT covered here — see the
// final report's honest disclosure of what was and wasn't verified this way.
//
// Prerequisites: Firebase emulators (auth 9099, firestore 8080, database 9000) running for
// project id matching VITE_FIREBASE_PROJECT_ID in .env, and the Vite dev server running with
// VITE_USE_FIREBASE_EMULATORS=true.
//
// Run:
//   npx playwright test tests/e2e/garden-dhamma-verify.spec.ts --config=playwright.garden.config.ts

import { test, expect, type Page, type Locator } from '@playwright/test'
import { initializeApp, deleteApp, type App, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const FIREBASE_PROJECT_ID = process.env.GARDEN_TEST_PROJECT_ID ?? 'the-echo-hub'
const BASE_URL = process.env.GARDEN_TEST_BASE_URL ?? 'http://127.0.0.1:5173'
const RUN_ID = Date.now().toString(36)

let adminApp: App

test.beforeAll(() => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  adminApp = initializeApp({ projectId: FIREBASE_PROJECT_ID }, `garden-dhamma-verify-${RUN_ID}`)
})

test.afterAll(async () => {
  await deleteApp(adminApp)
})

async function signUpAndEnterGarden(page: Page): Promise<{ codename: string; email: string }> {
  const email = `garden-dhamma-${RUN_ID}@test.local`
  const codename = `Dhamma${RUN_ID.slice(-4)}`

  await page.goto(`${BASE_URL}/#/register`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('VerifyPass123!')
  await page.getByLabel('Confirm Password').fill('VerifyPass123!')
  await page.getByRole('button', { name: 'สร้างบัญชี' }).click()

  await page.getByLabel('Code Name').fill(codename)
  await page.getByRole('button', { name: 'ใช้ชื่อนี้ →' }).click()

  await page.getByRole('heading', { name: 'วันนี้คุณรู้สึกเป็นอย่างไร?' }).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'วันนี้ดีนะ' }).click()
  await page.getByRole('button', { name: 'เข้าสู่ THE ECHO →' }).click()
  await page.waitForURL(/\/hub($|\/)/, { timeout: 45_000 })

  const clickIfPresent = async (locator: Locator, timeout: number) => {
    try {
      await locator.waitFor({ state: 'visible', timeout })
      await locator.click()
      return true
    } catch {
      return false
    }
  }
  const dismissDailyCheckin = () => clickIfPresent(page.getByRole('button', { name: 'ไว้ทีหลัง' }), 8_000)
  await dismissDailyCheckin()

  await page.goto(`${BASE_URL}/#/hub/garden`)
  await dismissDailyCheckin()
  await clickIfPresent(page.getByRole('button', { name: /พร้อมแล้ว.*เข้าสวน/ }), 25_000)
  await expect(page.getByText(/มี\s*\d+\s*คนอยู่ในสวน/)).toBeVisible({ timeout: 30_000 })

  return { codename, email }
}

async function findUid(email: string): Promise<string> {
  const res = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:query`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: [email] }) },
  )
  const data = (await res.json()) as { userInfo?: { localId: string; email: string }[] }
  const match = data.userInfo?.find((u) => u.email === email)
  if (!match) throw new Error(`could not find uid for ${email}`)
  return match.localId
}

test.describe('ECHO ธรรมอุทยาน — Mindfulness Bell + Journal hand-off', () => {
  test('ringing the bell shows a reflection, grants +3 once, and offers it to the Journal without overwriting', async ({
    page,
  }) => {
    const { email } = await signUpAndEnterGarden(page)
    const uid = await findUid(email)

    await test.step('open the Mindfulness Bell via the Activities modal (no 3D positioning needed)', async () => {
      await page.getByRole('button', { name: 'Activities' }).click()
      await page.getByRole('button', { name: '🔔 ระฆังแห่งสติ' }).click()
      await expect(page.getByRole('heading', { name: 'ระฆังแห่งสติ' })).toBeVisible({ timeout: 10_000 })
      // A reflection is shown immediately, no click required to reveal it.
      await expect(page.getByText('🔔 ข้อคิดประจำวันนี้')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('button', { name: '📔 เก็บไว้ใน Journal' })).toBeVisible()
      await expect(page.getByRole('button', { name: '🌿 รับข้อคิดนี้' })).toBeVisible()
    })

    const db = getFirestore(adminApp)
    const rewardsCol = db.collection(`users/${uid}/rewards`)

    await test.step('the +3 reward actually lands in the reward ledger (Firestore, not just the client)', async () => {
      await expect
        .poll(
          async () => {
            const snap = await rewardsCol.where('type', '==', 'mindfulness_bell').get()
            return snap.empty ? null : (snap.docs[0].data() as { points: number }).points
          },
          { timeout: 15_000 },
        )
        .toBe(3)
    })

    let quoteText = ''
    await test.step('save the quote text, then close and re-ring the bell the same day', async () => {
      quoteText = (await page.locator('p.whitespace-pre-line').textContent()) ?? ''
      expect(quoteText.length).toBeGreaterThan(0)
      await page.getByRole('button', { name: '🌿 รับข้อคิดนี้' }).click()

      // Re-open — same-day ring shows a reflection again but must NOT grant a second reward.
      await page.getByRole('button', { name: 'Activities' }).click()
      await page.getByRole('button', { name: '🔔 ระฆังแห่งสติ' }).click()
      await expect(page.getByText('🔔 ข้อคิดประจำวันนี้')).toBeVisible({ timeout: 10_000 })
    })

    await test.step('no duplicate reward was granted for the second same-day ring', async () => {
      // Give any (incorrect) second write a real window to land before asserting it didn't.
      await page.waitForTimeout(2500)
      const snap = await db.collection(`users/${uid}/rewards`).where('type', '==', 'mindfulness_bell').get()
      expect(snap.size).toBe(1)
    })

    await test.step('"เก็บไว้ใน Journal" opens Daily Journal with the reflection offered, not auto-inserted', async () => {
      await page.getByRole('button', { name: '📔 เก็บไว้ใน Journal' }).click()
      await page.waitForURL(/daily-journal/, { timeout: 10_000 })
      const textarea = page.locator('textarea')
      // The suggestion is a dismissible chip, not written into the textarea by itself.
      await expect(textarea).toHaveValue('')
      const insertButton = page.getByRole('button', { name: '➕ ใส่ในบันทึก' })
      await expect(insertButton).toBeVisible({ timeout: 10_000 })
      await insertButton.click()
      await expect(textarea).toHaveValue(new RegExp(quoteText.split('\n')[0].slice(0, 8)))
    })
  })
})

test.describe('ECHO ธรรมอุทยาน — mobile viewport (320px / 390px)', () => {
  for (const width of [390, 320]) {
    test(`Garden layout has no horizontal overflow and HUD stays usable at ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 844 } })
      const page = await context.newPage()
      await signUpAndEnterGarden(page)

      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), {
          timeout: 10_000,
        })
        .toBe(true)

      // Bottom HUD nav row (Activities/Online/Settings/etc.) must stay reachable, not covered
      // by any quote overlay.
      await expect(page.getByRole('button', { name: 'Activities' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Activities' })).toBeInViewport()

      // The Mindfulness Bell must be reachable and tappable at this width too.
      await page.getByRole('button', { name: 'Activities' }).click()
      await expect(page.getByRole('button', { name: '🔔 ระฆังแห่งสติ' })).toBeVisible()
      await expect(page.getByRole('button', { name: '🔔 ระฆังแห่งสติ' })).toBeInViewport()

      await context.close()
    })
  }
})
