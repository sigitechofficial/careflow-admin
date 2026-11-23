import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
const can = vi.fn((_perm?: string) => true)
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ can, user: { id: 'u-me', firstName: 'Sam', lastName: 'Ali', assignedLocationIds: null, assignedLocations: [] } }),
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({ useLocationManagementTree: () => ({ data: undefined }) }))
vi.mock('@/features/locations/utils/flatten-location-options.util', () => ({
  flattenLocationOptionsFromTree: () => [{ id: 'loc-a', label: 'Croydon' }],
}))
vi.mock('@/features/settings/hooks/useUsersAccess', () => ({
  useOfficeUsers: () => ({
    data: [{ id: 'u-2', firstName: 'Dave', lastName: 'Green', email: 'd@x', isActive: true, invitePending: false }],
  }),
}))
vi.mock('@/features/employees/hooks/useEmployees', () => ({
  useEmployees: () => ({ data: { rows: [{ id: 'emp-1', fullName: 'Amina Khan', jobTitle: { name: 'Carer' } }] }, isLoading: false }),
}))
const navigate = vi.fn()
let routeParams: Record<string, string> = {}
let routeSearch: Record<string, string> = {}
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useParams: () => routeParams,
  useSearch: () => routeSearch,
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}))

import AuditDashboardPage from './pages/AuditDashboardPage'
import AuditPage from './pages/AuditPage'
import AuditTemplateWizardPage from './pages/AuditTemplateWizardPage'
import AuditReportsPage from './pages/AuditReportsPage'
import AuditSchedulesPage from './pages/AuditSchedulesPage'
import type { AuditDetail, AuditRow } from './types'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const AREAS = [
  { code: 'INFECTION_PREVENTION', name: 'Infection prevention', description: null, isSystem: true, templateCount: 1 },
  { code: 'OPERATIONAL', name: 'Operational', description: null, isSystem: true, templateCount: 0 },
]
const TEMPLATE = {
  code: 'AUD-001',
  title: 'Infection prevention and control',
  summary: 'Hand hygiene and PPE.',
  introduction: 'Use spot checks.',
  area: { code: 'INFECTION_PREVENTION', name: 'Infection prevention' },
  isCustom: false,
  keyQuestionCode: 'SAFE',
  frequency: 'QUARTERLY',
  earlyDays: 7,
  lateDays: 7,
  auditedItemLabel: null,
  estimatedMinutes: 90,
  locationIds: [],
  sectionCount: 1,
  standardCount: 2,
  activeSchedules: 0,
  cqcStatementCodes: [],
}

const row = (over: Partial<AuditRow> = {}): AuditRow => ({
  id: 'a1',
  title: 'Infection prevention and control, November 2026',
  status: 'DUE',
  state: 'DUE',
  template: { code: 'AUD-001', title: 'Infection prevention and control', area: { code: 'INFECTION_PREVENTION', name: 'Infection prevention' } },
  location: { id: 'loc-a', name: 'Croydon' },
  scheduled: true,
  dueDate: '2026-11-25',
  daysToDue: 3,
  daysToClose: 10,
  auditDate: null,
  auditor: null,
  accountable: { id: 'u-2', name: 'Dave Green' },
  auditedItem: { label: 'Carer observed', value: null },
  completedAt: null,
  total: 2,
  answered: 0,
  percent: null,
  level: null,
  previousPercent: 92,
  openActions: 0,
  ...over,
})

const detail = (over: Partial<AuditDetail> = {}): AuditDetail => ({
  id: 'a1',
  title: 'Infection prevention and control, November 2026',
  status: 'IN_PROGRESS',
  template: {
    code: 'AUD-001',
    title: 'Infection prevention and control',
    keyQuestionCode: 'SAFE',
    frequency: 'QUARTERLY',
    introduction: 'Use spot checks.',
    area: { code: 'INFECTION_PREVENTION', name: 'Infection prevention' },
  },
  location: { id: 'loc-a', name: 'Croydon' },
  scheduleId: 'sch-1',
  dueDate: '2026-11-25',
  earlyDays: 7,
  lateDays: 7,
  timing: { opensOn: '2026-11-18', dueDate: '2026-11-25', closesOn: '2026-12-02', state: 'DUE', daysToDue: 2, daysToClose: 9 },
  auditDate: '2026-11-23',
  auditor: { id: 'u-me', name: 'Sam Ali' },
  accountable: { id: 'u-2', name: 'Dave Green' },
  auditedItem: { label: 'Carer observed', value: 'Amelia' },
  summary: null,
  createdBy: null,
  startedAt: '2026-11-23T10:00:00.000Z',
  completedAt: null,
  missedAt: null,
  cancelledAt: null,
  result: {
    total: 2,
    answered: 1,
    met: 0,
    notMet: 1,
    percent: 0,
    celebrated: 0,
    sections: [{ title: 'Practice', total: 2, answered: 1, met: 0, notMet: 1, percent: 0 }],
    complete: false,
    missingNotes: ['hands'],
  },
  level: null,
  sections: [
    {
      title: 'Practice',
      standards: [
        {
          id: 'hands',
          number: 1,
          text: 'Washed hands before care',
          hint: 'Watch 3 carers',
          answer: { answer: 'NOT_MET', celebrate: false, note: null, answeredBy: null, answeredAt: '2026-11-23T10:00:00.000Z' },
        },
        { id: 'gel', number: 2, text: 'Used gel between tasks', hint: null, answer: null },
      ],
    },
  ],
  actions: [],
  ...over,
})

