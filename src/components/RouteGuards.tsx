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
  // The admin account never goes through student onboarding (no codename/mood is ever set
  // for it) — without this it would otherwise get stuck being asked to pick a codename.
  if (user.isAdmin) return <Navigate to="/admin/counselor" replace />
  if (!user.codename) return <Navigate to="/onboarding/codename" replace />
  if (!user.mood) return <Navigate to="/onboarding/mood" replace />
  return <Outlet />
}

/** Gate for the /admin/* route tree — admin authorization comes ONLY from the Firebase Auth
 * custom claim resolved onto `user.isAdmin` (see firebaseAuthService.ts), never a username
 * check. A signed-in non-admin student hitting an /admin/* URL is redirected to /hub, not
 * shown any part of the admin shell (spec: "student: GET /admin/counselor → access
 * denied / redirect"). */
export function RequireAdmin() {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!user.isAdmin) return <Navigate to="/hub" replace />
  return <Outlet />
}
