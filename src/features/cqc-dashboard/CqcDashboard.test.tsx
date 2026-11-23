import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ can: () => true, user: { id: 'u-1', assignedLocationIds: null, assignedLocations: [] } }),
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({ useLocationManagementTree: () => ({ data: undefined }) }))
vi.mock('@/features/locations/utils/flatten-location-options.util', () => ({
  flattenLocationOptionsFromTree: () => [{ id: 'loc-a', label: 'Croydon' }],
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to: _to, params: _p, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
}))
// Charts need a real layout; the tests check the numbers and tables instead.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<object>('recharts')
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }
})

import CqcDashboardPage from './pages/CqcDashboardPage'
import CqcReportsPage from './pages/CqcReportsPage'
import type { CqcDashboard, CqcReports } from './types'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const DASHBOARD: CqcDashboard = {
  generatedAt: '2026-11-23T10:00:00.000Z',
  evidence: {
    totals: { statements: 34, covered: 20, gaps: 14, currentEvidence: 13, reviewOverdue: 1, addedLast30Days: 3 },
    keyQuestions: [
      { code: 'SAFE', title: 'Safe', statementCount: 8, coveredCount: 5, gapCount: 3 },
      { code: 'WELL_LED', title: 'Well-led', statementCount: 8, coveredCount: 8, gapCount: 0 },
    ],
  },
  mock: {
    latest: {
      id: 'm2',
      title: 'Mock inspection, November 2026',
      completedAt: '2026-11-17T10:00:00.000Z',
      overall: 'GOOD',
      keyQuestions: [
        { code: 'SAFE', rating: 'REQUIRES_IMPROVEMENT', percent: 62.5 },
        { code: 'WELL_LED', rating: 'GOOD', percent: 75 },
      ],
    },
    previous: { id: 'm1', title: 'May', completedAt: '2026-05-10T10:00:00.000Z', overall: 'REQUIRES_IMPROVEMENT', keyQuestions: [] },
    lastCompletedAt: '2026-11-20T10:00:00.000Z',
    keyQuestions: [
      { code: 'SAFE', rating: 'REQUIRES_IMPROVEMENT', percent: 62.5, inspectionId: 'm3', inspectionTitle: 'Infection control', completedAt: '2026-11-20T10:00:00.000Z' },
      { code: 'WELL_LED', rating: 'GOOD', percent: 75, inspectionId: 'm2', inspectionTitle: 'Mock inspection, November 2026', completedAt: '2026-11-17T10:00:00.000Z' },
    ],
    inProgress: 1,
    counts: { total: 5, completed: 3, inProgress: 1, cancelled: 1 },
    actions: {
      open: 2,
      overdue: 1,
      dueThisWeek: 1,
      doneLast30Days: 4,
      next: [
        { id: 'a1', title: 'Share lessons', statementTitle: 'Learning culture', dueAt: '2026-11-01T00:00:00.000Z', overdue: true, inspectionId: 'm2' },
      ],
    },
  },
  notifications: {
    byStatus: { DRAFT: 1, SUBMITTED: 3 },
    open: 1,
    overdue: 1,
    next: [{ id: 'n1', referenceNumber: 'CQCN-2026-000001', type: 'DEATH', status: 'DRAFT', dueAt: '2026-11-20T00:00:00.000Z', overdue: true }],
  },
  attention: [
    { kind: 'EVIDENCE_GAPS', count: 14, message: '14 quality statements have no current evidence.' },
    { kind: 'ACTIONS_OVERDUE', count: 1, message: '1 improvement action is overdue.' },
  ],
}

const REPORTS: CqcReports = {
  months: ['2026-09', '2026-10', '2026-11'],
  from: '2026-09-01T00:00:00.000Z',
  evidence: {
    byMonth: [
      { month: '2026-09', added: 0 },
      { month: '2026-10', added: 1 },
      { month: '2026-11', added: 2 },
    ],
    bySource: [{ key: 'AUDIT', count: 2 }],
    byCategory: [{ key: 'PROCESSES', count: 2 }],
  },
  mock: {
    inspections: [
      {
        id: 'm2',
        title: 'Mock inspection, November 2026',
        completedAt: '2026-11-17T10:00:00.000Z',
        branch: 'Croydon',
        overall: 'GOOD',
        keyQuestions: [{ code: 'SAFE', rating: 'REQUIRES_IMPROVEMENT', percent: 62.5 }],
      },
    ],
    actionsByMonth: [
      { month: '2026-11', raised: 2, done: 2, doneLate: 1 },
    ],
    statusCounts: { completed: 2, inProgress: 1, cancelled: 1 },
  },
  notifications: {
    byMonth: [{ month: '2026-11', count: 2 }],
    byType: [{ type: 'DEATH', count: 2 }],
    submitted: 2,
    submittedOnTime: 1,
  },
}

beforeEach(() => {
  apiJson.mockReset()
  apiJson.mockImplementation(async (url: string) => {
    if (url.startsWith('/cqc-dashboard/reports')) return { data: REPORTS }
    if (url.startsWith('/cqc-dashboard')) return { data: DASHBOARD }
    return { data: [] }
  })
})

