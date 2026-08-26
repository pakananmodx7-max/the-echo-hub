import type { AuthUser, MoodId } from '../../types'

/**
 * Interface-first design: swap `LocalAuthService` for a `FirebaseAuthService`
 * implementation later without touching any consuming component.
 */
export interface AuthService {
  getCurrentUser(): AuthUser | null
  register(email: string, password: string): Promise<AuthUser>
  login(email: string, password: string): Promise<AuthUser>
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

  async register(email: string, password: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase()
    if (!normalized || !password || password.length < 6) {
      throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง (รหัสผ่านอย่างน้อย 6 ตัวอักษร)')
    }
    const users = readUsers()
    const user: AuthUser = {
      id: makeId(),
      email: normalized,
      codename: null,
      avatarId: null,
      mood: null,
      onboardingComplete: false,
      completedActivityIds: [],
      createdAt: new Date().toISOString(),
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
        codename: null,
        avatarId: null,
        mood: null,
        onboardingComplete: false,
        completedActivityIds: [],
        createdAt: new Date().toISOString(),
      }
      account = { password, user }
      users[normalized] = account
      writeUsers(users)
    }
    localStorage.setItem(SESSION_KEY, normalized)
    return account.user
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

export const authService: AuthService = new LocalAuthService()
export type { MoodId }
