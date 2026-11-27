import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
const apiBlob = vi.fn()
vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  apiBlob: (...a: unknown[]) => apiBlob(...a),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
const can = vi.fn((_perm?: string) => true)
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: { can: (p: string) => boolean }) => unknown) => sel({ can }),
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({ useLocationManagementTree: () => ({ data: undefined }) }))
vi.mock('@/features/locations/utils/flatten-location-options.util', () => ({
  flattenLocationOptionsFromTree: () => [{ id: 'loc-a', label: 'Greenwich' }],
}))
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ inspectionId: 'insp-1' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}))

import MockInspectionPage from './pages/MockInspectionPage'
import type { MockInspectionDetail, MockStatement } from './types'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const st = (id: string, title: string, over: Partial<MockStatement> = {}): MockStatement => ({
  id,
  code: id.toUpperCase(),
  title,
  summary: `${title} summary`,
  score: null,
  strengths: null,
  concerns: null,
  notes: null,
  reviewedBy: null,
  reviewedAt: null,
  snapshotAt: '2026-11-17T10:00:00.000Z',
  gap: false,
  evidence: [],
  hiddenEvidenceCount: 0,
  ...over,
})

const detail = (over: Partial<MockInspectionDetail> = {}): MockInspectionDetail => ({
  id: 'insp-1',
  title: 'Mock inspection, November 2026',
  status: 'IN_PROGRESS',
  notes: null,
  location: { id: 'loc-a', name: 'Greenwich' },
  framework: { id: 'fv-1', version: 1, code: 'SAF', title: 'CQC single assessment framework' },
  scale: [
    { score: 1, label: 'Significant shortfalls' },
    { score: 2, label: 'Some shortfalls' },
    { score: 3, label: 'Good standard' },
    { score: 4, label: 'Exceptional standard' },
  ],
  checkScoring: { metPoints: 3, partlyMetPoints: 1, notMetPoints: 0, score4Percent: 90, score3Percent: 70, score2Percent: 40 },
  leadReviewer: { id: 'u1', name: 'Sam Manager' },
  createdBy: { id: 'u1', name: 'Sam Manager' },
  startedAt: '2026-11-17T10:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  result: {
    keyQuestions: [
      { keyQuestionCode: 'SAFE', statementCount: 2, scoredCount: 1, total: 1, max: 4, percent: 25, bandRating: 'INADEQUATE', rating: 'INADEQUATE', limitedFrom: null, complete: false },
      { keyQuestionCode: 'CARING', statementCount: 1, scoredCount: 0, total: 0, max: 0, percent: null, bandRating: null, rating: null, limitedFrom: null, complete: false },
    ],
    overall: null,
    complete: false,
    unscoredStatementIds: ['s2', 's3'],
  },
  keyQuestions: [
    {
      code: 'SAFE',
      title: 'Safe',
      statements: [
        st('s1', 'Learning culture', {
          score: 1,
          evidence: [
            { evidenceId: 'e1', title: 'Incident learning log', sourceType: 'INCIDENT_LEARNING', sourceId: null, sourceLabel: null, categoryCode: 'PROCESSES', date: '2026-10-01T00:00:00.000Z', reviewDueAt: null, reviewOverdue: true, attachmentCount: 2 },
          ],
          hiddenEvidenceCount: 1,
        }),
        st('s2', 'Safe systems', { gap: true }),
      ],
    },
    { code: 'CARING', title: 'Caring', statements: [st('s3', 'Kindness')] },
  ],
  actions: [],
  ...over,
})

beforeEach(() => {
  apiJson.mockReset()
  apiBlob.mockReset()
  can.mockReturnValue(true)
})

