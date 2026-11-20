import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '@/features/auth/store'
import type { AuthUser } from '@/features/auth/types'
import { InspectorAccessBanner } from './InspectorAccessBanner'

const signIn = (over: Partial<AuthUser>) =>
  useAuthStore.setState({
    user: { id: 'u1', email: 'x@y.z', displayName: 'X', role: 'temporary_inspector', permissions: [], ...over } as AuthUser,
  })

afterEach(() => useAuthStore.setState({ user: null }))

describe('InspectorAccessBanner', () => {
  it('tells an inspector their access is read-only, for how many service users, and until when', () => {
    signIn({ inspectorAccess: { serviceUserIds: ['a', 'b'], validTo: '2026-11-20T17:00:00.000Z' } })
    render(<InspectorAccessBanner />)
    const banner = screen.getByTestId('inspector-access-banner')
    expect(banner).toHaveTextContent('Read-only inspector access')
    expect(banner).toHaveTextContent('2 chosen service users')
    expect(banner).toHaveTextContent('until')
  })

  it('says all service users when none were chosen', () => {
    signIn({ inspectorAccess: { serviceUserIds: [], validTo: '2026-11-20T17:00:00.000Z' } })
    render(<InspectorAccessBanner />)
    expect(screen.getByTestId('inspector-access-banner')).toHaveTextContent('all service users')
  })

  it('shows nothing for office users', () => {
    signIn({ role: 'admin' })
    render(<InspectorAccessBanner />)
    expect(screen.queryByTestId('inspector-access-banner')).toBeNull()
  })
})
