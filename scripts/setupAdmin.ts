/**
 * One-time (and re-runnable) LOCAL script that provisions/manages the ECHO Counselor admin
 * account in Firebase Authentication, entirely via the Admin SDK — this is the ONLY place
 * the admin password is ever handled, and it is read from an environment variable at
 * runtime, NEVER written into this file, any other committed file, or the frontend bundle.
 * See the project's Counselor system report for the full security rationale.
 *
 * The admin's login "username" (admin12345) is not a real email — src/features/auth/
 * adminIdentity.ts maps it to one fixed, reserved internal Firebase Auth email
 * (imported here, not duplicated, so the frontend and this script can never resolve a
 * different account for the same username).
 *
 * Credentials for THIS script (to talk to Firebase Auth as an admin) — see
 * scripts/adminSdkAuth.ts — resolve via FIREBASE_SERVICE_ACCOUNT_PATH or, normally,
 * Application Default Credentials (`gcloud auth application-default login`).
 *
 * Usage (see the project's final report for the exact PowerShell invocations):
 *
 *   npm run setup:admin                     # ensure the account exists + admin claims set
 *   npm run setup:admin -- --reset-password # also sets/changes the password
 *   npm run setup:admin -- --verify         # read-only: prints whether admin:true is set
 *   npm run setup:admin -- --revoke         # removes admin claims + revokes refresh tokens
 *
 * ADMIN_INITIAL_PASSWORD (an env var, set only in your own shell for this one command —
 * never in a committed file) is REQUIRED when creating the account for the first time, or
 * whenever --reset-password is passed. It is never printed, logged, or written anywhere by
 * this script.
 */
import { getAuth } from 'firebase-admin/auth'
import { ADMIN_INTERNAL_EMAIL, ADMIN_USERNAME } from '../src/features/auth/adminIdentity'
import { FriendlyExitError, initAdminSdk } from './adminSdkAuth'

const ADMIN_CLAIMS = { admin: true, role: 'counselor_admin' } as const

function parseFlags(argv: string[]) {
  const set = new Set(argv)
  return {
    resetPassword: set.has('--reset-password'),
    revoke: set.has('--revoke'),
    verify: set.has('--verify'),
  }
}

async function main() {
  const { resetPassword, revoke, verify } = parseFlags(process.argv.slice(2))
  await initAdminSdk()
  const auth = getAuth()

  console.log(`[setup:admin] username: ${ADMIN_USERNAME}`)
  console.log(`[setup:admin] internal Firebase Auth email: ${ADMIN_INTERNAL_EMAIL}`)

  if (verify) {
    try {
      const user = await auth.getUserByEmail(ADMIN_INTERNAL_EMAIL)
      console.log(`[setup:admin] account exists — uid: ${user.uid}`)
      console.log(`[setup:admin] current custom claims: ${JSON.stringify(user.customClaims ?? {})}`)
      const isAdmin = user.customClaims?.admin === true
      console.log(isAdmin ? '[setup:admin] ✓ admin claim IS set' : '[setup:admin] ✗ admin claim is NOT set')
    } catch (err) {
      if (isUserNotFound(err)) {
        console.log('[setup:admin] no account exists yet for this email.')
      } else {
        throw err
      }
    }
    return
  }

  let uid: string
  try {
    const existing = await auth.getUserByEmail(ADMIN_INTERNAL_EMAIL)
    uid = existing.uid
    console.log(`[setup:admin] found existing account — uid: ${uid}`)
  } catch (err) {
    if (!isUserNotFound(err)) throw err
    if (revoke) {
      console.log('[setup:admin] no account exists — nothing to revoke.')
      return
    }
    const password = requirePassword('create a new admin account')
    const created = await auth.createUser({ email: ADMIN_INTERNAL_EMAIL, password, emailVerified: true })
    uid = created.uid
    console.log(`[setup:admin] created new account — uid: ${uid}`)
  }

  if (revoke) {
    await auth.setCustomUserClaims(uid, {})
    await auth.revokeRefreshTokens(uid)
    console.log('[setup:admin] admin custom claims removed and existing sessions revoked.')
    console.log('[setup:admin] the account still exists (not deleted) — re-run without --revoke to restore admin access.')
    return
  }

  if (resetPassword) {
    const password = requirePassword('reset the admin password')
    await auth.updateUser(uid, { password })
    console.log('[setup:admin] password updated. (never printed/logged — see Firebase Authentication for the account.)')
  }

  await auth.setCustomUserClaims(uid, ADMIN_CLAIMS)
  console.log(`[setup:admin] custom claims set: ${JSON.stringify(ADMIN_CLAIMS)}`)
  console.log('[setup:admin] done. The admin can now log in with the app\'s normal login form using:')
  console.log(`[setup:admin]   Username: ${ADMIN_USERNAME}`)
  console.log('[setup:admin]   Password: (whatever ADMIN_INITIAL_PASSWORD was set to for this run)')
}

function requirePassword(action: string): string {
  const password = process.env.ADMIN_INITIAL_PASSWORD
  if (!password || password.length < 6) {
    console.error('')
    console.error(`✖ ADMIN_INITIAL_PASSWORD must be set (6+ characters) to ${action}.`)
    console.error('')
    console.error('  Set it for this one command only, e.g. in PowerShell:')
    console.error('')
    console.error('    $env:ADMIN_INITIAL_PASSWORD = "your-chosen-password"')
    console.error('    npm run setup:admin')
    console.error('')
    throw new FriendlyExitError('ADMIN_INITIAL_PASSWORD not set.')
  }
  return password
}

function isUserNotFound(err: unknown): boolean {
  return (err as { code?: string } | undefined)?.code === 'auth/user-not-found'
}

main().catch((err) => {
  if (err instanceof FriendlyExitError) {
    process.exit(1)
  }
  console.error('[setup:admin] failed:', err)
  process.exit(1)
})
