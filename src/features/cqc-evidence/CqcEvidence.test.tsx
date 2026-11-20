import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  apiBlob: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
const can = vi.fn((_perm?: string) => true)
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ can, user: { assignedLocationIds: null } }),
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({
  useLocationManagementTree: () => ({ data: undefined }),
}))
vi.mock('@/features/locations/utils/flatten-location-options.util', () => ({
  flattenLocationOptionsFromTree: () => [{ id: 'loc-a', label: 'Greenwich' }],
}))
let routeSearch: { add?: string; from?: string } = {}
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _p, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
  useSearch: () => routeSearch,
}))

import CqcEvidencePage from './pages/CqcEvidencePage'

const statement = (id: string, title: string, evidenceCount: number, reviewOverdue = 0) => ({
  id,
  code: id.toUpperCase(),
  title,
  summary: '',
  evidenceCount,
  latestEvidenceAt: null,
  reviewOverdue,
  sourceTypes: [],
  categoryCodes: [],
  gap: evidenceCount === 0,
})

const overview = {
  framework: { id: 'fw', version: 1, code: 'SAF', title: 'CQC', checkedOn: null },
  categories: [],
  totals: { statements: 3, covered: 2, gaps: 1, currentEvidence: 4, reviewOverdue: 1, unverifiedTitles: 0 },
  keyQuestions: [
    {
      id: 'kq-safe',
      code: 'SAFE',
      title: 'Safe',
      summary: '',
      statementCount: 2,
      coveredCount: 1,
      gapCount: 1,
      statements: [statement('s-meds', 'Medicines optimisation', 3, 1), statement('s-ipc', 'Infection prevention and control', 0)],
    },
    {
      id: 'kq-wl',
      code: 'WELL_LED',
      title: 'Well-led',
      summary: '',
      statementCount: 1,
      coveredCount: 1,
      gapCount: 0,
      statements: [statement('s-gov', 'Governance', 1)],
    },
  ],
}

const row = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  summary: 'Summary of the evidence',
  sourceType: 'AUDIT',
  sourceLabel: null,
  source: null,
  categoryCode: 'PROCESSES',
  categoryTitle: 'Processes',
  periodStart: '2026-07-01T00:00:00.000Z',
  periodEnd: '2026-09-30T00:00:00.000Z',
  locations: [],
  status: 'CURRENT',
  reviewDueAt: '2027-01-31T00:00:00.000Z',
  reviewOverdue: false,
  reviewDueSoon: false,
  statements: [
    { id: 's-meds', code: 'S_MEDS', title: 'Medicines optimisation', keyQuestionCode: 'SAFE', keyQuestionTitle: 'Safe', current: true },
  ],
  attachmentCount: 0,
  automatic: false,
  addedBy: null,
  createdAt: '2026-11-20T00:00:00.000Z',
  ...extra,
})

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CqcEvidencePage />
    </QueryClientProvider>,
  )

const listCalls = () => apiJson.mock.calls.map(c => c[0] as string).filter(u => u.startsWith('/cqc-evidence?'))
const lastList = () => Object.fromEntries(new URLSearchParams(listCalls().at(-1)!.split('?')[1]))

const detail = {
  ...row('e1', 'Medication audit Q3', { attachmentCount: 1 }),
  notes: 'Team only',
  actions: [{ youSaid: 'Visits were late', weDid: 'We changed the rota' }],
  locationIds: [],
  attachments: [
    { id: 'f1', fileName: 'Audit Q3.pdf', mimeType: 'application/pdf', sizeBytes: 20480, createdAt: '2026-11-20T00:00:00.000Z', uploadedByName: 'Sam' },
  ],
  updatedBy: null,
  archivedAt: null,
  updatedAt: '2026-11-20T00:00:00.000Z',
}

const calls = (method: string, path: string) =>
  apiJson.mock.calls.filter(c => c[0] === path && (c[1] as RequestInit | undefined)?.method === method)
const bodyOf = (method: string, path: string) => JSON.parse(calls(method, path).at(-1)![1].body as string)