const DASHBOARD = {
  today: '2026-11-23',
  currentMonth: '2026-11',
  counts: { overdue: 0, due: 3, inProgress: 1, completed: 2, missed: 1 },
  timeline: [
    { month: '2026-10', completed: 1, missed: 1, due: 0 },
    { month: '2026-11', completed: 1, missed: 0, due: 2 },
    { month: '2026-12', completed: 0, missed: 0, due: 1 },
  ],
}

const calls = (method: string, path: string) =>
  apiJson.mock.calls.filter(c => String(c[0]).startsWith(path) && ((c[1] as RequestInit | undefined)?.method ?? 'GET') === method)
const bodyOf = (method: string, path: string) => JSON.parse(calls(method, path).at(-1)![1].body as string)

let current: AuditDetail
beforeEach(() => {
  apiJson.mockReset()
  navigate.mockReset()
  can.mockImplementation(() => true)
  routeParams = {}
  routeSearch = {}
  current = detail()
  apiJson.mockImplementation(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url.startsWith('/quality-audits/dashboard')) return { data: DASHBOARD }
    if (url.startsWith('/quality-audits/reports'))
      return {
        data: {
          days: 30,
          since: '2026-10-24',
          bands: { compliant: 90, partially: 75 },
          levels: { COMPLIANT: 2, PARTIALLY_COMPLIANT: 1, NOT_COMPLIANT: 1 },
          overallPercent: 81.5,
          due: { overdue: 1, dueThisWeek: 2, dueIn30Days: 4 },
          byMonth: [{ month: '2026-11', audits: 4, percent: 81.5 }],
        },
      }
    if (url.startsWith('/quality-audits/areas') && method === 'POST')
      return { data: { code: 'MEDICATION', name: 'Medication', description: null, isSystem: false, templateCount: 0 } }
    if (url.startsWith('/quality-audits/areas')) return { data: AREAS }
    if (url.startsWith('/quality-audits/templates/AUD-001'))
      return { data: { ...TEMPLATE, sections: [{ title: 'Practice', standards: [{ id: 'hands', text: 'Washed hands' }] }], sources: [], researchedOn: null } }
    if (url.startsWith('/quality-audits/templates') && method === 'POST') return { data: { ...TEMPLATE, code: 'OWN-0001', isCustom: true } }
    if (url.startsWith('/quality-audits/templates')) return { data: [TEMPLATE] }
    if (url.startsWith('/quality-audits/schedules') && method === 'GET')
      return {
        data: [
          {
            id: 'sch-1',
            template: { code: 'AUD-001', title: 'Infection prevention and control', area: AREAS[0] },
            location: { id: 'loc-a', name: 'Croydon' },
            frequency: 'QUARTERLY',
            earlyDays: 7,
            lateDays: 7,
            firstDueDate: '2026-11-25',
            accountable: { id: 'u-2', name: 'Dave Green' },
            stoppedAt: null,
            next: { auditId: 'a1', dueDate: '2026-11-25', status: 'DUE' },
          },
        ],
      }
    if (url.startsWith('/quality-audits/schedules')) return { data: {} }
    if (url.startsWith('/quality-audits/a1') && method !== 'GET') return { data: current }
    if (url.startsWith('/quality-audits/a1')) return { data: current }
    if (url.startsWith('/quality-audits?')) {
      const completed = url.includes('tab=COMPLETED')
      return {
        data: [completed ? row({ status: 'COMPLETED', state: null, percent: 50, level: 'NOT_COMPLIANT', completedAt: '2026-11-20T00:00:00.000Z' }) : row()],
        meta: { total: 1, page: 1, totalPages: 1 },
      }
    }
    if (url === '/quality-audits' && method === 'POST') return { data: { ...current, id: 'a9' } }
    return { data: [] }
  })
})

