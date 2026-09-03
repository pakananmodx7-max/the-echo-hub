/**
 * Shared Firebase Admin SDK credential resolution for this repo's local, developer-only
 * scripts (scripts/exportStatsToSheets.ts, scripts/setupAdmin.ts) — never imported by the
 * student-facing app (src/**), and never bundled by Vite. Extracted so both scripts resolve
 * credentials the exact same way instead of each keeping its own copy that could silently
 * drift.
 *
 * Two supported paths, in this priority order:
 *
 *  1. FIREBASE_SERVICE_ACCOUNT_PATH env var pointing at a service-account key file on disk
 *     (e.g. for CI, or a machine without gcloud). This file is NEVER part of the repo — see
 *     .gitignore's `serviceAccountKey*.json` / `*service-account*.json` /
 *     `*-firebase-adminsdk-*.json` patterns.
 *
 *  2. Application Default Credentials (ADC) — the normal path for local development:
 *
 *       gcloud auth application-default login
 *       gcloud config set project the-echo-hub
 *
 *     After that, no key file is needed at all.
 */
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'

export const DEFAULT_PROJECT_ID = 'the-echo-hub'

export function resolveProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID
}

/** Marks an error as already having a friendly message printed — callers' own catch blocks
 * skip their generic error dump for these. */
export class FriendlyExitError extends Error {}

function printAdcHelp(projectId: string, cause: unknown): void {
  console.error('')
  console.error('✖ Could not find Google Cloud Application Default Credentials.')
  console.error('')
  console.error('  Run this once, then try again:')
  console.error('')
  console.error('    gcloud auth application-default login')
  console.error('')
  console.error(`  Then make sure gcloud/ADC is pointed at the right project (using an`)
  console.error(`  account that has Firebase Authentication Admin access on it):`)
  console.error('')
  console.error(`    gcloud config set project ${projectId}`)
  console.error('')
  console.error('  Alternative (e.g. CI): set FIREBASE_SERVICE_ACCOUNT_PATH to a service-')
  console.error('  account key file on disk instead — never commit that file to the repo.')
  console.error('')
  if (process.env.DEBUG) {
    console.error('Underlying error (DEBUG set):', cause)
  } else {
    console.error('(Set DEBUG=1 to see the underlying error.)')
  }
  console.error('')
}

/** Resolves and sanity-checks credentials BEFORE any Admin SDK call, so a missing/broken
 * ADC setup fails in a few lines instead of surfacing as a deep SDK retry stack trace.
 * Safe to call more than once per process — a second call is a no-op (getApps().length). */
export async function initAdminSdk(): Promise<void> {
  if (getApps().length > 0) return
  const projectId = resolveProjectId()

  // Auth/Firestore emulator (local testing only — never used for a real admin action):
  // the emulator needs no real credentials at all.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId })
    return
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (serviceAccountPath) {
    if (!existsSync(serviceAccountPath)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH does not exist: ${serviceAccountPath}`)
    }
    const require = createRequire(import.meta.url)
    const serviceAccount = require(serviceAccountPath)
    initializeApp({ credential: cert(serviceAccount), projectId })
    return
  }

  try {
    const credential = applicationDefault()
    await credential.getAccessToken()
    initializeApp({ credential, projectId })
  } catch (err) {
    printAdcHelp(projectId, err)
    throw new FriendlyExitError('Application Default Credentials not available.')
  }
}
