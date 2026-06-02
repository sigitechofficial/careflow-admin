import { redirect } from '@tanstack/react-router'
import { ensureAuthHydrated } from '@/features/auth/ensure-hydrated'
import { useAuthStore } from '@/features/auth/store'

const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
])

export async function rootAuthBeforeLoad({ location }: { location: { pathname: string } }) {
  await ensureAuthHydrated()
  const path = location.pathname
  const { isAuthenticated, ipAllowedForCurrent } = useAuthStore.getState()

  if (path === '/auth/blocked-ip') {
    if (!isAuthenticated()) throw redirect({ to: '/auth/login' })
    return
  }

  if (PUBLIC_PATHS.has(path)) {
    if (path === '/auth/login' && isAuthenticated()) {
      throw redirect({ to: '/' })
    }
    return
  }

  if (!isAuthenticated()) {
    throw redirect({
      to: '/auth/login',
      search: { redirect: path },
    })
  }

  if (!ipAllowedForCurrent()) {
    throw redirect({ to: '/auth/blocked-ip' })
  }
}
