import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({ surveyId: 's1', updateId: 'y1', token: 'tok' }),
}))

import SurveyActionsPage from './SurveyActionsPage'
import { PublicUpdatePage, SurveyPackPage } from './SurveyPrintPages'
import type { ActingOnResults } from './survey-actions'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const payload = (over: Partial<ActingOnResults> = {}): ActingOnResults => ({
  surveyId: 's1',
  title: 'Staff pulse',
  canManage: true,
  responsesAccess: false,
  periods: [],
  questions: [{ key: 'LIKERT|I feel listened to', questionText: 'I feel listened to', figure: '42% gave one of the top two answers', percent: 42 }],
  actions: [
    { id: 'a1', periodId: null, source: 'QUESTION', sourceLabel: 'I feel listened to: 42%', discussionId: null, title: 'Monthly listening sessions', detail: null, ownerRoleId: 'r1', ownerRole: 'Registered Manager', ownerUserId: null, ownerName: null, dueOn: '2026-12-01', overdue: true, status: 'OPEN', outcome: null, youSaid: null, weDid: null, evidenceNote: null, completedOn: null },
  ],
  discussions: [],
  youSaidWeDid: [{ id: 'y1', periodId: null, title: 'What changed', intro: null, items: [{ youSaid: 'Not listened to', weDid: 'Monthly sessions' }], headline: null, channels: ['APP', 'PUBLIC'], status: 'PUBLISHED', publicToken: 'tok123', publishedOn: '2026-11-07' }],
  roles: [{ id: 'r1', name: 'Registered Manager' }],
  themes: [],
  discussionKinds: [{ code: 'TEAM_MEETING', label: 'Team meeting' }],
  ...over,
})

beforeEach(() => apiJson.mockReset())

describe('acting on results', () => {
  it('lists actions with their figure, owner role and overdue state, and closing needs what was done', async () => {
    apiJson.mockImplementation(async (url: string, init?: RequestInit) => ((init?.method ?? 'GET') === 'GET' ? { data: payload() } : { message: 'ok' }))
    wrap(<SurveyActionsPage />)
    expect(await screen.findByText('Monthly listening sessions')).toBeInTheDocument()
    expect(screen.getByText(/overdue/)).toBeInTheDocument()
    expect(screen.getByText('I feel listened to: 42%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark as done' }))
    const confirm = screen.getAllByRole('button', { name: 'Mark as done' }).at(-1)!
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText('What was done'), { target: { value: 'Sessions held since October' } })
    fireEvent.change(screen.getByLabelText('You said (optional, in your own words)'), { target: { value: 'You did not feel listened to' } })
    fireEvent.change(screen.getByLabelText('We did (optional)'), { target: { value: 'Monthly listening sessions' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/survey-actions/a1', expect.objectContaining({ method: 'PATCH' })))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/survey-actions/a1')![1].body)
    expect(body).toMatchObject({ status: 'DONE', outcome: 'Sessions held since October', youSaid: 'You did not feel listened to' })
  })

  it('a raised action names its source as a figure, and goes to a role', async () => {
    apiJson.mockImplementation(async (url: string, init?: RequestInit) => ((init?.method ?? 'GET') === 'GET' ? { data: payload({ actions: [] }) } : { message: 'ok' }))
    wrap(<SurveyActionsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Raise an action' }))
    expect(screen.getByRole('option', { name: /I feel listened to \(42% gave/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'Publish the rota earlier' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add action' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/actions', expect.objectContaining({ method: 'POST' })))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/surveys/s1/actions' && c[1].method === 'POST')![1].body)
    expect(body).toMatchObject({ source: 'QUESTION', sourceKey: 'LIKERT|I feel listened to', ownerRoleId: 'r1', title: 'Publish the rota earlier' })
  })

  it('published "You said, we did" links the public page and can be withdrawn; read-only viewers get no buttons', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    const { unmount } = wrap(<SurveyActionsPage />)
    expect(await screen.findByText('Public page')).toHaveAttribute('href', '/you-said-we-did/tok123')
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeInTheDocument()
    unmount()
    apiJson.mockResolvedValue({ data: payload({ canManage: false }) })
    wrap(<SurveyActionsPage />)
    await screen.findByText('Monthly listening sessions')
    expect(screen.queryByRole('button', { name: 'Raise an action' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull()
  })
})

describe('print pages', () => {
  it('the pack shows owners as roles, and a note instead of figures when they cannot be shown', async () => {
    apiJson.mockResolvedValue({
      data: {
        organisation: { name: 'Allfor Care', logoUrl: null, phone: null, email: null },
        survey: { id: 's1', title: 'Staff pulse', targetKind: 'EMPLOYEE', isAnonymous: true, libraryReference: null },
        period: null,
        generatedOn: '2026-11-07',
        threshold: 5,
        participation: { sentTo: 20, answered: 4, responseRate: 20, inFigures: null },
        figuresShown: false,
        figuresNote: 'Too few answers to show figures.',
        headline: null,
        questions: [],
        trends: null,
        themes: [],
        scores: [],
        actions: [{ title: 'Fix rota', source: null, ownerRole: 'Registered Manager', dueOn: '2026-12-01', status: 'OPEN', outcome: null, completedOn: null }],
        discussions: [],
        youSaidWeDid: [],
        cqcStatements: [],
      },
    })
    wrap(<SurveyPackPage />)
    expect(await screen.findByText('Too few answers to show figures.')).toBeInTheDocument()
    expect(screen.getByText('Registered Manager')).toBeInTheDocument()
  })

  it('the public page says when it is no longer available', async () => {
    apiJson.mockRejectedValueOnce(new Error('Not found'))
    wrap(<PublicUpdatePage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer available/)
  })
})
