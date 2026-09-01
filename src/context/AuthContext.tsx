import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '../features/auth/authService'
import { presenceService } from '../features/presence/presenceService'
import { awardDailyMission } from '../features/rewards/rewardsService'
import type { MissionId } from '../features/rewards/missionCatalog'
import { notifyRewardResult, type ActivityDisplayMeta } from '../features/rewards/rewardPopupBus'
import { recordMoodCheckin, recordNewUser } from '../features/analytics/analyticsService'
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
  /** `rewardDisplay` overrides the reward toast's icon/label for this one call — needed
   * because 'friend-bond' is shared by two different UI activities (Friend Quest and Who Am
   * I?) that must still show their own distinct toast label (see ACTIVITY_REWARD_DISPLAY). */
  completeActivity: (activityId: string, rewardDisplay?: ActivityDisplayMeta) => Promise<AuthUser>
  /** The gentle daily mood check-in (see DailyCheckinModal) — sets mood via the normal
   * path (Echo Space/Garden/publicProfile all update as already supported) AND, exactly
   * once per Bangkok calendar day, awards the check-in mission and advances the streak. */
  completeDailyCheckin: (mood: MoodId) => Promise<AuthUser>
  resetDemoData: () => void
}

/** Maps an existing lifetime-activity id (see completeActivity, already wired into Say It
 * Today / Hear Someone / Friend Quest) to the daily mission it also counts toward — reuses
 * those pages' real completion events instead of adding new ones. */
const ACTIVITY_TO_DAILY_MISSION: Partial<Record<string, MissionId>> = {
  'say-it-today': 'kindword',
  'hear-someone': 'hearwithheart',
  'friend-bond': 'friendbond',
}

/** Default reward-toast icon/label per activityId — overridden per-call via completeActivity's
 * `rewardDisplay` param where a MissionId is intentionally shared by more than one UI activity
 * (see 'friend-bond', used by both Friend Quest and Who Am I?). */
const ACTIVITY_REWARD_DISPLAY: Partial<Record<string, ActivityDisplayMeta>> = {
  'say-it-today': { icon: '💬', label: 'Say It Today' },
  'hear-someone': { icon: '👂', label: 'Hear Someone' },
  'friend-bond': { icon: '🫶', label: 'Friend Bond' },
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
    // Fires exactly once ever per account (see recordNewUser's create-once marker) — never
    // on a later login, since this transition only ever happens once per account's lifetime.
    if (u.id) void recordNewUser(u.id)
    return u
  }, [])

  const completeActivity = useCallback(async (activityId: string, rewardDisplay?: ActivityDisplayMeta) => {
    const u = await authService.markActivityComplete(activityId)
    setUser(u)
    const missionId = ACTIVITY_TO_DAILY_MISSION[activityId]
    // Best-effort, fire-and-forget: a reward hiccup must never fail the activity
    // completion itself — the realtime users/{uid} listener will pick up the points once
    // the transaction lands.
    if (missionId && u.id) {
      const display = rewardDisplay ?? ACTIVITY_REWARD_DISPLAY[activityId]
      void awardDailyMission(u.id, missionId, getBangkokDateString()).then((result) => {
        if (display) notifyRewardResult(result, display)
      })
    }
    return u
  }, [])

  const completeDailyCheckin = useCallback(async (mood: MoodId) => {
    const u = await authService.updateUser({ mood })
    setUser(u)
    presenceService.updateMood(mood)
    if (u.id) {
      void awardDailyMission(u.id, 'checkin', getBangkokDateString()).then((result) => {
        notifyRewardResult(result, { icon: '😊', label: 'Daily Mood' })
      })
      void recordMoodCheckin(u.id, mood)
    }
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
