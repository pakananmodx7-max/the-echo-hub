import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '../features/auth/authService'
import { presenceService } from '../features/presence/presenceService'
import { awardDailyMission } from '../features/rewards/rewardsService'
import type { MissionId } from '../features/rewards/missionCatalog'
import { getBangkokDateString } from '../lib/thailandDate'
import type { AuthUser, MoodId } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** True until the initial auth state (Firebase session resolution) has settled. */
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  setCodename: (codename: string, avatarId: string) => Promise<AuthUser>
  setMood: (mood: MoodId) => Promise<AuthUser>
  completeOnboarding: () => Promise<AuthUser>
  completeActivity: (activityId: string) => Promise<AuthUser>
  /** The gentle daily mood check-in (see DailyCheckinModal) — sets mood via the normal
   * path (Echo Space/Garden/publicProfile all update as already supported) AND, exactly
   * once per Bangkok calendar day, awards the check-in mission and advances the streak. */
  completeDailyCheckin: (mood: MoodId) => Promise<AuthUser>
  resetDemoData: () => void
}

/** Maps an existing lifetime-activity id (see completeActivity, already wired into Send a
 * Song / Say It Today / Hear Someone / Friend Quest) to the daily mission it also counts
 * toward — reuses those pages' real completion events instead of adding new ones. */
const ACTIVITY_TO_DAILY_MISSION: Partial<Record<string, MissionId>> = {
  'say-it-today': 'kindword',
  'send-song': 'music',
  'hear-someone': 'hearwithheart',
  'friend-bond': 'friendbond',
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email, password)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const u = await authService.register(email, password)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const setCodename = useCallback(async (codename: string, avatarId: string) => {
    const u = await authService.updateUser({ codename, avatarId })
    setUser(u)
    return u
  }, [])

  const setMood = useCallback(async (mood: MoodId) => {
    const u = await authService.updateUser({ mood })
    setUser(u)
    presenceService.updateMood(mood)
    return u
  }, [])

  const completeOnboarding = useCallback(async () => {
    const u = await authService.updateUser({ onboardingComplete: true })
    setUser(u)
    return u
  }, [])

  const completeActivity = useCallback(async (activityId: string) => {
    const u = await authService.markActivityComplete(activityId)
    setUser(u)
    const missionId = ACTIVITY_TO_DAILY_MISSION[activityId]
    // Best-effort, fire-and-forget: a reward hiccup must never fail the activity
    // completion itself — the realtime users/{uid} listener will pick up the points once
    // the transaction lands.
    if (missionId && u.id) void awardDailyMission(u.id, missionId, getBangkokDateString())
    return u
  }, [])

  const completeDailyCheckin = useCallback(async (mood: MoodId) => {
    const u = await authService.updateUser({ mood })
    setUser(u)
    presenceService.updateMood(mood)
    if (u.id) void awardDailyMission(u.id, 'checkin', getBangkokDateString())
    return u
  }, [])

  const resetDemoData = useCallback(() => {
    authService.resetDemoData()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      setCodename,
      setMood,
      completeOnboarding,
      completeActivity,
      completeDailyCheckin,
      resetDemoData,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      setCodename,
      setMood,
      completeOnboarding,
      completeActivity,
      completeDailyCheckin,
      resetDemoData,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
