// ECHO Counselor (ครูแนะแนว) — real two-role, two-session verification, driven against the
// actual app UI (never a mock) pointed at the local Auth + Firestore emulators.
//
// Prerequisites:
//   - Firebase emulators running: auth (9099), firestore (8080)
//   - Dev server running with VITE_USE_FIREBASE_EMULATORS=true (vite dev, port 5174)
//   - The admin account's custom claim must already exist in the emulator:
//       $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
//       $env:FIREBASE_PROJECT_ID = "<same project id .env.local uses>"
//       $env:ADMIN_INITIAL_PASSWORD = "<the password this spec's ADMIN_PASSWORD below uses>"
//       npm run setup:admin
//
// Run:
//   npx playwright test --config=playwright.counselor.config.ts

import { test, expect, type Page } from '@playwright/test'

const BASE_URL = process.env.COUNSELOR_TEST_BASE_URL ?? 'http://127.0.0.1:5174'
const RUN_ID = Date.now().toString(36)
const ADMIN_USERNAME = 'admin12345'
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD ?? 'pakanan444'

async function clickIfPresent(page: Page, name: string, timeout: number) {
  try {
    await page.getByRole('button', { name }).waitFor({ state: 'visible', timeout })
    await page.getByRole('button', { name }).click()
    return true
  } catch {
    return false
  }
}

/** Signs a brand-new student account up through the real UI and lands it at /hub — the
 * exact same onboarding flow as tests/e2e/garden-v2-multiplayer.spec.ts's own helper. */
async function signUpStudent(page: Page, label: string): Promise<{ email: string; codename: string }> {
  const email = `counselor-verify-${label.toLowerCase()}-${RUN_ID}@test.local`
  const codename = `Verify${label}${RUN_ID.slice(-4)}`

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
  await clickIfPresent(page, 'ไว้ทีหลัง', 8_000) // dismiss DailyCheckinModal if shown

  return { email, codename }
}

async function loginAs(page: Page, usernameOrEmail: string, password: string) {
  await page.goto(`${BASE_URL}/#/login`)
  await page.getByLabel('Email / Username').fill(usernameOrEmail)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
}

async function logout(page: Page) {
  await page.goto(`${BASE_URL}/#/hub/me`)
  await page.getByRole('button', { name: 'ออกจากระบบ' }).click()
  // ProfilePage's own handleLogout calls navigate('/') right after signing out, but
  // RequireAuth's own reactive redirect (on the same auth-state change) commonly wins that
  // race and lands on /login instead — both are valid "signed out" landing states, so this
  // accepts either rather than asserting which one wins an unspecified pre-existing race.
  await page.waitForURL((url) => !url.href.includes('/hub') && !url.href.includes('/admin'), { timeout: 15_000 })
}

