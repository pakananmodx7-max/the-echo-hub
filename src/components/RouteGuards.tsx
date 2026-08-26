import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireOnboarding() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.codename) return <Navigate to="/onboarding/codename" replace />
  if (!user.mood) return <Navigate to="/onboarding/mood" replace />
  return <Outlet />
}
