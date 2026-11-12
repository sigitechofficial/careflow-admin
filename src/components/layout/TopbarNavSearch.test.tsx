import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { navigate, apiJson, user } = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiJson: vi.fn(),
  user: { id: 'u1', role: 'manager', permissions: ['lookups.read', 'service_users.read'] },
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate, useRouterState: () => '/' }))
vi.mock('@/shared/api/api-client', () => ({ apiJson }))
vi.mock('@/features/policies/hooks/useDebouncedValue', () => ({ useDebouncedValue: (v: string) => v }))
vi.mock('@/features/auth/store', () => {
  const state = { user, can: (p: string) => user.permissions.includes(p) }
  return { useAuthStore: (sel: (s: typeof state) => unknown) => sel(state) }
})
vi.mock('@/features/auth/pay-scope', () => ({ hasOrganisationPayScope: () => true }))
vi.mock('@/components/layout/Sidebar', () => ({
  adminNavItems: [{ label: 'Settings', icon: null, href: '/settings', children: [{ label: 'General Settings', icon: null, href: '/settings/general', permission: 'lookups.read' }] }],
  inspectorOnlyNavItems: [],
  reviewerOnlyNavItems: [],
  filterNavByPermission: (items: unknown[]) => items,
}))

import { TopbarNavSearch } from './TopbarNavSearch'

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TopbarNavSearch />
    </QueryClientProvider>,
  )

describe('Find anything (top bar)', () => {
  beforeEach(() => {
    navigate.mockReset()
    apiJson.mockReset()
    localStorage.clear()
    sessionStorage.clear()
    apiJson.mockResolvedValue({
      data: {
        hits: [{ id: 'su:1', section: 'Service users', label: 'Mary Jones', href: '/service-users/1/profile', recordType: 'serviceUser', recordId: '1' }],
        didYouMean: null,
        suggested: [],
      },
    })
  })

  it('finds a setting by everyday words, opens its tab and highlights it, and remembers it', async () => {
    wrap()
    const box = screen.getByTestId('topbar-nav-search')
    await userEvent.type(box, 'logged out devices')
    const results = await screen.findByTestId('topbar-nav-search-results')
    const settings = await within(results).findAllByTestId('find-result-setting')
    const setting = settings.find(el => el.textContent?.includes('Allow multiple device login?'))!
    expect(setting).toBeTruthy()
    await userEvent.click(setting)
    expect(navigate).toHaveBeenCalledWith({ to: '/settings/general', search: { tab: 'app-setting' } })
    expect(sessionStorage.getItem('careflow-find-highlight')).toContain('Allow multiple device login?')
    // Shown under "Recent" next time.
    await userEvent.click(box)
    expect(await screen.findByText('Recent')).toBeInTheDocument()
  })

  it('records come from one server search; "Mary Jones medication" goes straight to her medication', async () => {
    wrap()
    await userEvent.type(screen.getByTestId('topbar-nav-search'), 'Mary Jones medication')
    // The typed words are picked out in the name, so match on the whole text of the name.
    const name = (t: string) => (_: string, el: Element | null) => el?.classList.contains('truncate') === true && el.textContent === t
    expect(await screen.findByText(name('Mary Jones › Medication'))).toBeInTheDocument()
    expect(apiJson).toHaveBeenCalledWith('/search?q=Mary%20Jones', { method: 'GET' })
    await userEvent.click(screen.getByText(name('Mary Jones › Medication')))
    expect(navigate).toHaveBeenCalledWith({ to: '/service-users/1/medication', search: undefined })
  })

  it('Ctrl+K puts the cursor in the box from anywhere', async () => {
    wrap()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.getByTestId('topbar-nav-search')).toHaveFocus()
  })
})
