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
const can = vi.fn(() => true)
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) =>
    sel({ can, user: { assignedLocationIds: ['loc-a'], assignedLocations: [{ id: 'loc-a', name: 'Greenwich' }] } }),
}))
const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ templateCode: 'MI-006' }),
  Link: ({
    children,
    to,
    params,
    search,
    ...rest
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
  }) => {
    const path = Object.entries(params ?? {}).reduce((u, [k, v]) => u.replace(`$${k}`, v), to)
    return (
      <a {...rest} href={`${path}${search ? `?${new URLSearchParams(search)}` : ''}`}>
        {children}
      </a>
    )
  },
}))

import ReadyMadeInspectionsPage from './pages/ReadyMadeInspectionsPage'
import ReadyMadeInspectionPage from './pages/ReadyMadeInspectionPage'
import type { MockInspectionTemplate } from './types'

const guidance = {
  lookAt: ['MAR charts for 3 people'],
  askPeople: ['Do you get your medicines on time?'],
  askStaff: ['What if a dose is missed?'],
  inCareFlow: ['eMAR'],
}

const template = (over: Partial<MockInspectionTemplate>): MockInspectionTemplate => ({
  code: 'MI-001',
  groupCode: 'FULL',
  groupName: 'Full inspection',
  title: 'Full mock inspection',
  summary: 'Every key question.',
  whenToUse: 'Once or twice a year.',
  estimatedMinutes: 480,
  statementCount: 34,
  keyQuestionCodes: ['SAFE', 'EFFECTIVE', 'CARING', 'RESPONSIVE', 'WELL_LED'],
  givesOverallRating: true,
  matchesFramework: true,
  statements: [],
  sources: [{ id: 'cqc', source: 'CQC, How we inspect', url: 'https://cqc.org.uk/node/2929' }],
  researchedOn: '2026-11-19',
  ...over,
})

const templates = [
  template({}),
  template({
    code: 'MI-006',
    groupCode: 'TOPIC',
    groupName: 'Topic deep dives',
    title: 'Medicines management',
    summary: 'Medicines support from start to finish.',
    whenToUse: 'Every quarter.',
    estimatedMinutes: 120,
    statementCount: 2,
    keyQuestionCodes: ['SAFE', 'WELL_LED'],
    givesOverallRating: false,
    statements: [
      { code: 'SAFE_MEDICINES', title: 'Medicines optimisation', keyQuestionCode: 'SAFE', keyQuestionTitle: 'Safe', focus: null, guidance },
      {
        code: 'WELL_LED_GOVERNANCE',
        title: 'Governance, management and sustainability',
        keyQuestionCode: 'WELL_LED',
        keyQuestionTitle: 'Well-led',
        focus: 'Medicines audits and their actions.',
        guidance,
      },
    ],
  }),
]

const surveyRef = (id: string, reference: string, title: string, respondents: string, adoptedTemplateId: string | null) => ({
  id,
  reference,
  title,
  respondents,
  audience: 'SERVICE_USER',
  groupName: respondents,
  adoptedTemplateId,
  statementCount: 3,
})
const statementSurveys = {
  SAFE_MEDICINES: [surveyRef('lib-1', 'SUR-PWS-001', 'How is your care?', 'People we support', null)],
  WELL_LED_GOVERNANCE: [
    surveyRef('lib-1', 'SUR-PWS-001', 'How is your care?', 'People we support', null),
    surveyRef('lib-2', 'SUR-STF-001', 'Staff survey', 'Staff', 'tpl-9'),
  ],
}

const policyRef = (reference: string, title: string, adoptedPolicyId: string | null) => ({
  id: `lib-${reference}`,
  reference,
  title,
  documentType: 'POLICY',
  categoryName: 'Medicines',
  adoptedPolicyId,
})
const statementPolicies = {
  SAFE_MEDICINES: [
    policyRef('POL-MED-001', 'Medicines Management Policy', 'org-pol-1'),
    policyRef('POL-MED-014', 'Medication Errors Procedure', null),
  ],
  WELL_LED_GOVERNANCE: [policyRef('POL-GOV-002', 'Governance and Quality Assurance Policy', null)],
}

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReadyMadeInspectionsPage />
    </QueryClientProvider>,
  )

