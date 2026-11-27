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
    comparison: {
      branches: ['Croydon', 'Whole organisation'],
      overall: { from: 'GOOD', to: 'REQUIRES_IMPROVEMENT', fromPercent: 70.4, toPercent: 62.5, change: -7.9 },
      keyQuestions: [
        {
          code: 'SAFE',
          title: 'Safe',
          fromRating: 'GOOD',
          toRating: 'GOOD',
          fromPercent: 71.9,
          toPercent: 75,
          change: 3.1,
          branchCount: 2,
        },
        {
          code: 'WELL_LED',
          title: 'Well-led',
          fromRating: 'REQUIRES_IMPROVEMENT',
          toRating: 'REQUIRES_IMPROVEMENT',
          fromPercent: 68.8,
          toPercent: 50,
          change: -18.8,
          branchCount: 1,
        },
      ],
      improved: [{ code: 'SAFE_IPC', title: 'Infection prevention and control', from: 2.5, to: 3.5 }],
      declined: [{ code: 'SAFE_STAFFING', title: 'Safe and effective staffing', from: 3, to: 2 }],
      unchangedCount: 2,
      byBranch: [
        {
          id: 'loc-a',
          name: 'Croydon',
          overall: { from: 'GOOD', to: 'GOOD', fromPercent: 75, toPercent: 81.3, change: 6.3 },
          keyQuestions: [
            {
              code: 'SAFE',
              title: 'Safe',
              fromRating: 'GOOD',
              toRating: 'GOOD',
              fromPercent: 75,
              toPercent: 81.3,
              change: 6.3,
              branchCount: 1,
            },
          ],
          improved: [{ code: 'SAFE_IPC', title: 'Infection prevention and control', from: 3, to: 4 }],
          declined: [],
          unchangedCount: 3,
          compared: [
            {
              to: { id: 'm3', title: 'Infection control', completedAt: '2026-11-20T10:00:00.000Z' },
              from: { id: 'm2', title: 'Mock inspection, November 2026', completedAt: '2026-11-17T10:00:00.000Z' },
            },
          ],
        },
        {
          id: null,
          name: 'Whole organisation',
          overall: { from: 'GOOD', to: 'REQUIRES_IMPROVEMENT', fromPercent: 68.8, toPercent: 50, change: -18.8 },
          keyQuestions: [],
          improved: [],
          declined: [],
          unchangedCount: 0,
          compared: [
            {
              to: { id: 'w2', title: 'Whole org, autumn', completedAt: '2026-10-01T10:00:00.000Z' },
              from: { id: 'w1', title: 'Whole org, spring', completedAt: '2026-04-01T10:00:00.000Z' },
            },
          ],
        },
      ],
    },
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

  it('shows the average change since the last inspection across branches', async () => {
    wrap(<CqcDashboardPage />)
    const section = await screen.findByTestId('cqc-mock-comparison')
    expect(section).toHaveTextContent('What changed since the last inspection')
    expect(section).toHaveTextContent('The numbers below are the average of these 2 branches.')
    const pairs = within(section).getAllByTestId('cqc-mock-compared')
    expect(pairs[0]).toHaveTextContent(
      'CroydonLatest: Infection control (20/11/2026)Before: Mock inspection, November 2026 (17/11/2026)',
    )
    expect(pairs[0]).toHaveTextContent('Why these two: they are the last two finished inspections for this branch.')
    expect(pairs[1]).toHaveTextContent(
      'Whole organisationLatest: Whole org, autumn (01/10/2026)Before: Whole org, spring (01/04/2026)',
    )
    expect(pairs[1]).toHaveTextContent('for the whole organisation.')
    expect(within(pairs[0]).getByText('Infection control', { selector: 'a' })).toBeInTheDocument()
    expect(section).toHaveTextContent('Overall (average of branches)')
    expect(section).toHaveTextContent('BeforeLatestChange')
    expect(section).toHaveTextContent('70.4%')
    expect(section).toHaveTextContent('-7.9 pts')
    const rows = within(section).getAllByTestId('mock-compare-kq')
    expect(rows[0]).toHaveTextContent('+3.1 pts')
    expect(rows[1]).toHaveTextContent('-18.8 pts')
    expect(within(section).getByTestId('mock-compare-up')).toHaveTextContent('Infection prevention and control2.5 → 3.5')
    expect(within(section).getByTestId('mock-compare-down')).toHaveTextContent('Safe and effective staffing3 → 2')
    expect(section).toHaveTextContent('Got better (1)')
    expect(section).toHaveTextContent('Got worse (1)')
    expect(section).toHaveTextContent('2 stayed the same.')
  })

  it('shows one branch’s comparison when picked', async () => {
    wrap(<CqcDashboardPage />)
    const section = await screen.findByTestId('cqc-mock-comparison')
    const picker = within(section).getByTestId('cqc-mock-comparison-branch')
    expect(within(picker).getAllByRole('option').map(o => o.textContent)).toEqual([
      'All branches',
      'Croydon',
      'Whole organisation',
    ])
    fireEvent.change(picker, { target: { value: 'loc-a' } })
    expect(within(section).getAllByTestId('cqc-mock-compared')).toHaveLength(1)
    expect(section).toHaveTextContent('Latest: Infection control (20/11/2026)Before: Mock inspection, November 2026')
    expect(section).not.toHaveTextContent('Whole org, autumn')
    expect(section).not.toHaveTextContent('average of these')
    expect(section).toHaveTextContent('+6.3 pts')
    expect(within(section).getByTestId('mock-compare-up')).toHaveTextContent('Infection prevention and control3 → 4')
    expect(within(section).queryByTestId('mock-compare-down')).toBeNull()
    fireEvent.change(picker, { target: { value: 'org' } })
    expect(section).toHaveTextContent('-18.8 pts')
    fireEvent.change(picker, { target: { value: '' } })
    expect(section).toHaveTextContent('The numbers below are the average of these 2 branches.')
  })

  it('says when there is nothing to compare with', async () => {
    apiJson.mockImplementation(async () => ({ data: { ...DASHBOARD, mock: { ...DASHBOARD.mock!, comparison: null } } }))
    wrap(<CqcDashboardPage />)
    expect(await screen.findByTestId('cqc-mock-comparison')).toHaveTextContent(
      'Nothing to compare yet: no branch has two finished mock inspections.',
    )
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
