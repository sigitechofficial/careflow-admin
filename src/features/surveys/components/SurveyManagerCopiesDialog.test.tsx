import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { apiJson, toast } = vi.hoisted(() => ({
  apiJson: vi.fn(),
  toast: { toastSuccess: vi.fn(), toastApiError: vi.fn() },
}))
vi.mock('@/shared/api/api-client', () => ({ apiJson }))
vi.mock('@/shared/lib/toast', () => toast)
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
}))

import { SurveyManagerCopiesDialog, managerCopyPlanUrl, namesManager } from '@/features/surveys/components/SurveyManagerCopiesDialog'

const plan = (over: Record<string, unknown> = {}) => ({
  surveyId: 'tpl-1',
  title: 'Feedback on your manager',
  isAnonymous: true,
  copies: [{ managerUserId: 'u-sam', managerName: 'Sam Patel', employeeIds: ['a', 'b', 'c', 'd', 'e', 'f'], staffNames: [], holdsSurveyAccess: false }],
  pooled: null,
  notSent: [{ managerName: 'Bo Li', reason: 'Fewer than 5 staff, and the smaller-teams copy would cover only 2 managers, so its results would point at one of them.' }],
  recentlyNamed: [{ managerName: 'Sam Patel', count: 1 }],
  accessWarnings: [],
  exclude: ['REGISTERED_MANAGER'],
  libraryExclude: ['REGISTERED_MANAGER'],
  owners: [
    { key: 'REGISTERED_MANAGER', label: 'Registered Manager' },
    { key: 'HR_MANAGER', label: 'HR manager' },
  ],
  ...over,
})

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SurveyManagerCopiesDialog surveyId="tpl-1" open onOpenChange={() => undefined} />
    </QueryClientProvider>,
  )
}

