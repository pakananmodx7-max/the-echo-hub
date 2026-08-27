import { type FirebaseApp, initializeApp } from 'firebase/app'
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth'
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { type Database, connectDatabaseEmulator, getDatabase } from 'firebase/database'

/**
 * Whether real Firebase config is present. When false, the app falls back to the
 * localStorage-backed mock services (see authService.ts / presenceService.ts) so
 * `npm run dev` / `npm run build` keep working before a Firebase project is wired up.
 */
export const firebaseConfigured =
  !!import.meta.env.VITE_FIREBASE_API_KEY &&
  !!import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  !!import.meta.env.VITE_FIREBASE_DATABASE_URL

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let firestoreInstance: Firestore | null = null
let databaseInstance: Database | null = null

function ensureApp(): FirebaseApp {
  if (app) return app

  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  })

  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
  if (useEmulators) {
    const auth = getAuth(app)
    const firestore = getFirestore(app)
    const database = getDatabase(app)
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
    connectDatabaseEmulator(database, '127.0.0.1', 9000)
    authInstance = auth
    firestoreInstance = firestore
    databaseInstance = database
  }

  return app
}

export function getFirebaseAuth(): Auth {
  ensureApp()
  if (!authInstance) authInstance = getAuth(app!)
  return authInstance
}

export function getFirebaseFirestore(): Firestore {
  ensureApp()
  if (!firestoreInstance) firestoreInstance = getFirestore(app!)
  return firestoreInstance
}

export function getFirebaseDatabase(): Database {
  ensureApp()
  if (!databaseInstance) databaseInstance = getDatabase(app!)
  return databaseInstance
}
