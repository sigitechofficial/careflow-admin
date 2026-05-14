import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import * as unreadHook from '@/features/notifications/hooks/useUnreadNotificationCount'
import * as prefsHook from '@/features/notifications/hooks/useNotificationPreferences'
import { useAuthStore } from '@/store/auth.store'

vi.mock('@/lib/api-base', () => ({ getApiBaseUrl: () => 'http://localhost:3000' }))

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('NotificationBell', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 't',
      refreshToken: 'r',
      accessExpiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() + 86_400_000,
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Test',
        role: 'admin',
        permissions: ['notifications.read', 'notifications.preferences.read'],
      },
    } as unknown as Parameters<typeof useAuthStore.setState>[0])
  })

  afterEach(() => {
    useAuthStore.getState().logout('test')
  })

  it('shows unread count from query', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.spyOn(unreadHook, 'useUnreadNotificationCount').mockReturnValue({
      data: 4,
      isLoading: false,
    } as ReturnType<typeof unreadHook.useUnreadNotificationCount>)
    vi.spyOn(prefsHook, 'useNotificationPreferences').mockReturnValue({
      data: [
        {
          type: 'SYSTEM_MESSAGE',
          inAppEnabled: true,
          soundEnabled: true,
          emailEnabled: false,
          smsEnabled: false,
          pushEnabled: false,
        },
      ],
    } as ReturnType<typeof prefsHook.useNotificationPreferences>)

    render(<NotificationBell />, { wrapper: wrapper(qc) })
    await waitFor(() => expect(screen.getByLabelText('Notifications')).toBeInTheDocument())
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