describe('mock inspection workspace', () => {
  it('shows key question ratings, the evidence for a statement, and hidden and missing evidence', async () => {
    apiJson.mockResolvedValue({ data: detail() })
    wrap(<MockInspectionPage />)
    expect(await screen.findByText('Learning culture summary')).toBeInTheDocument()
    const cards = screen.getAllByTestId('mock-kq-card')
    expect(within(cards[0]).getByText('Inadequate')).toBeInTheDocument()
    expect(within(cards[1]).getByText('Not scored yet')).toBeInTheDocument()
    // Each card has its own ⓘ beside it (not inside the card button).
    expect(screen.getByRole('button', { name: 'About Safe' })).toBeInTheDocument()
    expect(within(cards[0]).queryByRole('button', { name: 'About Safe' })).not.toBeInTheDocument()
    expect(screen.getByText('Incident learning log')).toBeInTheDocument()
    expect(screen.getByText('Review overdue')).toBeInTheDocument()
    expect(screen.getByText(/1 more from surveys whose results you cannot see/)).toBeInTheDocument()
    expect(screen.getByTestId('mock-overall-rating')).toHaveTextContent('when every statement is scored (1/3)')
    expect(screen.getByText('1 statement with no evidence')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Safe systems/ }))
    expect(screen.getByTestId('mock-statement-gap')).toBeInTheDocument()
    // People who keep evidence can go straight to adding some for this statement.
    expect(within(screen.getByTestId('mock-statement-gap')).getByText('Add evidence')).toBeInTheDocument()
  })

  it('scores a statement without checks by hand and moves to the next unscored statement', async () => {
    apiJson.mockImplementation(async (_url: string, init?: RequestInit) => ({ data: detail(), method: init?.method }))
    wrap(<MockInspectionPage />)
    await screen.findByText('Learning culture summary')
    fireEvent.click(screen.getByTestId('mock-score-2'))
    fireEvent.click(screen.getByTestId('mock-save-statement'))
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/cqc-mock-inspections/insp-1/statements/s1', expect.objectContaining({ method: 'PATCH' })),
    )
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/cqc-mock-inspections/insp-1/statements/s1')![1].body)
    expect(body).toEqual({ score: 2 })
    expect(await screen.findByText('Safe systems summary')).toBeInTheDocument()
  })

  it('is read-only without manage permission, and for a completed inspection shows the frozen overall rating', async () => {
    can.mockReturnValue(false)
    apiJson.mockResolvedValue({
      data: detail({ status: 'COMPLETED', result: { ...detail().result!, overall: 'REQUIRES_IMPROVEMENT', complete: true } }),
    })
    wrap(<MockInspectionPage />)
    await screen.findByText('Learning culture summary')
    expect(screen.getByTestId('mock-overall-rating')).toHaveTextContent('Requires improvement')
    expect(screen.queryByTestId('mock-save-statement')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-score-3')).toBeDisabled()
  })

  it('downloads the PDF report, also for read-only users', async () => {
    can.mockReturnValue(false)
    apiJson.mockResolvedValue({ data: detail() })
    apiBlob.mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }))
    const createObjectURL = vi.fn(() => 'blob:report')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    wrap(<MockInspectionPage />)
    await screen.findByText('Learning culture summary')
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
    await waitFor(() => expect(apiBlob).toHaveBeenCalledWith('/cqc-mock-inspections/insp-1/export', { method: 'GET' }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(createObjectURL).toHaveBeenCalled()
    click.mockRestore()
  })

  it('opens the evidence pack for the service, and for one statement on the same branch', async () => {
    apiJson.mockImplementation(async (url: string) =>
      url === '/cqc-evidence/framework' ? { data: { keyQuestions: [] } } : { data: detail() },
    )
    wrap(<MockInspectionPage />)
    await screen.findByText('Learning culture summary')
    fireEvent.click(screen.getByRole('button', { name: 'Evidence pack' }))
    expect(await screen.findByTestId('evidence-pack-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('evidence-pack-scope')).toHaveValue('')
    expect(screen.getByTestId('evidence-pack-location')).toHaveValue('loc-a')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByTestId('evidence-pack-dialog')).not.toBeInTheDocument())

    fireEvent.click(screen.getByTestId('mock-statement-evidence-pack'))
    expect(await screen.findByTestId('evidence-pack-dialog')).toBeInTheDocument()
    // The statement is offered even before (or without) the framework list.
    expect((screen.getByTestId('evidence-pack-scope') as HTMLSelectElement).value).toBe('st:s1')
  })

  it('shows no evidence pack to users who may not download one', async () => {
    can.mockImplementation((p: string) => p !== 'cqc_evidence.export')
    apiJson.mockResolvedValue({ data: detail() })
    wrap(<MockInspectionPage />)
    await screen.findByText('Learning culture summary')
    expect(screen.queryByRole('button', { name: 'Evidence pack' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-statement-evidence-pack')).not.toBeInTheDocument()
  })

  it('compares with the previous completed inspection of the service', async () => {
    apiJson.mockImplementation(async (url: string) =>
      url.endsWith('/comparison')
        ? {
            data: {
              previous: { id: 'insp-0', title: 'August mock', completedAt: '2026-08-01T12:00:00.000Z', overall: 'REQUIRES_IMPROVEMENT' },
              comparison: {
                overall: { from: 'REQUIRES_IMPROVEMENT', to: 'GOOD' },
                keyQuestions: [
                  { code: 'SAFE', title: 'Safe', fromRating: 'REQUIRES_IMPROVEMENT', toRating: 'GOOD', fromPercent: 50, toPercent: 71.9, change: 21.9 },
                  { code: 'CARING', title: 'Caring', fromRating: 'GOOD', toRating: 'GOOD', fromPercent: 75, toPercent: 62.5, change: -12.5 },
                ],
                improved: [{ code: 'S1', title: 'Learning culture', from: 1, to: 3 }],
                declined: [{ code: 'S3', title: 'Kindness', from: 4, to: 2 }],
                unchangedCount: 5,
              },
            },
          }
        : { data: detail() },
    )
    wrap(<MockInspectionPage />)
    const card = await screen.findByTestId('mock-comparison')
    expect(await within(card).findByText('August mock')).toBeInTheDocument()
    const rows = within(card).getAllByTestId('mock-compare-kq')
    expect(rows[0]).toHaveTextContent('+21.9 pts')
    expect(rows[1]).toHaveTextContent('-12.5 pts')
    expect(within(card).getByTestId('mock-compare-up')).toHaveTextContent('Learning culture1 → 3')
    expect(within(card).getByTestId('mock-compare-down')).toHaveTextContent('Kindness4 → 2')
    expect(within(card).getByText('5 stayed the same.')).toBeInTheDocument()
  })

  it('says when there is nothing to compare with yet', async () => {
    apiJson.mockImplementation(async (url: string) =>
      url.endsWith('/comparison') ? { data: { previous: null, comparison: null } } : { data: detail() },
    )
    wrap(<MockInspectionPage />)
    expect(await screen.findByText(/No earlier completed mock inspection of this service yet/)).toBeInTheDocument()
  })

  it('explains each part of the page in an info tip', async () => {
    apiJson.mockResolvedValue({ data: detail() })
    wrap(<MockInspectionPage />)
    await screen.findByText('Learning culture summary')
    for (const name of [
      'About status',
      'About overall rating',
      'About statements with no evidence',
      'About key questions',
      'About quality statements',
      'About evidence',
      'About score',
      'About improvement actions',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    fireEvent.focus(screen.getByRole('button', { name: 'About score' }))
    expect((await screen.findAllByText(/big problems/)).length).toBeGreaterThan(0)
  })

  it('shows the checks as questions answered Met, Partially met or Not met, and saves the answers', async () => {
    const guidance = {
      lookAt: ['MAR charts for 3 people', 'Medicine error log'],
      askPeople: [],
      askStaff: ['What if a dose is missed?'],
      inCareFlow: ['eMAR'],
    }
    const base = detail()
    const first = {
      ...base.keyQuestions[0].statements[0],
      focus: 'Errors and near misses.',
      guidance,
      checks: [{ part: 'lookAt' as const, text: 'Medicine error log', answer: 'NOT_MET' as const, note: 'Two errors not logged' }],
    }
    apiJson.mockResolvedValue({
      data: {
        ...base,
        template: { code: 'MI-006', title: 'Medicines management' },
        result: { ...base.result!, overallApplies: false, complete: true },
        keyQuestions: [{ ...base.keyQuestions[0], statements: [first, base.keyQuestions[0].statements[1]] }, base.keyQuestions[1]],
      },
    })
    wrap(<MockInspectionPage />)
    const checks = await screen.findByTestId('mock-statement-checks')
    expect(screen.getByTestId('mock-statement-focus')).toHaveTextContent('Errors and near misses.')
    const rows = within(checks).getAllByTestId('mock-check')
    expect(rows).toHaveLength(3)
    // The inspection's own settings, in plain words.
    expect(within(checks).getByTestId('mock-check-scoring')).toHaveTextContent(
      'Met 3 · Partially met 1 · Not met 0 points. Score 4 at 90% · 3 at 70% · 2 at 40% · below that 1.',
    )
    expect(rows[0]).toHaveTextContent('1.MAR charts for 3 people')
    expect(rows[2]).toHaveTextContent('3.What if a dose is missed?')
    expect(within(checks).getByText('Ask staff')).toBeInTheDocument()
    expect(within(checks).queryByText('Ask people we support')).not.toBeInTheDocument()
    expect(within(checks).getByText('eMAR')).toBeInTheDocument()
    // The saved answer shows, and the tally counts it.
    expect(within(rows[1]).getByTestId('mock-check-NOT_MET')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('mock-checks-tally')).toHaveTextContent('1 of 3 answered')

    fireEvent.click(within(rows[0]).getByTestId('mock-check-MET'))
    fireEvent.click(within(rows[2]).getByTestId('mock-check-PARTIALLY_MET'))
    // Clicking the chosen answer again clears it.
    fireEvent.click(within(rows[1]).getByTestId('mock-check-NOT_MET'))
    expect(screen.getByTestId('mock-checks-tally')).toHaveTextContent('2 of 3 answered · 1 met · 1 partially met · 0 not met')
    // A note is optional when met, but needed when partially met: saving without it is stopped.
    expect(within(rows[0]).getByText('Notes (optional)')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Notes (required)')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('mock-save-statement'))
    expect(await within(rows[2]).findByTestId('mock-check-note-missing')).toBeInTheDocument()
    expect(within(rows[0]).queryByTestId('mock-check-note-missing')).not.toBeInTheDocument()
    expect(apiJson.mock.calls.some(c => c[0] === '/cqc-mock-inspections/insp-1/statements/s1')).toBe(false)
    fireEvent.change(within(rows[2]).getByTestId('mock-check-note'), { target: { value: '  One carer was unsure  ' } })
    fireEvent.click(screen.getByTestId('mock-save-statement'))
    await waitFor(() => expect(apiJson.mock.calls.some(c => c[0] === '/cqc-mock-inspections/insp-1/statements/s1')).toBe(true))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/cqc-mock-inspections/insp-1/statements/s1')![1].body)
    expect(body.checks).toEqual([
      { part: 'lookAt', text: 'MAR charts for 3 people', answer: 'MET', note: null },
      { part: 'askStaff', text: 'What if a dose is missed?', answer: 'PARTIALLY_MET', note: 'One carer was unsure' },
    ])
    expect(screen.getByTestId('mock-template-name')).toHaveTextContent('Ready-made:Medicines management')
    expect(screen.getByTestId('mock-overall-rating')).toHaveTextContent('not given for a focused inspection')

    // A statement without guidance shows no checks.
    fireEvent.click(screen.getByRole('button', { name: /Safe systems/ }))
    expect(screen.queryByTestId('mock-statement-checks')).not.toBeInTheDocument()
  })

  it('creates an action from a check for a staff member, showing the check and its note, and lists it under the check', async () => {
    const guidance = { lookAt: ['Hand washing seen'], askPeople: [], askStaff: [], inCareFlow: [] }
    const base = detail()
    const first = {
      ...base.keyQuestions[0].statements[0],
      guidance,
      checks: [{ part: 'lookAt' as const, text: 'Hand washing seen', answer: 'NOT_MET' as const, note: 'One carer skipped it' }],
    }
    const withCheck = {
      ...base,
      keyQuestions: [{ ...base.keyQuestions[0], statements: [first, base.keyQuestions[0].statements[1]] }, base.keyQuestions[1]],
    }
    let current: MockInspectionDetail = withCheck
    apiJson.mockImplementation(async (url: string) =>
      url.startsWith('/employees')
        ? {
            data: [
              { id: 'emp-1', fullName: 'Amina Khan', firstName: 'Amina', lastName: 'Khan', jobTitle: { id: 'j1', name: 'Care worker' } },
              { id: 'emp-2', fullName: 'Tom Reed', firstName: 'Tom', lastName: 'Reed', jobTitle: { id: 'j1', name: 'Care worker' } },
            ],
            meta: {},
          }
        : { data: current },
    )
    wrap(<MockInspectionPage />)
    const check = (await screen.findAllByTestId('mock-check'))[0]
    fireEvent.click(within(check).getByTestId('mock-check-create-action'))
    const dialog = await screen.findByTestId('mock-action-dialog')
    const context = within(dialog).getByTestId('mock-action-check')
    expect(context).toHaveTextContent('Hand washing seen')
    expect(context).toHaveTextContent('Not met')
    expect(context).toHaveTextContent('One carer skipped it')
    // The statement is fixed by the check.
    expect(within(dialog).queryByLabelText(/Quality statement/)).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByTestId('mock-action-title'), { target: { value: 'Hand hygiene refresher' } })
    // Assign it to two staff members: each pick is added to the list.
    fireEvent.click(within(dialog).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: /Amina Khan/ }))
    fireEvent.click(within(dialog).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: /Tom Reed/ }))
    expect(within(dialog).getByTestId('mock-action-assignees')).toHaveTextContent('Amina Khan')
    expect(within(dialog).getByTestId('mock-action-assignees')).toHaveTextContent('Tom Reed')
    current = {
        ...withCheck,
        actions: [
          {
            id: 'a9',
            statementId: 's1',
            checkText: 'Hand washing seen',
            title: 'Hand hygiene refresher',
            detail: null,
            owner: null,
            assignedEmployees: [
              { id: 'emp-1', name: 'Amina Khan' },
              { id: 'emp-2', name: 'Tom Reed' },
            ],
            dueAt: null,
            status: 'OPEN',
            completedAt: null,
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        ],
      }
    fireEvent.click(within(dialog).getByTestId('mock-action-save'))
    await waitFor(() => expect(apiJson.mock.calls.some(c => c[0] === '/cqc-mock-inspections/insp-1/actions')).toBe(true))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/cqc-mock-inspections/insp-1/actions')![1].body)
    expect(body).toMatchObject({
      title: 'Hand hygiene refresher',
      statementId: 's1',
      checkText: 'Hand washing seen',
      assignedEmployeeIds: ['emp-1', 'emp-2'],
    })
    const listed = await within(check).findByTestId('mock-check-actions')
    expect(listed).toHaveTextContent('Hand hygiene refresher')
    expect(listed).toHaveTextContent('for Amina Khan, Tom Reed')
    // The action can be changed or deleted right under its check too.
    expect(within(listed).getByTestId('mock-action-edit')).toBeInTheDocument()
    expect(within(listed).getByTestId('mock-action-delete')).toBeInTheDocument()
    expect(screen.getByTestId('mock-actions')).toHaveTextContent('For Amina Khan, Tom Reed')
  })

  it('edits an improvement action (text, staff, due date) and deletes one after confirming', async () => {
    const action = {
      id: 'a1',
      statementId: null,
      checkText: null,
      title: 'Hand hygiene refresher',
      detail: 'For new starters',
      owner: null,
      assignedEmployees: [{ id: 'emp-1', name: 'Amina Khan' }],
      dueAt: '2026-12-31T00:00:00.000Z',
      status: 'OPEN' as const,
      completedAt: null,
      createdAt: '2026-11-20T00:00:00.000Z',
    }
    apiJson.mockImplementation(async (url: string) =>
      url.startsWith('/employees') ? { data: [], meta: {} } : { data: detail({ actions: [action] }) },
    )
    wrap(<MockInspectionPage />)
    const row = await screen.findByTestId('mock-action-row')

    fireEvent.click(within(row).getByTestId('mock-action-edit'))
    const dialog = await screen.findByTestId('mock-action-dialog')
    expect(within(dialog).getByText('Edit improvement action')).toBeInTheDocument()
    expect(within(dialog).getByTestId('mock-action-title')).toHaveValue('Hand hygiene refresher')
    expect(within(dialog).getByTestId('mock-action-assignees')).toHaveTextContent('Amina Khan')
    fireEvent.change(within(dialog).getByTestId('mock-action-title'), { target: { value: 'Hand hygiene refresher for all' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Amina Khan' }))
    fireEvent.click(within(dialog).getByTestId('mock-action-save'))
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/cqc-mock-inspections/insp-1/actions/a1', expect.objectContaining({ method: 'PATCH' })),
    )
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/cqc-mock-inspections/insp-1/actions/a1')![1].body)
    expect(body).toEqual({
      title: 'Hand hygiene refresher for all',
      detail: 'For new starters',
      statementId: null,
      assignedEmployeeIds: [],
      dueAt: '2026-12-31',
    })

    fireEvent.click(within(row).getByTestId('mock-action-delete'))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/cqc-mock-inspections/insp-1/actions/a1', expect.objectContaining({ method: 'DELETE' })),
    )
  })

  it('shows no edit or delete for read-only users', async () => {
    can.mockReturnValue(false)
    apiJson.mockResolvedValue({
      data: detail({
        actions: [
          {
            id: 'a1',
            statementId: null,
            checkText: null,
            title: 'Hand hygiene refresher',
            detail: null,
            owner: null,
            assignedEmployees: [],
            dueAt: null,
            status: 'OPEN',
            completedAt: null,
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        ],
      }),
    })
    wrap(<MockInspectionPage />)
    const row = await screen.findByTestId('mock-action-row')
    expect(within(row).queryByTestId('mock-action-edit')).not.toBeInTheDocument()
    expect(within(row).queryByTestId('mock-action-delete')).not.toBeInTheDocument()
  })

  it('shows no score boxes or Strengths, Concerns and Notes for a statement with checks: its score comes from them', async () => {
    const guidance = { lookAt: ['Check A'], askPeople: [], askStaff: [], inCareFlow: [] }
    const base = detail()
    const first = { ...base.keyQuestions[0].statements[0], score: null, guidance, checks: [] }
    apiJson.mockResolvedValue({
      data: { ...base, keyQuestions: [{ ...base.keyQuestions[0], statements: [first, base.keyQuestions[0].statements[1]] }, base.keyQuestions[1]] },
    })
    wrap(<MockInspectionPage />)
    const row = (await screen.findAllByTestId('mock-check'))[0]
    expect(screen.queryByRole('radiogroup', { name: 'Score' })).not.toBeInTheDocument()
    expect(screen.queryByText('Strengths')).not.toBeInTheDocument()
    expect(screen.queryByText('Concerns')).not.toBeInTheDocument()
    fireEvent.click(within(row).getByTestId('mock-check-MET'))
    fireEvent.click(screen.getByTestId('mock-save-statement'))
    await waitFor(() => expect(apiJson.mock.calls.some(c => c[0] === '/cqc-mock-inspections/insp-1/statements/s1')).toBe(true))
    // Only the answers are sent; the server works out the score.
    const body = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/cqc-mock-inspections/insp-1/statements/s1')![1].body)
    expect(body).toEqual({ checks: [{ part: 'lookAt', text: 'Check A', answer: 'MET', note: null }] })
  })

  it('keeps the policies in a dropdown below the checks, closed to start with', async () => {
    const base = detail()
    const policy = (id: string, title: string, adoptedPolicyId: string | null) => ({
      id,
      reference: id.toUpperCase(),
      title,
      documentType: 'POLICY',
      adoptedPolicyId,
      adoptedStatus: adoptedPolicyId ? 'PUBLISHED' : null,
      canUndoAdopt: false,
    })
    apiJson.mockImplementation(async (url: string) => {
      if (url.endsWith('/statement-policies'))
        return { data: { S1: [policy('pol-a', 'Incident policy', 'mine-a'), policy('pol-b', 'Duty of candour', null)] } }
      if (url.endsWith('/statement-surveys')) return { data: {} }
      return { data: base }
    })
    wrap(<MockInspectionPage />)
    const toggle = await screen.findByTestId('mock-related-policies-toggle')
    expect(toggle).toHaveTextContent('Policies that apply (2)')
    expect(toggle).toHaveTextContent('1 of 2 adopted')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Incident policy')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.getByText('Incident policy')).toBeInTheDocument()
    expect(screen.getByText('Duty of candour')).toBeInTheDocument()
  })
})