beforeEach(() => {
  apiJson.mockReset()
  can.mockImplementation(() => true)
  routeSearch = {}
  apiJson.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith('/cqc-evidence/overview')) return { data: overview }
    if (url === '/cqc-evidence' && init?.method === 'POST') return { data: { ...detail, id: 'new-1' } }
    if (url.startsWith('/cqc-evidence/e1') || url.startsWith('/cqc-evidence/new-1')) return { data: detail }
    if (url.startsWith('/cqc-evidence?')) {
      return {
        data: [
          row('e1', 'Medication audit Q3', { attachmentCount: 2 }),
          row('e2', 'Safeguarding training', { reviewOverdue: true, locations: [{ id: 'loc-a', name: 'Greenwich' }] }),
          row('e3', 'People we support survey', {
            sourceType: 'SURVEY_RESULT',
            source: { kind: 'survey', surveyId: 'sv-1', seriesId: null },
            periodStart: '2026-09-12T00:00:00.000Z',
            periodEnd: '2026-09-12T00:00:00.000Z',
          }),
        ],
        meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
      }
    }
    return { data: [] }
  })
})

describe('CQC evidence page', () => {
  it('shows the totals, each key question with its statements, and the evidence', async () => {
    wrap()
    await waitFor(() => expect(screen.getByTestId('cqc-evidence-covered')).toHaveTextContent('2 / 3'))
    expect(screen.getByTestId('cqc-evidence-gaps')).toHaveTextContent('1')
    expect(screen.getByTestId('cqc-evidence-overdue')).toHaveTextContent('1')
    const kqs = screen.getAllByTestId('cqc-evidence-kq')
    expect(kqs).toHaveLength(2)
    expect(within(kqs[0]).getByText('1 of 2 with evidence')).toBeInTheDocument()
    expect(within(kqs[0]).getByText('No evidence')).toBeInTheDocument()

    const rows = await screen.findAllByTestId('cqc-evidence-row')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByLabelText('2 files')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Overdue')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Greenwich')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Open the survey')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Whole organisation')).toBeInTheDocument()
    expect(lastList()).toEqual({ page: '1', limit: '20' })
  })

  it('lists one statement when it is clicked, and every statement again after', async () => {
    wrap()
    await screen.findAllByTestId('cqc-evidence-row')
    fireEvent.click(screen.getByRole('button', { name: /Infection prevention and control/ }))
    await waitFor(() => expect(lastList()).toEqual(expect.objectContaining({ statementId: 's-ipc' })))
    expect(screen.getByText('Evidence for: Infection prevention and control')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('cqc-evidence-clear-statement'))
    await waitFor(() => expect(lastList().statementId).toBeUndefined())
  })

  it('filters by branch, key question, type, category, status and search', async () => {
    wrap()
    await screen.findAllByTestId('cqc-evidence-row')
    fireEvent.change(screen.getByTestId('cqc-evidence-branch'), { target: { value: 'loc-a' } })
    fireEvent.change(screen.getByTestId('cqc-evidence-kq-filter'), { target: { value: 'SAFE' } })
    fireEvent.change(screen.getByTestId('cqc-evidence-type-filter'), { target: { value: 'TRAINING' } })
    fireEvent.change(screen.getByTestId('cqc-evidence-category-filter'), { target: { value: 'OUTCOMES' } })
    fireEvent.change(screen.getByTestId('cqc-evidence-status-filter'), { target: { value: 'ALL' } })
    fireEvent.change(screen.getByTestId('cqc-evidence-search'), { target: { value: 'audit' } })
    await waitFor(() =>
      expect(lastList()).toEqual({
        page: '1',
        limit: '20',
        locationId: 'loc-a',
        keyQuestion: 'SAFE',
        sourceType: 'TRAINING',
        categoryCode: 'OUTCOMES',
        status: 'ALL',
        search: 'audit',
      }),
    )
    // The overview follows the branch too.
    expect(apiJson).toHaveBeenCalledWith('/cqc-evidence/overview?locationId=loc-a', { method: 'GET' })
  })

  it('offers the evidence pack only to users who may download it', async () => {
    wrap()
    await screen.findAllByTestId('cqc-evidence-row')
    expect(screen.getByRole('button', { name: 'Evidence pack' })).toBeInTheDocument()
  })

  it('hides the evidence pack from users without the export permission', async () => {
    can.mockImplementation((p?: string) => p !== 'cqc_evidence.export')
    wrap()
    await screen.findAllByTestId('cqc-evidence-row')
    expect(screen.queryByRole('button', { name: 'Evidence pack' })).not.toBeInTheDocument()
  })

  it('adds evidence: checks the form, then saves it and opens it for its files', async () => {
    wrap()
    await screen.findAllByTestId('cqc-evidence-row')
    fireEvent.click(screen.getByRole('button', { name: 'Add evidence' }))
    const dialog = await screen.findByTestId('evidence-form-dialog')
    fireEvent.click(within(dialog).getByTestId('evidence-save'))
    expect(within(dialog).getByTestId('evidence-form-error')).toHaveTextContent('Give the evidence a title')
    fireEvent.change(within(dialog).getByTestId('evidence-title'), { target: { value: 'Infection control spot checks' } })
    fireEvent.click(within(dialog).getByTestId('evidence-save'))
    expect(within(dialog).getByTestId('evidence-form-error')).toHaveTextContent('Choose at least one quality statement')

    fireEvent.change(within(dialog).getByTestId('evidence-type'), { target: { value: 'COMPLAINT' } })
    // The category follows the type.
    expect(within(dialog).getByTestId('evidence-category')).toHaveValue('PEOPLES_EXPERIENCE')
    fireEvent.click(within(dialog).getByLabelText('Infection prevention and control'))
    fireEvent.change(within(dialog).getByTestId('evidence-summary'), { target: { value: 'Two reminders given' } })
    fireEvent.click(within(dialog).getByTestId('evidence-add-pair'))
    fireEvent.change(within(dialog).getByLabelText('You said 1'), { target: { value: 'Gloves ran out' } })
    fireEvent.click(within(dialog).getByTestId('evidence-save'))
    expect(within(dialog).getByTestId('evidence-form-error')).toHaveTextContent('Fill in both')
    fireEvent.change(within(dialog).getByLabelText('We did 1'), { target: { value: 'We keep spare boxes in each car' } })
    fireEvent.click(within(dialog).getByTestId('evidence-save'))

    await waitFor(() => expect(calls('POST', '/cqc-evidence')).toHaveLength(1))
    expect(bodyOf('POST', '/cqc-evidence')).toEqual(
      expect.objectContaining({
        title: 'Infection control spot checks',
        summary: 'Two reminders given',
        sourceType: 'COMPLAINT',
        categoryCode: 'PEOPLES_EXPERIENCE',
        statementIds: ['s-ipc'],
        locationIds: [],
        actions: [{ youSaid: 'Gloves ran out', weDid: 'We keep spare boxes in each car' }],
      }),
    )
    // A review date a year ahead is filled in.
    expect(bodyOf('POST', '/cqc-evidence').reviewDueAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(await screen.findByTestId('evidence-detail-dialog')).toBeInTheDocument()
  })

  it('starts "Add evidence" on the statement chosen, and on ?add= from a mock inspection', async () => {
    routeSearch = { add: 's-gov', from: 'insp-1' }
    wrap()
    const dialog = await screen.findByTestId('evidence-form-dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Governance')).toBeChecked())
    // The way back to the inspection, and what to do there.
    expect(screen.getByTestId('cqc-evidence-from-inspection')).toHaveTextContent('Refresh evidence')
    expect(screen.getByTestId('cqc-evidence-back-to-inspection')).toHaveTextContent('Back to the mock inspection')
  })

  it('shows no way back when it was not opened from a mock inspection', async () => {
    wrap()
    await screen.findAllByTestId('cqc-evidence-row')
    expect(screen.queryByTestId('cqc-evidence-from-inspection')).not.toBeInTheDocument()
  })

  it('shows one piece of evidence with its files; attaches, removes and archives after confirming', async () => {
    wrap()
    fireEvent.click((await screen.findAllByTestId('cqc-evidence-open'))[0])
    const dialog = await screen.findByTestId('evidence-detail-dialog')
    expect(await within(dialog).findByText('Audit Q3.pdf')).toBeInTheDocument()
    expect(within(dialog).getByText('We changed the rota')).toBeInTheDocument()
    expect(within(dialog).getByText('Team only')).toBeInTheDocument()

    const file = new File(['%PDF-1.4'], 'Minutes.pdf', { type: 'application/pdf' })
    fireEvent.change(within(dialog).getByTestId('evidence-file-input'), { target: { files: [file] } })
    await waitFor(() => expect(calls('POST', '/cqc-evidence/e1/attachments')).toHaveLength(1))
    expect(calls('POST', '/cqc-evidence/e1/attachments')[0][1].body).toBeInstanceOf(FormData)

    fireEvent.click(within(dialog).getByTestId('evidence-remove-file'))
    fireEvent.click(await screen.findByTestId('evidence-remove-file-confirm'))
    await waitFor(() => expect(calls('DELETE', '/cqc-evidence/e1/attachments/f1')).toHaveLength(1))

    fireEvent.click(within(dialog).getByTestId('evidence-archive'))
    fireEvent.click(await screen.findByTestId('evidence-status-confirm'))
    await waitFor(() => expect(bodyOf('PATCH', '/cqc-evidence/e1')).toEqual({ status: 'ARCHIVED' }))
  })

  it('refuses a file over 25 MB before sending it', async () => {
    wrap()
    fireEvent.click((await screen.findAllByTestId('cqc-evidence-open'))[0])
    const dialog = await screen.findByTestId('evidence-detail-dialog')
    await within(dialog).findByText('Audit Q3.pdf')
    const big = new File(['x'], 'Huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 26 * 1024 * 1024 })
    fireEvent.change(within(dialog).getByTestId('evidence-file-input'), { target: { files: [big] } })
    expect(await within(dialog).findByText(/over 25 MB/)).toBeInTheDocument()
    expect(calls('POST', '/cqc-evidence/e1/attachments')).toHaveLength(0)
  })

  it('edits evidence without changing its type', async () => {
    wrap()
    fireEvent.click((await screen.findAllByTestId('cqc-evidence-open'))[0])
    const detailDialog = await screen.findByTestId('evidence-detail-dialog')
    await within(detailDialog).findByText('Audit Q3.pdf')
    fireEvent.click(within(detailDialog).getByTestId('evidence-edit'))
    const dialog = await screen.findByTestId('evidence-form-dialog')
    expect(within(dialog).getByTestId('evidence-title')).toHaveValue('Medication audit Q3')
    expect(within(dialog).queryByTestId('evidence-type')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Medicines optimisation')).toBeChecked()
    fireEvent.change(within(dialog).getByTestId('evidence-title'), { target: { value: 'Medication audit, Q3 2026' } })
    fireEvent.click(within(dialog).getByTestId('evidence-save'))
    await waitFor(() => expect(calls('PATCH', '/cqc-evidence/e1')).toHaveLength(1))
    const body = bodyOf('PATCH', '/cqc-evidence/e1')
    expect(body).toEqual(expect.objectContaining({ title: 'Medication audit, Q3 2026', statementIds: ['s-meds'] }))
    expect(body.sourceType).toBeUndefined()
  })

  it('lets people who only read evidence open it, but not add, edit or attach', async () => {
    can.mockImplementation((p?: string) => p !== 'cqc_evidence.manage')
    wrap()
    await screen.findAllByTestId('cqc-evidence-row')
    expect(screen.queryByRole('button', { name: 'Add evidence' })).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByTestId('cqc-evidence-open')[0])
    const dialog = await screen.findByTestId('evidence-detail-dialog')
    await within(dialog).findByText('Audit Q3.pdf')
    expect(within(dialog).queryByTestId('evidence-edit')).not.toBeInTheDocument()
    expect(within(dialog).queryByTestId('evidence-attach')).not.toBeInTheDocument()
    expect(within(dialog).queryByTestId('evidence-remove-file')).not.toBeInTheDocument()
  })
})