beforeEach(() => {
  apiJson.mockReset()
  navigate.mockReset()
  can.mockReturnValue(true)
  apiJson.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/templates')) return { data: templates }
    if (url.endsWith('/statement-surveys')) return { data: statementSurveys }
    if (url.endsWith('/statement-policies')) return { data: statementPolicies }
    if (url.endsWith('/adopt')) return { data: { created: [{ libraryId: 'x', reference: 'POL-MED-014', title: 'Medication Errors Procedure' }], skipped: [] } }
    if (init?.method === 'POST') return { data: { id: 'new-insp' } }
    return { data: [] }
  })
})

describe('ready-made inspections page', () => {
  it('lists inspections by group with their facts', async () => {
    wrap()
    const items = await screen.findAllByTestId('ready-made-inspection')
    expect(items).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Full inspection' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Topic deep dives' })).toBeInTheDocument()
    expect(within(items[0]).getByText('Gives an overall rating')).toBeInTheDocument()
    expect(within(items[1]).getByText('Rates its key questions only')).toBeInTheDocument()
    expect(within(items[1]).getByText('About 2 hrs')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search ready-made inspections'), { target: { value: 'governance' } })
    expect(screen.getAllByTestId('ready-made-inspection')).toHaveLength(1)
  })

  it('opens a ready-made inspection on its own page to read', async () => {
    wrap()
    const items = await screen.findAllByTestId('ready-made-inspection')
    fireEvent.click(within(items[1]).getByRole('button', { name: 'Read' }))
    expect(navigate).toHaveBeenCalledWith({
      to: '/governance/mock-inspections/ready-made/$templateCode',
      params: { templateCode: 'MI-006' },
    })
  })

  it('starts an inspection from a template and opens it', async () => {
    wrap()
    const items = await screen.findAllByTestId('ready-made-inspection')
    fireEvent.click(within(items[1]).getByTestId('mock-template-start'))
    const dialog = await screen.findByTestId('mock-inspection-start-dialog')
    expect(within(dialog).getByText('Start: Medicines management')).toBeInTheDocument()
    expect((within(dialog).getByTestId('mock-inspection-title') as HTMLInputElement).value).toMatch(/^Medicines management, /)
    fireEvent.click(within(dialog).getByTestId('mock-inspection-start'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/governance/mock-inspections/$inspectionId', params: { inspectionId: 'new-insp' } }))
    const body = JSON.parse(apiJson.mock.calls.find(c => c[1]?.method === 'POST')![1].body)
    expect(body).toMatchObject({ templateCode: 'MI-006', locationId: 'loc-a' })
  })

  it('lets read-only users read but not start', async () => {
    can.mockReturnValue(false)
    wrap()
    await screen.findAllByTestId('ready-made-inspection')
    expect(screen.queryByTestId('mock-template-start')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Read' })).toHaveLength(2)
  })

})

describe('ready-made inspection read page', () => {
  const wrapPage = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ReadyMadeInspectionPage />
      </QueryClientProvider>,
    )

  it('shows the statements numbered by key question, with focus and guidance, and the facts', async () => {
    wrapPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Medicines management' })).toBeInTheDocument()
    const statements = screen.getAllByTestId('mock-template-statement')
    expect(statements).toHaveLength(2)
    expect(within(statements[0]).getByText('1')).toBeInTheDocument()
    expect(within(statements[1]).getByText('2')).toBeInTheDocument()
    expect(within(statements[1]).getByText('Medicines audits and their actions.')).toBeInTheDocument()
    expect(within(statements[0]).getByTestId('mock-guidance-lookAt')).toHaveTextContent('MAR charts for 3 people')
    expect(screen.getByRole('heading', { name: 'When to use it' })).toBeInTheDocument()
    expect(screen.getByText(/gives no overall rating for the service/)).toBeInTheDocument()
    const glance = screen.getByTestId('mock-template-glance')
    expect(within(glance).getByText('About 2 hrs')).toBeInTheDocument()
    expect(within(glance).getByText('Each key question it covers')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CQC, How we inspect/ })).toHaveAttribute('href', 'https://cqc.org.uk/node/2929')
  })

  it('starts the inspection from the page', async () => {
    wrapPage()
    fireEvent.click(await screen.findByTestId('mock-template-start'))
    const dialog = await screen.findByTestId('mock-inspection-start-dialog')
    fireEvent.click(within(dialog).getByTestId('mock-inspection-start'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/governance/mock-inspections/$inspectionId', params: { inspectionId: 'new-insp' } }))
  })

  it('says when the inspection is not found', async () => {
    apiJson.mockImplementation(async () => ({ data: [] }))
    wrapPage()
    expect(await screen.findByText('This ready-made inspection was not found.')).toBeInTheDocument()
  })
it('shows the ready-made surveys for each statement and links them', async () => {
    wrapPage()
    const statements = await screen.findAllByTestId('mock-template-statement')
    await waitFor(() => expect(within(statements[1]).getAllByTestId('mock-related-survey')).toHaveLength(2))
    const [readyMade, adopted] = within(statements[1]).getAllByTestId('mock-related-survey')
    expect(readyMade).toHaveAttribute('href', '/surveys/ready-made?open=lib-1')
    expect(adopted).toHaveAttribute('href', '/surveys/tpl-9')
    expect(within(adopted.closest('[data-testid=mock-related-survey-card]') as HTMLElement).getByText('Adopted')).toBeInTheDocument()
    expect(within(screen.getByTestId('mock-template-surveys')).getByText(/Surveys \(2\)/)).toBeInTheDocument()
  })

  it('hides surveys from users who may not see them', async () => {
    can.mockImplementation((p: string) => !p.startsWith('surveys.'))
    wrapPage()
    await screen.findAllByTestId('mock-template-statement')
    expect(screen.queryByTestId('mock-related-survey')).not.toBeInTheDocument()
    expect(apiJson.mock.calls.some(c => String(c[0]).endsWith('/statement-surveys'))).toBe(false)
  })
it('shows the policies behind each statement and lists everything attached to the inspection', async () => {
    wrapPage()
    const statements = await screen.findAllByTestId('mock-template-statement')
    await waitFor(() => expect(within(statements[0]).getAllByTestId('mock-related-policy')).toHaveLength(2))
    const [adopted, notAdopted] = within(statements[0]).getAllByTestId('mock-related-policy')
    expect(adopted).toHaveAttribute('href', '/policies/org-pol-1')
    expect(within(adopted.closest('[data-testid=mock-related-policy-card]') as HTMLElement).getByText('Adopted')).toBeInTheDocument()
    expect(notAdopted).toHaveAttribute('href', '/policies/ready-made?open=lib-POL-MED-014')
    expect(within(notAdopted.closest('[data-testid=mock-related-policy-card]') as HTMLElement).getByText('Not adopted')).toBeInTheDocument()

    const attached = screen.getByTestId('mock-template-attached')
    expect(within(attached).getByText('Attached to this inspection')).toBeInTheDocument()
    const policies = within(attached).getByTestId('mock-template-policies')
    expect(policies).toHaveTextContent('Policies (3)')
    expect(policies).toHaveTextContent('1 adopted')
    expect(within(policies).getAllByTestId('mock-related-policy')).toHaveLength(3)
    expect(within(attached).getByTestId('mock-template-surveys')).toHaveTextContent('1 adopted')
  })

  it('hides policies from users who may not see them', async () => {
    can.mockImplementation((perm: string) => perm !== 'policies.read')
    wrapPage()
    await screen.findAllByTestId('mock-template-statement')
    expect(screen.queryByTestId('mock-related-policy')).not.toBeInTheDocument()
    expect(apiJson.mock.calls.some(c => String(c[0]).endsWith('/statement-policies'))).toBe(false)
  })
it('adopts a policy from its card, and every policy not yet adopted after confirming', async () => {
    wrapPage()
    const statements = await screen.findAllByTestId('mock-template-statement')
    await waitFor(() => expect(within(statements[0]).getAllByTestId('mock-related-policy-card')).toHaveLength(2))
    // The adopted policy has no Adopt button; the other one does.
    const [adoptedCard, notAdoptedCard] = within(statements[0]).getAllByTestId('mock-related-policy-card')
    expect(within(adoptedCard).queryByTestId('mock-adopt-policy')).not.toBeInTheDocument()
    fireEvent.click(within(notAdoptedCard).getByTestId('mock-adopt-policy'))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/policy-library/adopt', expect.objectContaining({ method: 'POST' })))
    const one = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/policy-library/adopt')![1].body)
    expect(one).toEqual({ policyIds: ['lib-POL-MED-014'] })

    apiJson.mockClear()
    fireEvent.click(screen.getByTestId('mock-adopt-all-policy'))
    fireEvent.click(await screen.findByTestId('mock-adopt-all-policy-confirm'))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/policy-library/adopt', expect.anything()))
    const all = JSON.parse(apiJson.mock.calls.find(c => c[0] === '/policy-library/adopt')![1].body)
    expect(all.policyIds.sort()).toEqual(['lib-POL-GOV-002', 'lib-POL-MED-014'])
  })

  it('offers no survey adoption to branch-restricted users, and no adoption without permission', async () => {
    // The test user is branch-restricted (one branch), so surveys cannot be adopted here.
    wrapPage()
    await screen.findAllByTestId('mock-template-statement')
    await waitFor(() => expect(screen.getAllByTestId('mock-related-survey').length).toBeGreaterThan(0))
    expect(screen.queryByTestId('mock-adopt-survey')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-adopt-all-survey')).not.toBeInTheDocument()
  })

  it('hides Adopt from users who may not create policies', async () => {
    can.mockImplementation((perm: string) => perm !== 'policies.create')
    wrapPage()
    await waitFor(() => expect(screen.getAllByTestId('mock-related-policy').length).toBeGreaterThan(0))
    expect(screen.queryByTestId('mock-adopt-policy')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-adopt-all-policy')).not.toBeInTheDocument()
  })
it('shows an archived copy as Archived, and offers Undo adopt only on a never-published draft', async () => {
    const withStatus = {
      ...statementPolicies,
      SAFE_MEDICINES: [
        { ...policyRef('POL-MED-001', 'Medicines Management Policy', 'org-pol-1'), adoptedStatus: 'DRAFT', canUndoAdopt: true },
        { ...policyRef('POL-MED-014', 'Medication Errors Procedure', 'org-pol-2'), adoptedStatus: 'ARCHIVED', canUndoAdopt: false },
      ],
    }
    const base = apiJson.getMockImplementation()!
    apiJson.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/statement-policies')) return { data: withStatus }
      if (init?.method === 'DELETE') return { data: { id: 'org-pol-1' } }
      return base(url, init)
    })
    wrapPage()
    const statements = await screen.findAllByTestId('mock-template-statement')
    await waitFor(() => expect(within(statements[0]).getAllByTestId('mock-related-policy-card')).toHaveLength(2))
    const [draftCard, archivedCard] = within(statements[0]).getAllByTestId('mock-related-policy-card')
    expect(within(draftCard).getByText('Adopted')).toBeInTheDocument()
    expect(within(archivedCard).getByText('Archived')).toBeInTheDocument()
    expect(within(archivedCard).queryByTestId('mock-undo-adopt-policy')).not.toBeInTheDocument()
    expect(within(archivedCard).queryByTestId('mock-adopt-policy')).not.toBeInTheDocument()

    fireEvent.click(within(draftCard).getByTestId('mock-undo-adopt-policy'))
    fireEvent.click(await screen.findByTestId('mock-undo-adopt-policy-confirm'))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/policies/org-pol-1', expect.objectContaining({ method: 'DELETE' })))
  })

  it('hides Undo adopt from users who may not delete draft policies', async () => {
    can.mockImplementation((perm: string) => perm !== 'policies.archive')
    const base = apiJson.getMockImplementation()!
    apiJson.mockImplementation(async (url: string, init?: RequestInit) =>
      url.endsWith('/statement-policies')
        ? { data: { SAFE_MEDICINES: [{ ...policyRef('POL-MED-001', 'Medicines Management Policy', 'org-pol-1'), adoptedStatus: 'DRAFT', canUndoAdopt: true }] } }
        : base(url, init),
    )
    wrapPage()
    await waitFor(() => expect(screen.getAllByTestId('mock-related-policy').length).toBeGreaterThan(0))
    expect(screen.queryByTestId('mock-undo-adopt-policy')).not.toBeInTheDocument()
  })
})