describe('audit dashboard', () => {
  it('shows the tab counts, opens on the first tab with audits, and lists them with their details', async () => {
    wrap(<AuditDashboardPage />)
    const due = await screen.findByTestId('audit-tab-DUE')
    await waitFor(() => expect(due).toHaveTextContent('3'))
    await waitFor(() => expect(due).toHaveAttribute('aria-selected', 'true'))
    await waitFor(() => expect(calls('GET', '/quality-audits?').some(c => String(c[0]).includes('tab=DUE'))).toBe(true))
    const r = await screen.findByTestId('audit-row')
    expect(r).toHaveTextContent('Infection prevention and control, November 2026')
    expect(r).toHaveTextContent('92%')
    expect(r).toHaveTextContent('Carer observed')
    expect(r).toHaveTextContent('Dave Green')
    expect(r).toHaveTextContent('3 days')
    expect(r).toHaveTextContent('Scheduled')
    fireEvent.click(r)
    expect(navigate).toHaveBeenCalledWith({ to: '/governance/audits/$auditId', params: { auditId: 'a1' } })
  })

  it('draws the month timeline with what was done, missed and due', async () => {
    wrap(<AuditDashboardPage />)
    const months = await screen.findAllByTestId('audit-timeline-month')
    expect(months).toHaveLength(3)
    expect(within(months[0]!).getByRole('button')).toHaveAccessibleName(/1 missed, 0 due, 1 completed/)
    expect(months[1]).toHaveTextContent('This month')
  })

  it('searches, and filters by area', async () => {
    wrap(<AuditDashboardPage />)
    await screen.findByTestId('audit-row')
    fireEvent.change(screen.getByTestId('audit-search'), { target: { value: 'hand' } })
    fireEvent.click(screen.getByTestId('audit-search-submit'))
    await waitFor(() => expect(calls('GET', '/quality-audits?').some(c => String(c[0]).includes('q=hand'))).toBe(true))
    fireEvent.change(await screen.findByTestId('audit-filter-area'), { target: { value: 'OPERATIONAL' } })
    await waitFor(() =>
      expect(calls('GET', '/quality-audits/dashboard').some(c => String(c[0]).includes('areaCode=OPERATIONAL'))).toBe(true),
    )
  })

  it('shows only your audits under My audits, without the staff filter', async () => {
    wrap(<AuditDashboardPage mine />)
    await screen.findByTestId('my-audits-page')
    await waitFor(() =>
      expect(calls('GET', '/quality-audits/dashboard').some(c => String(c[0]).includes('accountableUserId=u-me'))).toBe(true),
    )
    expect(screen.queryByTestId('audit-filter-person')).not.toBeInTheDocument()
  })

  it('lists every audit in one list, grouped by area, with no area filter', async () => {
    wrap(<AuditDashboardPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Conduct audit/ }))
    const dialog = await screen.findByTestId('conduct-audit-dialog')
    await within(dialog).findByRole('option', { name: 'Infection prevention and control' })
    expect(within(dialog).queryByLabelText('Area')).not.toBeInTheDocument()
    const groups = within(dialog).getAllByRole('group')
    expect(groups.map(g => g.getAttribute('label'))).toEqual(['Infection prevention'])
  })

  it('conducts an audit now from the library', async () => {
    wrap(<AuditDashboardPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Conduct audit/ }))
    const dialog = await screen.findByTestId('conduct-audit-dialog')
    await within(dialog).findByRole('option', { name: 'Infection prevention and control' })
    fireEvent.change(within(dialog).getByTestId('conduct-template'), { target: { value: 'AUD-001' } })
    expect(within(dialog).getByTestId('conduct-template-facts')).toHaveTextContent('2 standards')
    fireEvent.click(within(dialog).getByTestId('conduct-start'))
    await waitFor(() => expect(calls('POST', '/quality-audits')).toHaveLength(1))
    expect(bodyOf('POST', '/quality-audits')).toEqual({ templateCode: 'AUD-001' })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/governance/audits/$auditId', params: { auditId: 'a9' } }))
  })
})

