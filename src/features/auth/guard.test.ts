import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRedirect } from '@tanstack/react-router'

vi.mock('@/features/auth/ensure-hydrated', () => ({ ensureAuthHydrated: () => Promise.resolve() }))

import { isReviewerAllowedPath, rootAuthBeforeLoad } from '@/features/auth/guard'
import { useAuthStore } from '@/features/auth/store'

/** Where a signed-in page sends the account: the redirect target, or null when it opens. */
async function landing(path: string): Promise<string | null> {
  try {
    await rootAuthBeforeLoad({ location: { pathname: path } })
    return null
  } catch (e) {
    if (isRedirect(e)) return (e.options as { to?: string }).to ?? null
    throw e
  }
}

function signInAs(role: string) {
  useAuthStore.setState({
    user: { id: 'u1', role, accountKind: 'user', permissions: [] } as never,
    isAuthenticated: () => true,
    isServiceUser: () => false,
    ipAllowedForCurrent: () => true,
  })
}

describe('independent reviewer route guard', () => {
  const initial = useAuthStore.getState()
  beforeEach(() => signInAs('independent_reviewer'))
  afterEach(() => useAuthStore.setState(initial, true))

  it('opens "Surveys to record" and the account page', async () => {
    expect(await landing('/survey-reviews')).toBeNull()
    expect(await landing('/survey-reviews/')).toBeNull()
    expect(await landing('/account')).toBeNull()
  })

  it('sends every other signed-in page to "Surveys to record"', async () => {
    for (const path of [
      '/',
      '/surveys',
      '/surveys/abc/results',
      '/service-users/all',
      '/employee/staff-list',
      '/my-surveys',
      '/notifications',
      '/admin/security',
      '/survey-reviewsx',
      '/accounts',
    ]) {
      expect(await landing(path), path).toBe('/survey-reviews')
    }
  })

  it('signing out still works: the sign-in page is public', async () => {
    useAuthStore.setState({ isAuthenticated: () => false })
    expect(await landing('/auth/login')).toBeNull()
  })

  it('leaves staff accounts alone', async () => {
    signInAs('manager')
    expect(await landing('/surveys')).toBeNull()
    expect(await landing('/service-users/all')).toBeNull()
  })

  it('opens the public "You said, we did" page without signing in, and nothing else beside it', async () => {
    useAuthStore.setState({ isAuthenticated: () => false })
    expect(await landing('/you-said-we-did/96l4Vm_abcdefghijklmnop')).toBeNull()
    expect(await landing('/surveys/abc/you-said-we-did/def/letter')).toBe('/auth/login')
    expect(await landing('/surveys/abc/pack')).toBe('/auth/login')
  })

  it('matches whole path segments only', () => {
    expect(isReviewerAllowedPath('/survey-reviews')).toBe(true)
    expect(isReviewerAllowedPath('/account')).toBe(true)
    expect(isReviewerAllowedPath('/survey-reviews-admin')).toBe(false)
    expect(isReviewerAllowedPath('/')).toBe(false)
  })
})

describe('temporary inspector sign-in link', () => {
  const initial = useAuthStore.getState()
  afterEach(() => useAuthStore.setState(initial, true))

  async function loginLanding(search?: Record<string, unknown>): Promise<string | null> {
    try {
      await rootAuthBeforeLoad({ location: { pathname: '/auth/login', search } })
      return null
    } catch (e) {
      if (isRedirect(e)) return (e.options as { to?: string }).to ?? null
      throw e
    }
  }

  it('opens for someone already signed in (the page warns before they sign in)', async () => {
    signInAs('manager')
    expect(await loginLanding({ as: 'inspector' })).toBeNull()
  })

  it('the plain sign-in page still sends someone signed in to Home', async () => {
    signInAs('manager')
    expect(await loginLanding()).toBe('/')
    expect(await loginLanding({ as: 'someone-else' })).toBe('/')
  })
})
