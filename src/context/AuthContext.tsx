import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '../features/auth/authService'
import { presenceService } from '../features/presence/presenceService'
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
  resetDemoData: () => void
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
      resetDemoData,
    }),
    [user, loading, login, register, logout, setCodename, setMood, completeOnboarding, completeActivity, resetDemoData],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
