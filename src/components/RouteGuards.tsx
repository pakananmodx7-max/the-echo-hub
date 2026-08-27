import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function AuthLoadingScreen() {
  return <div className="flex min-h-svh items-center justify-center bg-cream text-sm text-ink-soft">กำลังโหลด...</div>
}

export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireOnboarding() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!user.codename) return <Navigate to="/onboarding/codename" replace />
  if (!user.mood) return <Navigate to="/onboarding/mood" replace />
  return <Outlet />
}