describe('audit page', () => {
  beforeEach(() => {
    routeParams = { auditId: 'a1' }
  })

  it('shows the window, the audited item and numbered standards with their answers', async () => {
    wrap(<AuditPage />)
    expect(await screen.findByTestId('audit-window')).toHaveTextContent('Can be completed from')
    expect(screen.getByTestId('audit-item')).toHaveValue('Amelia')
    expect(screen.getByTestId('audit-intro')).toHaveTextContent('Use spot checks.')
    const [first, second] = screen.getAllByTestId('audit-standard')
    expect(first).toHaveTextContent('1Washed hands before care')
    expect(within(first!).getByTestId('audit-answer-NOT_MET')).toHaveAttribute('aria-checked', 'true')
    expect(within(first!).getByText('Notes (required)')).toBeInTheDocument()
    expect(within(second!).queryByTestId('audit-note')).not.toBeInTheDocument()
    expect(screen.getByTestId('audit-answered')).toHaveTextContent('1 of 2')
  })

  it('saves an answer at once, celebrates a met standard, and saves a note when the box is left', async () => {
    wrap(<AuditPage />)
    const [first, second] = await screen.findAllByTestId('audit-standard')
    fireEvent.click(within(second!).getByTestId('audit-answer-MET'))
    await waitFor(() => expect(calls('PUT', '/quality-audits/a1/answers/gel')).toHaveLength(1))
    expect(bodyOf('PUT', '/quality-audits/a1/answers/gel')).toEqual({ answer: 'MET' })

    const note = within(first!).getByTestId('audit-note')
    fireEvent.focus(note)
    fireEvent.change(note, { target: { value: '  One carer skipped it ' } })
    fireEvent.blur(note)
    await waitFor(() => expect(calls('PUT', '/quality-audits/a1/answers/hands')).toHaveLength(1))
    expect(bodyOf('PUT', '/quality-audits/a1/answers/hands')).toEqual({
      answer: 'NOT_MET',
      note: 'One carer skipped it',
      celebrate: false,
    })
  })

  it('creates an action for a standard, showing the audit, the standard and the findings', async () => {
    current = detail({
      sections: [
        {
          title: 'Practice',
          standards: [
            {
              id: 'hands',
              number: 1,
              text: 'Washed hands before care',
              hint: null,
              answer: { answer: 'NOT_MET', celebrate: false, note: 'One carer skipped it', answeredBy: null, answeredAt: '' },
            },
          ],
        },
      ],
    })
    wrap(<AuditPage />)
    fireEvent.click(await screen.findByTestId('audit-create-action'))
    const dialog = await screen.findByTestId('audit-action-dialog')
    const context = within(dialog).getByTestId('audit-action-context')
    expect(context).toHaveTextContent('Infection prevention and control, November 2026')
    expect(context).toHaveTextContent('Standard 1')
    expect(context).toHaveTextContent('One carer skipped it')
    fireEvent.change(within(dialog).getByTestId('audit-action-title'), { target: { value: 'Hand hygiene refresher' } })
    fireEvent.click(within(dialog).getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: /Amina Khan/ }))
    fireEvent.click(within(dialog).getByTestId('audit-action-urgent'))
    fireEvent.click(within(dialog).getByTestId('audit-action-save'))
    await waitFor(() => expect(calls('POST', '/quality-audits/a1/actions')).toHaveLength(1))
    expect(bodyOf('POST', '/quality-audits/a1/actions')).toEqual({
      title: 'Hand hygiene refresher',
      standardId: 'hands',
      assignedEmployeeId: 'emp-1',
      urgent: true,
    })
  })

  it('completes the audit, and shows the reason when it cannot be completed yet', async () => {
    apiJson.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/quality-audits/a1/complete') throw Object.assign(new (await import('@/shared/api/api-client')).ApiError('Add a note to every standard not met: 1 still needs one.'), {})
      if (url.startsWith('/quality-audits/a1')) return { data: current }
      return { data: [] }
    })
    wrap(<AuditPage />)
    fireEvent.click(await screen.findByTestId('audit-complete'))
    expect(await screen.findByTestId('audit-error')).toHaveTextContent('1 still needs one')
    expect(screen.getByTestId('audit-note-missing')).toBeInTheDocument()
  })

  it('starts a due audit, and is read-only once completed', async () => {
    current = detail({ status: 'DUE', auditor: null, startedAt: null })
    const { unmount } = wrap(<AuditPage />)
    fireEvent.click(await screen.findByTestId('audit-begin'))
    await waitFor(() => expect(calls('POST', '/quality-audits/a1/begin')).toHaveLength(1))
    expect(bodyOf('POST', '/quality-audits/a1/begin')).toEqual({ auditedItemValue: 'Amelia' })
    unmount()

    current = detail({ status: 'COMPLETED', level: 'NOT_COMPLIANT', completedAt: '2026-11-23T12:00:00.000Z', timing: null })
    wrap(<AuditPage />)
    const [first] = await screen.findAllByTestId('audit-standard')
    expect(within(first!).getByTestId('audit-answer-MET')).toBeDisabled()
    expect(screen.queryByTestId('audit-complete')).not.toBeInTheDocument()
    expect(screen.getByText('Not compliant')).toBeInTheDocument()
  })
})

