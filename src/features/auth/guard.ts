import { redirect } from '@tanstack/react-router'
import { ensureAuthHydrated } from '@/features/auth/ensure-hydrated'
import { useAuthStore } from '@/features/auth/store'

const STAFF_PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/legal/privacy-policy',
])

function isPublicLegalPath(path: string): boolean {
  return path === '/legal/privacy-policy' || path.startsWith('/legal/')
}

function isPortalPath(path: string) {
  return path === '/portal' || path.startsWith('/portal/')
}

export async function rootAuthBeforeLoad({ location }: { location: { pathname: string } }) {
  await ensureAuthHydrated()
  const path = location.pathname
  const { isAuthenticated, ipAllowedForCurrent, isServiceUser } = useAuthStore.getState()

  if (path === '/auth/blocked-ip') {
    if (!isAuthenticated()) throw redirect({ to: '/auth/login' })
    return
  }

  if (path === '/portal/login') {
    if (isAuthenticated() && isServiceUser()) {
      throw redirect({ to: '/portal' })
    }
    if (isAuthenticated() && !isServiceUser()) {
      throw redirect({ to: '/' })
    }
    return
  }

  if (isPortalPath(path)) {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/portal/login',
        search: { redirect: path },
      })
    }
    if (!isServiceUser()) {
      throw redirect({ to: '/' })
    }
    if (!ipAllowedForCurrent()) {
      throw redirect({ to: '/auth/blocked-ip' })
    }
    return
  }

  if (STAFF_PUBLIC_PATHS.has(path) || isPublicLegalPath(path)) {
    if (path === '/auth/login' && isAuthenticated()) {
      throw redirect({ to: isServiceUser() ? '/portal' : '/' })
    }
    return
  }

  if (!isAuthenticated()) {
    throw redirect({
      to: '/auth/login',
      search: { redirect: path },
    })
  }

  if (isServiceUser()) {
    throw redirect({ to: '/portal' })
  }

  if (!ipAllowedForCurrent()) {
    throw redirect({ to: '/auth/blocked-ip' })
  }
}
