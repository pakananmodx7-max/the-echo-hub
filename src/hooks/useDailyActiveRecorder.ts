import { useEffect, useRef } from 'react'
import { recordDailyActiveUser } from '../features/analytics/analyticsService'
import type { AuthUser } from '../types'

/**
 * Records this account as a Daily Active User at most once per Bangkok calendar day — see
 * analyticsService.recordDailyActiveUser for the create-once idempotency guarantee (a
 * refresh, a second tab, logging out/in the same day, or a second device all collapse to
 * the same already-exists marker and are safe no-ops). Mounted once in HubLayout, so it
 * fires the moment an onboarded student is actually using the hub, not just signed in.
 */
export function useDailyActiveRecorder(user: AuthUser | null): void {
  const recordedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.id || !user.onboardingComplete) return
    if (recordedForRef.current === user.id) return
    recordedForRef.current = user.id
    void recordDailyActiveUser(user.id)
  }, [user?.id, user?.onboardingComplete])
}
