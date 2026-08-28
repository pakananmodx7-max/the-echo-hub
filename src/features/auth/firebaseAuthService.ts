import {
  createUserWithEmailAndPassword,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { Timestamp, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseFirestore } from '../../lib/firebase'
import type { AuthUser } from '../../types'
import type { AuthService } from './authService'

interface UserDoc {
  publicId: string
  codename: string | null
  avatarId: string | null
  mood: AuthUser['mood']
  onboardingComplete: boolean
  completedActivityIds: string[]
  createdAt: string
  /** Timestamp on read, serverTimestamp() FieldValue on write — see updateUser. */
  moodUpdatedAt?: unknown
  totalPoints?: number
  currentStreak?: number
  bestStreak?: number
  lastCheckinDate?: string | null
}

function randomPublicId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `pub-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toAuthUser(fbUser: FirebaseUser, docData: UserDoc): AuthUser {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    publicId: docData.publicId,
    codename: docData.codename,
    avatarId: docData.avatarId,
    mood: docData.mood,
    // Defaults guard against an existing production users/{uid} doc that predates a field
    // (e.g. completedActivityIds added after some accounts were already created) — without
    // this, `.length`/`.includes()` call sites throughout the app would crash outright on
    // an unexpectedly undefined value instead of just treating it as "not set yet".
    onboardingComplete: docData.onboardingComplete ?? false,
    completedActivityIds: docData.completedActivityIds ?? [],
    createdAt: docData.createdAt,
    moodUpdatedAt: docData.moodUpdatedAt instanceof Timestamp ? docData.moodUpdatedAt.toDate().toISOString() : null,
    totalPoints: docData.totalPoints ?? 0,
    currentStreak: docData.currentStreak ?? 0,
    bestStreak: docData.bestStreak ?? 0,
    lastCheckinDate: docData.lastCheckinDate ?? null,
  }
}

/** Thai-language error messages matching the mock service's existing tone/style. */
function mapAuthError(err: unknown): Error {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/email-already-in-use':
      return new Error('อีเมลนี้ถูกใช้งานแล้ว ลองเข้าสู่ระบบแทน')
    case 'auth/invalid-email':
      return new Error('รูปแบบอีเมลไม่ถูกต้อง')
    case 'auth/weak-password':
      return new Error('รหัสผ่านอย่างน้อย 6 ตัวอักษร')
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    case 'auth/too-many-requests':
      return new Error('ลองผิดหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง')
    case 'auth/network-request-failed':
      return new Error('เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่')
    default:
      return new Error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
  }
}

async function createUserDoc(uid: string): Promise<UserDoc> {
  const docData: UserDoc = {
    publicId: randomPublicId(),
    codename: null,
    avatarId: null,
    mood: null,
    onboardingComplete: false,
    completedActivityIds: [],
    createdAt: new Date().toISOString(),
    totalPoints: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastCheckinDate: null,
  }
  await setDoc(doc(getFirebaseFirestore(), 'users', uid), docData)
  return docData
}

/** Mirrors only the public-safe fields into publicProfiles/{publicId} — never email or uid. */
async function syncPublicProfile(publicId: string, patch: Partial<Pick<UserDoc, 'codename' | 'avatarId' | 'mood'>>) {
  if (Object.keys(patch).length === 0) return
  await setDoc(
    doc(getFirebaseFirestore(), 'publicProfiles', publicId),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export class FirebaseAuthService implements AuthService {
  private cachedUser: AuthUser | null = null
  private cachedPublicId: string | null = null

  getCurrentUser(): AuthUser | null {
    return this.cachedUser
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    const auth = getFirebaseAuth()
    let unsubDoc: (() => void) | null = null

    const unsubAuth = onFirebaseAuthStateChanged(auth, (fbUser) => {
      if (unsubDoc) {
        unsubDoc()
        unsubDoc = null
      }
      if (!fbUser) {
        this.cachedUser = null
        this.cachedPublicId = null
        callback(null)
        return
      }
      unsubDoc = onSnapshot(doc(getFirebaseFirestore(), 'users', fbUser.uid), (snap) => {
        if (!snap.exists()) {
          this.cachedUser = null
          callback(null)
          return
        }
        const docData = snap.data() as UserDoc
        this.cachedPublicId = docData.publicId
        const user = toAuthUser(fbUser, docData)
        this.cachedUser = user
        callback(user)
      })
    })

    return () => {
      unsubAuth()
      if (unsubDoc) unsubDoc()
    }
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase()
    if (!normalized || !password || password.length < 6) {
      throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสผ่านอย่างน้อย 6 ตัวอักษร)')
    }
    try {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), normalized, password)
      const docData = await createUserDoc(cred.user.uid)
      this.cachedPublicId = docData.publicId
      const user = toAuthUser(cred.user, docData)
      this.cachedUser = user
      return user
    } catch (err) {
      throw mapAuthError(err)
    }
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase()
    if (!normalized || !password) {
      throw new Error('กรอกอีเมลและรหัสผ่านให้ครบถ้วน')
    }
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), normalized, password)
      const userRef = doc(getFirebaseFirestore(), 'users', cred.user.uid)
      let snap = await getDoc(userRef)
      const docData = snap.exists() ? (snap.data() as UserDoc) : await createUserDoc(cred.user.uid)
      this.cachedPublicId = docData.publicId
      const user = toAuthUser(cred.user, docData)
      this.cachedUser = user
      return user
    } catch (err) {
      throw mapAuthError(err)
    }
  }

  async resetPassword(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      throw new Error('กรุณากรอกอีเมล')
    }
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), normalized)
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      // Never reveal whether an account exists for this address — a nonexistent email
      // resolves exactly like a real send. (Firebase projects with email enumeration
      // protection enabled already do this server-side; this guards the same behavior
      // client-side regardless of that project setting.)
      if (code === 'auth/user-not-found') return
      throw mapAuthError(err)
    }
  }

  async logout(): Promise<void> {
    await signOut(getFirebaseAuth())
  }

  async updateUser(patch: Partial<AuthUser>): Promise<AuthUser> {
    const fbUser = getFirebaseAuth().currentUser
    if (!fbUser || !this.cachedUser) throw new Error('ยังไม่ได้เข้าสู่ระบบ')

    const docPatch: Partial<UserDoc> = {}
    if ('codename' in patch) docPatch.codename = patch.codename ?? null
    if ('avatarId' in patch) docPatch.avatarId = patch.avatarId ?? null
    if ('mood' in patch) {
      docPatch.mood = patch.mood ?? null
      // Stamped from any mood change — the daily check-in AND a manual Profile edit both
      // go through this same path, so both keep this timestamp accurate.
      docPatch.moodUpdatedAt = serverTimestamp()
    }
    if ('onboardingComplete' in patch) docPatch.onboardingComplete = !!patch.onboardingComplete
    if ('completedActivityIds' in patch) docPatch.completedActivityIds = patch.completedActivityIds ?? []

    await updateDoc(doc(getFirebaseFirestore(), 'users', fbUser.uid), docPatch)

    const publicPatch: Partial<Pick<UserDoc, 'codename' | 'avatarId' | 'mood'>> = {}
    if ('codename' in docPatch) publicPatch.codename = docPatch.codename
    if ('avatarId' in docPatch) publicPatch.avatarId = docPatch.avatarId
    if ('mood' in docPatch) publicPatch.mood = docPatch.mood
    if (this.cachedPublicId) await syncPublicProfile(this.cachedPublicId, publicPatch)

    const updated: AuthUser = { ...this.cachedUser, ...patch }
    this.cachedUser = updated
    return updated
  }

  async markActivityComplete(activityId: string): Promise<AuthUser> {
    if (!this.cachedUser) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
    const set = new Set(this.cachedUser.completedActivityIds)
    set.add(activityId)
    return this.updateUser({ completedActivityIds: Array.from(set) })
  }

  resetDemoData(): void {
    // Real accounts/data must not be wiped from the client. Closest safe equivalent
    // to the mock's "clear everything and start over" is just ending the session.
    void signOut(getFirebaseAuth())
  }
}