describe('template wizard', () => {
  it('goes Area → Details → Standards, checking each step, and creates the template', async () => {
    wrap(<AuditTemplateWizardPage />)
    fireEvent.click(await screen.findByTestId('wizard-next'))
    expect(screen.getByTestId('wizard-error')).toHaveTextContent('Choose the audit area')
    fireEvent.click(await screen.findByRole('radio', { name: /Operational/ }))
    fireEvent.click(screen.getByTestId('wizard-next'))

    await screen.findByTestId('wizard-step-details')
    fireEvent.click(screen.getByTestId('wizard-next'))
    expect(screen.getByTestId('wizard-error')).toHaveTextContent('Give the audit a title')
    fireEvent.change(screen.getByTestId('wizard-title'), { target: { value: 'Care file check' } })
    fireEvent.click(screen.getByTestId('wizard-use-item'))
    fireEvent.change(screen.getByTestId('wizard-item-label'), { target: { value: 'Person supported' } })
    fireEvent.change(screen.getByTestId('wizard-frequency'), { target: { value: 'MONTHLY' } })
    fireEvent.click(screen.getByTestId('wizard-next'))

    await screen.findByTestId('wizard-step-standards')
    fireEvent.change(screen.getByTestId('wizard-section-title'), { target: { value: 'Records' } })
    fireEvent.change(screen.getByTestId('wizard-standard-text'), { target: { value: 'Care plan reviewed this year' } })
    fireEvent.click(screen.getByTestId('wizard-add-standard'))
    fireEvent.change(screen.getAllByTestId('wizard-standard-text')[1]!, { target: { value: 'Risk assessments signed' } })
    fireEvent.click(screen.getByTestId('wizard-save'))
    await waitFor(() => expect(calls('POST', '/quality-audits/templates')).toHaveLength(1))
    expect(bodyOf('POST', '/quality-audits/templates')).toEqual({
      areaCode: 'OPERATIONAL',
      title: 'Care file check',
      frequency: 'MONTHLY',
      earlyDays: 2,
      lateDays: 2,
      auditedItemLabel: 'Person supported',
      locationIds: [],
      sections: [{ title: 'Records', standards: [{ text: 'Care plan reviewed this year' }, { text: 'Risk assessments signed' }] }],
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/governance/audits/templates' }))
  })

  it('adds a new area of your own and chooses it', async () => {
    wrap(<AuditTemplateWizardPage />)
    fireEvent.click(await screen.findByTestId('wizard-add-area'))
    fireEvent.change(screen.getByTestId('wizard-new-area'), { target: { value: 'Medication' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(bodyOf('POST', '/quality-audits/areas')).toEqual({ name: 'Medication' }))
  })

  it('starts from a copy of a library template', async () => {
    routeSearch = { copy: 'AUD-001' }
    wrap(<AuditTemplateWizardPage />)
    await screen.findByTestId('wizard-step-area')
    fireEvent.click(screen.getByTestId('wizard-next'))
    expect(await screen.findByTestId('wizard-title')).toHaveValue('Infection prevention and control (our version)')
  })
})

describe('schedules and reports', () => {
  it('lists schedules with the next due audit and stops one after confirming', async () => {
    wrap(<AuditSchedulesPage />)
    const r = await screen.findByTestId('audit-schedule-row')
    expect(r).toHaveTextContent('Infection prevention and control')
    expect(r).toHaveTextContent('Due')
    fireEvent.click(within(r).getByTestId('audit-schedule-stop'))
    const stops = await screen.findAllByRole('button', { name: 'Stop' })
    fireEvent.click(stops[stops.length - 1]!)
    await waitFor(() => expect(calls('POST', '/quality-audits/schedules/sch-1/stop')).toHaveLength(1))
  })

  it('shows compliance levels, the completed audits at a level and the overall compliance', async () => {
    wrap(<AuditReportsPage />)
    const compliant = await screen.findByTestId('audit-level-COMPLIANT')
    await waitFor(() => expect(compliant).toHaveTextContent('2'))
    expect(screen.getByTestId('audit-report-overall')).toHaveTextContent('81.5%')
    await waitFor(() =>
      expect(calls('GET', '/quality-audits?').some(c => String(c[0]).includes('level=NOT_COMPLIANT'))).toBe(true),
    )
    expect(await screen.findByTestId('audit-row')).toHaveTextContent('50%')
  })
})
