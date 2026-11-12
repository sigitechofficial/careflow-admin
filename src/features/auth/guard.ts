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

function isPublicSurveyPath(path: string): boolean {
  return (
    path === '/survey' ||
    path.startsWith('/survey/') ||
    path.startsWith('/survey-unsubscribe/') ||
    // "You said, we did" public page (no login): the API shows it only while published with the public link.
    path.startsWith('/you-said-we-did/')
  )
}

function isPortalPath(path: string) {
  return path === '/portal' || path.startsWith('/portal/')
}

/** The temporary inspector sign-in link (Employee → Temporary Inspector Login): /auth/login?as=inspector. */
export const INSPECTOR_SIGN_IN_SEARCH = { as: 'inspector' } as const

export async function rootAuthBeforeLoad({ location }: { location: { pathname: string; search?: unknown } }) {
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

  if (STAFF_PUBLIC_PATHS.has(path) || isPublicLegalPath(path) || isPublicSurveyPath(path)) {
    // The inspector sign-in link still opens for someone signed in (the office opening it to check
    // or hand over); the page warns that signing in there signs them out in this browser.
    const asInspector = (location.search as { as?: unknown } | undefined)?.as === INSPECTOR_SIGN_IN_SEARCH.as
    if (path === '/auth/login' && isAuthenticated() && !asInspector) {
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

  // An independent reviewer's account reaches "Surveys to record" and its own account page only (the
  // API refuses everything else). Any other signed-in page sends it back to its one page.
  if (useAuthStore.getState().user?.role === 'independent_reviewer' && !isReviewerAllowedPath(path)) {
    throw redirect({ to: '/survey-reviews', replace: true })
  }
}

/**
 * Signed-in pages an independent reviewer's account may open: "Surveys to record" and its own
 * account. Signing out is an action (then /auth/login, a public page), not a page here.
 */
export const REVIEWER_ALLOWED_PATHS = ['/survey-reviews', '/account'] as const

export function isReviewerAllowedPath(path: string): boolean {
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path
  return REVIEWER_ALLOWED_PATHS.some(allowed => p === allowed || p.startsWith(`${allowed}/`))
}
