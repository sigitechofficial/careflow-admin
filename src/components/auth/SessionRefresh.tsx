import * as React from 'react'
import { useAuthStore } from '@/store/auth.store'

/** Periodically refreshes access tokens before expiry (client-side demo). */
export function SessionRefresh() {
  const accessToken = useAuthStore(s => s.accessToken)
  const accessExpiresAt = useAuthStore(s => s.accessExpiresAt)

  React.useEffect(() => {
    if (!accessToken) return

    const tick = () => {
      const left = useAuthStore.getState().accessExpiresAt - Date.now()
      if (left < 5 * 60 * 1000 && left > 0) void useAuthStore.getState().refreshTokens()
    }

    const id = window.setInterval(tick, 60 * 1000)
    tick()
    return () => window.clearInterval(id)
  }, [accessToken, accessExpiresAt])

  return null
}