describe('CQC dashboard', () => {
  it('shows what needs attention, the latest rating and how it changed, coverage, actions and notifications', async () => {
    wrap(<CqcDashboardPage />)
    const attention = await screen.findByTestId('cqc-attention')
    expect(within(attention).getAllByTestId('cqc-attention-item')).toHaveLength(2)
    expect(attention).toHaveTextContent('Things to fix (2)')
    expect(attention).toHaveTextContent('14 quality statements still need evidence')
    expect(attention).toHaveTextContent('1 improvement action is late')
    const mock = screen.getByTestId('cqc-tile-mock')
    expect(mock).toHaveTextContent('Good')
    expect(mock).toHaveTextContent('Better than last time')
    const counts = screen.getByTestId('cqc-tile-mock-counts')
    expect(counts).toHaveTextContent('5 in total')
    expect(screen.getByTestId('cqc-mock-count-completed')).toHaveTextContent('Completed3')
    expect(screen.getByTestId('cqc-mock-count-in-progress')).toHaveTextContent('In progress1')
    expect(screen.getByTestId('cqc-mock-count-cancelled')).toHaveTextContent('Cancelled1')
    expect(screen.getByTestId('cqc-tile-evidence')).toHaveTextContent('20 / 34')
    expect(screen.getByTestId('cqc-tile-evidence')).toHaveTextContent('14 still need evidence')
    expect(screen.getByTestId('cqc-tile-actions')).toHaveTextContent('2 open')
    expect(screen.getByTestId('cqc-tile-actions')).toHaveTextContent('1 overdue')
    expect(screen.getByTestId('cqc-tile-notifications')).toHaveTextContent('1 to send')
    expect(screen.getByTestId('cqc-tile-notifications')).toHaveTextContent('1 late')
  })

  it('shows each key question with its latest rating and evidence coverage', async () => {
    wrap(<CqcDashboardPage />)
    const cards = await screen.findAllByTestId('cqc-key-question')
    expect(cards[0]).toHaveTextContent('Safe')
    expect(cards[0]).toHaveTextContent('Requires improvement')
    expect(cards[0]).toHaveTextContent('5 / 8')
    expect(cards[0]).toHaveTextContent('3 missing')
    // The rating comes from the newest inspection that rated Safe, with its date.
    expect(cards[0]).toHaveTextContent('20/11/2026')
    expect(cards[1]).toHaveTextContent('17/11/2026')
    expect(cards[1]).toHaveTextContent('Complete')
    expect(screen.getByTestId('cqc-next-actions')).toHaveTextContent('Share lessons')
    expect(screen.getByTestId('cqc-open-notifications')).toHaveTextContent('Death of a person')
  })

  it('filters by branch', async () => {
    wrap(<CqcDashboardPage />)
    await screen.findByTestId('cqc-attention')
    fireEvent.change(screen.getByTestId('cqc-dashboard-branch'), { target: { value: 'loc-a' } })
    await waitFor(() => expect(apiJson.mock.calls.some(c => String(c[0]) === '/cqc-dashboard?locationId=loc-a')).toBe(true))
  })

  it('leaves out the parts the person may not see, and says when nothing needs attention', async () => {
    apiJson.mockImplementation(async () => ({ data: { ...DASHBOARD, mock: null, notifications: null, attention: [] } }))
    wrap(<CqcDashboardPage />)
    expect(await screen.findByTestId('cqc-attention-none')).toBeInTheDocument()
    expect(screen.queryByTestId('cqc-tile-mock')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cqc-tile-mock-counts')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cqc-tile-notifications')).not.toBeInTheDocument()
    expect(screen.getByTestId('cqc-tile-evidence')).toBeInTheDocument()
  })
})

describe('CQC reports', () => {
  it('lists mock inspection ratings by key question and summarises actions and notifications', async () => {
    wrap(<CqcReportsPage />)
    const table = await screen.findByTestId('cqc-report-mock-table')
    expect(table).toHaveTextContent('Mock inspection, November 2026')
    expect(table).toHaveTextContent('Croydon')
    expect(table).toHaveTextContent('Requires improvement')
    expect(screen.getByTestId('cqc-report-actions')).toHaveTextContent('2 actions raised and 2 done, 50% done on time.')
    expect(screen.getByTestId('cqc-report-on-time')).toHaveTextContent('2 notifications sent to CQC, 1 of them on time (50%).')
    expect(screen.getByTestId('cqc-report-summary-mock')).toHaveTextContent('Good')
    expect(screen.getByTestId('cqc-report-summary-evidence')).toHaveTextContent('3')
    expect(screen.getByTestId('cqc-report-summary-actions')).toHaveTextContent('2 of 2')
    expect(screen.getByTestId('cqc-report-summary-notifications')).toHaveTextContent('50% sent on time')
    expect(screen.getByTestId('cqc-report-status')).toHaveTextContent('4 inspections: 2 completed, 1 in progress, 1 cancelled.')
    expect(screen.getByTestId('cqc-report-status-completed')).toHaveTextContent('Completed2 (50%)')
    expect(screen.getByTestId('cqc-report-status-inProgress')).toHaveTextContent('In progress1 (25%)')
    const cats = screen.getByTestId('cqc-report-evidence-categories')
    expect(cats).toHaveTextContent('Processes2')
    expect(cats).toHaveTextContent('ObservationNone yet')
    expect(cats).not.toHaveTextContent('Audit')
  })

  it('changes the period', async () => {
    wrap(<CqcReportsPage />)
    await screen.findByTestId('cqc-report-mock-table')
    fireEvent.change(screen.getByTestId('cqc-reports-period'), { target: { value: '24' } })
    await waitFor(() => expect(apiJson.mock.calls.some(c => String(c[0]).includes('months=24'))).toBe(true))
  })
})