test('Counselor — full student → admin → student persistent flow', async ({ browser }) => {
  const studentCtx = await browser.newContext()
  const studentPage = await studentCtx.newPage()

  const { email: studentEmail, codename } = await test.step('Student A signs up and sends a counselor message', async () => {
    const result = await signUpStudent(studentPage, 'A')
    await studentPage.goto(`${BASE_URL}/#/hub/counselor`)
    await expect(studentPage.getByText('ครูแนะแนว', { exact: true })).toBeVisible({ timeout: 15_000 })
    await studentPage.getByPlaceholder('พิมพ์ข้อความที่อยากปรึกษา...').fill('สวัสดีค่ะ อยากปรึกษาเรื่องหนึ่ง')
    await studentPage.getByRole('button', { name: 'ส่ง' }).click()
    await expect(studentPage.getByText('สวัสดีค่ะ อยากปรึกษาเรื่องหนึ่ง')).toBeVisible({ timeout: 15_000 })
    await expect(studentPage.getByText('ส่งแล้ว ✓')).toBeVisible({ timeout: 10_000 })
    return result
  })

  await test.step('Student A logs out', async () => {
    await logout(studentPage)
  })

  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()

  await test.step('Admin logs in with admin12345 / password and is redirected straight to /admin/counselor', async () => {
    await loginAs(adminPage, ADMIN_USERNAME, ADMIN_PASSWORD)
    await adminPage.waitForURL(/\/admin\/counselor$/, { timeout: 20_000 })
    await expect(adminPage.getByText('ECHO Counselor')).toBeVisible({ timeout: 10_000 })
  })

  await test.step("Admin sees Student A's unread thread, opens it, sees the message, replies", async () => {
    await expect(adminPage.getByText(codename)).toBeVisible({ timeout: 15_000 })
    // Switching to the "ยังไม่ได้อ่าน" filter tab and finding the new thread there confirms
    // it's genuinely unread — robust even when other unread threads already exist in the
    // inbox (e.g. left over from an earlier run against the same emulator data), unlike a
    // bare text search for the label, which becomes ambiguous the moment more than one
    // thread is unread — a completely normal, expected state for a real inbox.
    await adminPage.getByRole('button', { name: 'ยังไม่ได้อ่าน' }).click()
    await expect(adminPage.getByText(codename)).toBeVisible({ timeout: 10_000 })
    await adminPage.getByText(codename).click()
    await adminPage.waitForURL(/\/admin\/counselor\/.+/, { timeout: 15_000 })
    // Scoped to the chat page's own message container — a plain page-wide getByText() can
    // transiently catch the INBOX page's still-mounting-out preview card during the React
    // Router transition (same text, different element/class), throwing a strict-mode
    // violation that has nothing to do with whether the chat page itself ever renders the
    // message; scoping to this testid make the assertion mean what it says.
    const adminMessages = adminPage.getByTestId('admin-chat-messages')
    await expect(adminMessages.getByText('สวัสดีค่ะ อยากปรึกษาเรื่องหนึ่ง')).toBeVisible({ timeout: 15_000 })
    await adminPage.getByPlaceholder('พิมพ์ข้อความตอบกลับ...').fill('ครูรับข้อความแล้วนะ เล่าเพิ่มเติมได้เลย')
    await adminPage.getByRole('button', { name: 'ส่ง' }).click()
    await expect(adminPage.getByText('ครูรับข้อความแล้วนะ เล่าเพิ่มเติมได้เลย')).toBeVisible({ timeout: 15_000 })
  })

  await test.step('Admin logs out', async () => {
    await logout(adminPage)
  })

  await test.step('Student A logs back in, sees the notification, opens counselor, sees the reply, sends another message', async () => {
    await loginAs(studentPage, studentEmail, 'VerifyPass123!')
    await studentPage.waitForURL(/\/hub($|\/)/, { timeout: 20_000 })
    await clickIfPresent(studentPage, 'ไว้ทีหลัง', 8_000)

    await expect(studentPage.getByLabel('การแจ้งเตือน')).toBeVisible({ timeout: 15_000 })
    await studentPage.getByLabel('การแจ้งเตือน').click()
    await expect(studentPage.getByText('ครูแนะแนวตอบข้อความของคุณแล้ว')).toBeVisible({ timeout: 15_000 })
    await studentPage.getByRole('button', { name: 'เข้าไปดู' }).click()

    await studentPage.waitForURL(/\/hub\/counselor$/, { timeout: 15_000 })
    await expect(studentPage.getByText('ครูรับข้อความแล้วนะ เล่าเพิ่มเติมได้เลย')).toBeVisible({ timeout: 15_000 })

    await studentPage.getByPlaceholder('พิมพ์ข้อความที่อยากปรึกษา...').fill('ขอบคุณค่ะครู มีอีกเรื่องนึงค่ะ')
    await studentPage.getByRole('button', { name: 'ส่ง' }).click()
    await expect(studentPage.getByText('ขอบคุณค่ะครู มีอีกเรื่องนึงค่ะ')).toBeVisible({ timeout: 15_000 })
  })

  await studentCtx.close()
  await adminCtx.close()
})

test('Counselor — a normal student cannot reach the admin inbox', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await signUpStudent(page, 'D')

  await page.goto(`${BASE_URL}/#/admin/counselor`)
  await page.waitForURL(/\/hub($|\/)/, { timeout: 15_000 })
  await expect(page.getByText('ECHO Counselor')).not.toBeVisible()

  await ctx.close()
})

test('Counselor — admin inbox lists two different students as separate threads', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  const { codename: codenameA } = await signUpStudent(pageA, 'E')
  const { codename: codenameB } = await signUpStudent(pageB, 'F')

  for (const [page, text] of [
    [pageA, 'หนูมีเรื่องอยากปรึกษาเรื่องเพื่อนค่ะ'],
    [pageB, 'อยากปรึกษาเรื่องการเรียนค่ะ'],
  ] as const) {
    await page.goto(`${BASE_URL}/#/hub/counselor`)
    await page.getByPlaceholder('พิมพ์ข้อความที่อยากปรึกษา...').fill(text)
    await page.getByRole('button', { name: 'ส่ง' }).click()
    await expect(page.getByText(text)).toBeVisible({ timeout: 15_000 })
  }

  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  await loginAs(adminPage, ADMIN_USERNAME, ADMIN_PASSWORD)
  await adminPage.waitForURL(/\/admin\/counselor$/, { timeout: 20_000 })

  await expect(adminPage.getByText(codenameA)).toBeVisible({ timeout: 15_000 })
  await expect(adminPage.getByText(codenameB)).toBeVisible({ timeout: 15_000 })

  await ctxA.close()
  await ctxB.close()
  await adminCtx.close()
})