describe('SurveyManagerCopiesDialog', () => {
  beforeEach(() => {
    apiJson.mockReset()
    toast.toastSuccess.mockReset()
  })

  it('shows the copies, who gets none and why, then makes them with the title label', async () => {
    apiJson.mockImplementation(async (_url: string, init: { method: string }) =>
      init.method === 'GET'
        ? { data: plan() }
        : { data: { created: [{ surveyId: 'c1', title: 'Feedback on your manager: Sam Patel, June 2027', managerNames: ['Sam Patel'], people: 6 }] } },
    )
    renderDialog()
    expect(await screen.findByText('1 copy will be made')).toBeInTheDocument()
    expect(screen.getByTestId('manager-copies-planned')).toHaveTextContent('Sam Patel: 6 staff')
    expect(screen.getByTestId('manager-copies-not-sent')).toHaveTextContent('Bo Li: Fewer than 5 staff')
    expect(screen.getByText(/1 of Sam Patel's staff/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Added to each title (optional)'), 'June 2027')
    await userEvent.click(screen.getByRole('button', { name: 'Make 1 draft copy' }))
    expect(apiJson).toHaveBeenCalledWith('/surveys/tpl-1/manager-copies', {
      method: 'POST',
      body: JSON.stringify({ label: 'June 2027', exclude: ['REGISTERED_MANAGER'] }),
    })
    expect(await screen.findByText('Feedback on your manager: Sam Patel, June 2027')).toBeInTheDocument()
  })

  it('teams not asked: the ready-made choice is ticked, and changing it asks for a new plan', async () => {
    apiJson.mockResolvedValue({ data: plan() })
    renderDialog()
    const group = await screen.findByRole('group', { name: 'Teams not asked' })
    expect(group).toHaveTextContent('The ready-made survey leaves out: Registered Manager.')
    expect(screen.getByRole('checkbox', { name: 'Registered Manager' })).toBeChecked()
    await userEvent.click(screen.getByRole('checkbox', { name: 'HR manager' }))
    expect(apiJson).toHaveBeenLastCalledWith('/surveys/tpl-1/manager-copies?exclude=REGISTERED_MANAGER%2CHR_MANAGER', { method: 'GET' })
  })

  it("says the survey's minimum team (5 unless the ready-made survey asks for more)", async () => {
    apiJson.mockResolvedValue({ data: plan({ minTeam: 10 }) })
    renderDialog()
    expect(await screen.findByTestId('manager-copies-min-team')).toHaveTextContent(
      'A manager needs at least 10 staff for their own copy, so the answers cannot point at anyone. Smaller teams share one copy when together they are at least 10 people',
    )
  })

  it('the smallest team starts at the ready-made size, changes the plan, and is sent with the copies', async () => {
    const bounds = { minTeam: 10, defaultMinTeam: 10, minTeamMin: 10, minTeamMax: 50, minTeamFloorReason: 'Below 10, answers could be traced to one person.' }
    apiJson.mockImplementation(async (url: string, init: { method: string }) =>
      init.method === 'GET'
        ? { data: plan({ ...bounds, minTeam: url.includes('minTeam=12') ? 12 : 10 }) }
        : { data: { created: [{ surveyId: 'c1', title: 'Feedback on your manager: Sam Patel', managerNames: ['Sam Patel'], people: 12 }] } },
    )
    renderDialog()
    const field = await screen.findByLabelText('Smallest team that gets its own copy')
    expect(field).toHaveValue(10)
    expect(field).toHaveAttribute('min', '10')
    expect(field).toHaveAttribute('max', '50')
    expect(screen.getByTestId('manager-copies-min-team-field')).toHaveTextContent('Below 10, answers could be traced to one person.')
    await userEvent.clear(field)
    await userEvent.type(field, '12')
    expect(apiJson).toHaveBeenLastCalledWith('/surveys/tpl-1/manager-copies?minTeam=12', { method: 'GET' })
    expect(await screen.findByText(/The ready-made survey uses 10/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Make 1 draft copy' }))
    expect(apiJson).toHaveBeenLastCalledWith('/surveys/tpl-1/manager-copies', {
      method: 'POST',
      body: JSON.stringify({ exclude: ['REGISTERED_MANAGER'], minTeam: 12 }),
    })
  })

  it('the smallest team cannot go below the floor or above 50: the plan is kept and copies cannot be made', async () => {
    apiJson.mockResolvedValue({ data: plan({ minTeam: 10, defaultMinTeam: 10, minTeamMin: 10, minTeamMax: 50, minTeamFloorReason: 'Below 10, answers could be traced to one person.' }) })
    renderDialog()
    const field = await screen.findByLabelText('Smallest team that gets its own copy')
    const calls = apiJson.mock.calls.length
    await userEvent.clear(field)
    await userEvent.type(field, '9')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('manager-copies-min-team-field')).toHaveTextContent('Choose from 10 to 50.')
    expect(screen.getByRole('button', { name: 'Make 1 draft copy' })).toBeDisabled()
    await userEvent.clear(field)
    await userEvent.type(field, '51')
    expect(screen.getByRole('button', { name: 'Make 1 draft copy' })).toBeDisabled()
    // No plan was asked for with a value out of range.
    expect(apiJson.mock.calls.slice(calls).some(([url]) => /minTeam=(9|51|5)\b/.test(String(url)))).toBe(false)
  })

  it('managerCopyPlanUrl sends only what was changed', () => {
    expect(managerCopyPlanUrl('s1', null, null)).toBe('/surveys/s1/manager-copies')
    expect(managerCopyPlanUrl('s1', [], 12)).toBe('/surveys/s1/manager-copies?exclude=&minTeam=12')
    expect(managerCopyPlanUrl('s1', ['A', 'B'], null)).toBe('/surveys/s1/manager-copies?exclude=A%2CB')
  })

  it('says when no role is set for a team that should not be asked', async () => {
    apiJson.mockResolvedValue({ data: plan({ excludeNotFound: ['Registered Manager'] }) })
    renderDialog()
    expect(await screen.findByTestId('manager-copies-exclude-not-found')).toHaveTextContent(
      'No role in CareFlow is set as the Registered Manager, so their team cannot be left out',
    )
  })

  it('a manager who can open surveys must be dealt with before the copies can be made', async () => {
    apiJson.mockResolvedValue({ data: plan({ accessWarnings: ['Sam Patel'] }) })
    renderDialog()
    const make = await screen.findByRole('button', { name: 'Make 1 draft copy' })
    expect(screen.getByTestId('manager-copies-access')).toHaveTextContent('Sam Patel is an admin, so they would still see the answers to their own copy')
    expect(make).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /they will not be an admin/ }))
    expect(make).toBeEnabled()
  })

  it('namesManager spots {{manager}} anywhere people read', () => {
    expect(namesManager({ title: 'Feedback', questions: [{ questionText: 'Does {{manager}} listen?' }] })).toBe(true)
    expect(namesManager({ title: 'Feedback', description: 'About {{manager}}', questions: [] })).toBe(true)
    expect(namesManager({ title: 'Feedback', questions: [{ questionText: 'Does your manager listen?' }] })).toBe(false)
  })
})
