import * as React from 'react'
import { useAuthStore } from '@/features/auth/store'

/** Window (ms) before access-token expiry within which we proactively refresh. */
const PROACTIVE_REFRESH_WINDOW_MS = 5 * 60 * 1000
/** How often the interval ticks while the tab is visible. */
const TICK_INTERVAL_MS = 60 * 1000

/**
 * Keeps the access token fresh.
 *
 * Three triggers, because browsers throttle setInterval in background tabs and
 * a single timer is not reliable enough on its own:
 *   1. Periodic tick while the tab is visible.
 *   2. Visibility change — when the user returns to the tab, refresh
 *      immediately if the token is near (or past) expiry. This is the case
 *      that was breaking SPA navigation: the interval had been throttled and
 *      the token was already dead by the time the user came back.
 *   3. Network reconnect — after coming back online, the token may have
 *      expired during the offline window.
 *
 * Also refreshes when the token is *already expired* (not just within the
 * 5-minute window), so a long idle period can recover on its own as long as
 * the refresh token is still valid.
 */
export function SessionRefresh() {
  const accessToken = useAuthStore(s => s.accessToken)
  const accessExpiresAt = useAuthStore(s => s.accessExpiresAt)

  React.useEffect(() => {
    if (!accessToken) return

    const maybeRefresh = () => {
      const { accessExpiresAt: exp, refreshToken, refreshExpiresAt } =
        useAuthStore.getState()
      if (!refreshToken) return
      if (Date.now() > refreshExpiresAt) return
      const left = exp - Date.now()
      if (left < PROACTIVE_REFRESH_WINDOW_MS) {
        void useAuthStore.getState().refreshTokens()
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeRefresh()
    }
    const onOnline = () => maybeRefresh()

    const id = window.setInterval(maybeRefresh, TICK_INTERVAL_MS)
    maybeRefresh()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [accessToken, accessExpiresAt])

  return null
}
