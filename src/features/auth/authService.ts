import { firebaseConfigured } from '../../lib/firebase'
import { FirebaseAuthService } from './firebaseAuthService'
import type { AuthUser, MoodId } from '../../types'

/**
 * Interface-first design: swap `LocalAuthService` for a `FirebaseAuthService`
 * implementation later without touching any consuming component.
 */
export interface AuthService {
  getCurrentUser(): AuthUser | null
  /**
   * Fires immediately with the current user (or null), then again whenever it changes.
   * Firebase's auth state resolves asynchronously, so consumers must use this instead of
   * assuming `getCurrentUser()` is authoritative on first render. Returns an unsubscribe fn.
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void
  register(email: string, password: string): Promise<AuthUser>
  login(email: string, password: string): Promise<AuthUser>
  /** Sends a password-reset email. Must never reveal whether the address has an account. */
  resetPassword(email: string): Promise<void>
  logout(): Promise<void>
  updateUser(patch: Partial<AuthUser>): Promise<AuthUser>
  markActivityComplete(activityId: string): Promise<AuthUser>
  resetDemoData(): void
}

interface StoredAccount {
  password: string
  user: AuthUser
}

const USERS_KEY = 'echoHub.demo.users'
const SESSION_KEY = 'echoHub.demo.sessionEmail'

function readUsers(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, StoredAccount>) : {}
  } catch {
    return {}
  }
}

function writeUsers(users: Record<string, StoredAccount>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function makeId() {
  return `demo-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

class LocalAuthService implements AuthService {
  getCurrentUser(): AuthUser | null {
    const email = localStorage.getItem(SESSION_KEY)
    if (!email) return null
    const users = readUsers()
    return users[email]?.user ?? null
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    // localStorage is synchronous and single-tab in practice for this demo, so just
    // report the current state once — there's no external session change to listen for.
    callback(this.getCurrentUser())
    return () => {}
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase()
    if (!normalized || !password || password.length < 6) {
      throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสผ่านอย่างน้อย 6 ตัวอักษร)')
    }
    const users = readUsers()
    const user: AuthUser = {
      id: makeId(),
      email: normalized,
      publicId: null,
      codename: null,
      avatarId: null,
      mood: null,
      onboardingComplete: false,
      completedActivityIds: [],
      createdAt: new Date().toISOString(),
      moodUpdatedAt: null,
      totalPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastCheckinDate: null,
      // Mock/local-auth mode has no Firebase project, so no Firebase Auth custom claims
      // exist at all — always false here; only FirebaseAuthService can ever resolve true.
      isAdmin: false,
    }
    users[normalized] = { password, user }
    writeUsers(users)
    localStorage.setItem(SESSION_KEY, normalized)
    return user
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase()
    if (!normalized || !password || password.length < 6) {
      throw new Error('กรอกอีเมลและรหัสผ่าน (อย่างน้อย 6 ตัวอักษร) ให้ครบถ้วน')
    }
    const users = readUsers()
    let account = users[normalized]
    // Demo mode: auto-provision an account for any valid-looking credentials.
    if (!account) {
      const user: AuthUser = {
        id: makeId(),
        email: normalized,
        publicId: null,
        codename: null,
        avatarId: null,
        mood: null,
        onboardingComplete: false,
        completedActivityIds: [],
        createdAt: new Date().toISOString(),
        moodUpdatedAt: null,
        totalPoints: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastCheckinDate: null,
        isAdmin: false,
      }
      account = { password, user }
      users[normalized] = account
      writeUsers(users)
    }
    localStorage.setItem(SESSION_KEY, normalized)
    return account.user
  }

  async resetPassword(_email: string): Promise<void> {
    // No real email backend in demo mode — inert, but resolves exactly like the real
    // Firebase flow so the UI's success state and "never reveal whether an account
    // exists" behavior both hold true here too.
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
  }

  async updateUser(patch: Partial<AuthUser>): Promise<AuthUser> {
    const email = localStorage.getItem(SESSION_KEY)
    if (!email) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
    const users = readUsers()
    const account = users[email]
    if (!account) throw new Error('ไม่พบบัญชีผู้ใช้')
    account.user = { ...account.user, ...patch }
    users[email] = account
    writeUsers(users)
    return account.user
  }

  async markActivityComplete(activityId: string): Promise<AuthUser> {
    const current = this.getCurrentUser()
    if (!current) throw new Error('ยังไม่ได้เข้าสู่ระบบ')
    const set = new Set(current.completedActivityIds)
    set.add(activityId)
    return this.updateUser({ completedActivityIds: Array.from(set) })
  }

  resetDemoData(): void {
    localStorage.removeItem(USERS_KEY)
    localStorage.removeItem(SESSION_KEY)
  }
}

export { LocalAuthService }
export type { MoodId }

// Falls back to the localStorage-backed mock until a Firebase project is configured
// (see .env.example) — nothing else in the app needs to know which one is active.
export const authService: AuthService = firebaseConfigured ? new FirebaseAuthService() : new LocalAuthService()
