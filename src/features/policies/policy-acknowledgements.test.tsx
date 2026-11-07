import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { PolicyAcknowledgementPanel } from '@/features/policies/components/PolicyAcknowledgementPanel'
import {
  PolicyForm,
  emptyPolicyForm,
  formFromPolicy,
  policyFormToWriteInput,
} from '@/features/policies/components/PolicyForm'
import { filterStaffAcknowledgements } from '@/features/policies/components/PolicyStaffAcknowledgements'
import { publishAcknowledgementText } from '@/features/policies/components/PolicyPublishAcknowledgementNote'
import { PolicyWorkflowActions } from '@/features/policies/components/PolicyWorkflowActions'
import { formatPolicyDate } from '@/features/policies/policy-format'
import type {
  MyPolicyAcknowledgements,
  PolicyAcknowledgementReport,
  PolicyDocument,
  PolicyPublishPreview,
  PolicyVersion,
} from '@/features/policies/types/policy.types'

const { ackState, recordViewedMock, acknowledgeMock } = vi.hoisted(() => ({
  ackState: {
    mine: undefined as unknown,
    report: undefined as unknown,
    preview: undefined as unknown,
  },
  recordViewedMock: vi.fn(),
  acknowledgeMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
  useParams: () => ({ policyId: 'p1' }),
  useBlocker: () => ({ status: 'idle', proceed: vi.fn(), reset: vi.fn() }),
}))

vi.mock('@/features/policies/hooks/usePolicies', async () => {
  const actual = await vi.importActual<typeof import('@/features/policies/hooks/usePolicies')>(
    '@/features/policies/hooks/usePolicies',
  )
  return {
    ...actual,
    usePolicy: vi.fn(),
    usePolicyVersions: vi.fn(),
    usePolicyCategories: vi.fn(() => ({ data: { rows: [] }, isLoading: false })),
    usePolicyTags: vi.fn(() => ({ data: { rows: [] }, isLoading: false })),
  }
})

vi.mock('@/features/policies/hooks/usePolicyAcknowledgements', () => ({
  useMyPolicyAcknowledgements: (enabled: boolean) => ({
    data: enabled ? ackState.mine : undefined,
    isLoading: false,
    isError: false,
  }),
  useRecordPolicyViewed: () => ({ mutate: recordViewedMock, isPending: false }),
  useAcknowledgePolicy: () => ({ mutateAsync: acknowledgeMock, isPending: false }),
  usePolicyAcknowledgementReport: () => ({ data: ackState.report, isLoading: false, isError: false }),
  usePolicyAcknowledgementSummary: () => ({ data: [], isLoading: false }),
  usePolicyPublishPreview: (_id: string, enabled: boolean) => ({
    data: enabled ? ackState.preview : undefined,
    isLoading: false,
  }),
}))

vi.mock('@/features/policies/hooks/usePolicyLookups', () => ({
  usePolicyLookups: () => ({
    isLoading: false,
    locations: [{ id: 'loc-1', name: 'London' }],
    allLocations: [{ id: 'loc-1', name: 'London' }],
    jobTitles: [],
    workAreas: [],
    roles: [],
    careTypes: [],
    locationLabels: { 'loc-1': 'London' },
    jobTitleLabels: {},
    workAreaLabels: {},
    roleLabels: {},
    serviceLabels: {},
    isLocationRestricted: false,
    assignedLocationIds: null,
  }),
}))

vi.mock('@/shared/ui/rich-text-editor', () => ({
  RichTextEditor: ({ value }: { value?: string }) => <textarea aria-label="Policy text" value={value} readOnly />,
}))

import { usePolicy, usePolicyVersions } from '@/features/policies/hooks/usePolicies'
import PolicyDetailPage from '@/features/policies/pages/PolicyDetailPage'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function W({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

const publishedVersion: PolicyVersion = {
  id: 'v1',
  documentId: 'p1',
  versionMajor: 1,
  versionMinor: 0,
  versionLabel: 'v1.0',
  status: 'PUBLISHED',
  titleSnapshot: 'Safeguarding adults',
  contentJson: null,
  contentHtml: '<h2>Key points for staff</h2><p>Report concerns the same day.</p>',
  changeSummary: null,
  fileName: null,
  mimeType: null,
  fileSize: null,
  hasDocument: false,
  contentKind: 'EDITOR',
  effectiveDate: '2026-10-01',
  reviewDate: '2027-10-01',
  publishedAt: '2026-10-01T09:00:00.000Z',
  publishedById: 'u-admin',
  archivedAt: null,
  acknowledgementRequired: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  applicability: [{ organisationWide: true, locationId: null, serviceTypeCode: null }],
  audiences: [],
  links: [],
}

const publishedPolicy: PolicyDocument = {
  id: 'p1',
  reference: 'POL-SAF-001',
  title: 'Safeguarding adults',
  description: null,
  documentType: 'POLICY',
  source: 'EDITOR',
  primaryCategoryId: 'c1',
  primaryCategory: { id: 'c1', name: 'Safeguarding', code: 'SAF' },
  tags: [],
  parentDocumentId: null,
  currentVersionId: 'v1',
  status: 'PUBLISHED',
  isCatalogue: false,
  ownerId: 'u-admin',
  reviewerId: null,
  approverId: null,
  createdById: 'u-admin',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  currentVersion: publishedVersion,
}

function mine(status: 'PENDING' | 'VIEWED' | 'ACKNOWLEDGED', overdue = false): MyPolicyAcknowledgements {
  return {
    employeeLinked: true,
    reason: null,
    dueWithinDays: 14,
    counts: { total: 1, acknowledged: status === 'ACKNOWLEDGED' ? 1 : 0, outstanding: status === 'ACKNOWLEDGED' ? 0 : 1, viewed: 0, overdue: overdue ? 1 : 0 },
    items: [
      {
        documentId: 'p1',
        versionId: 'v1',
        reference: 'POL-SAF-001',
        title: 'Safeguarding adults',
        category: 'Safeguarding',
        versionLabel: 'v1.0',
        publishedAt: '2026-10-01T09:00:00.000Z',
        dueAt: '2026-10-15T09:00:00.000Z',
        status,
        viewedAt: status === 'PENDING' ? null : '2026-10-02T09:00:00.000Z',
        acknowledgedAt: status === 'ACKNOWLEDGED' ? '2026-10-03T09:00:00.000Z' : null,
        overdue,
      },
    ],
  }
}

const report: PolicyAcknowledgementReport = {
  documentId: 'p1',
  reference: 'POL-SAF-001',
  title: 'Safeguarding adults',
  versionId: 'v1',
  versionLabel: 'v1.0',
  publishedAt: '2026-10-01T09:00:00.000Z',
  acknowledgementRequired: true,
  dueWithinDays: 14,
  branchScoped: false,
  totals: { required: 3, acknowledged: 1, viewedOnly: 1, notOpened: 1, overdue: 1 },
  rows: [
    { employeeId: 'e1', name: 'Anna Carer', branch: 'London', jobTitle: 'Care Worker', status: 'ACKNOWLEDGED', viewedAt: '2026-10-02T09:00:00.000Z', acknowledgedAt: '2026-10-03T09:00:00.000Z', dueAt: '2026-10-15T09:00:00.000Z', overdue: false },
    { employeeId: 'e2', name: 'Ben Carer', branch: 'London', jobTitle: 'Care Worker', status: 'VIEWED', viewedAt: '2026-10-02T09:00:00.000Z', acknowledgedAt: null, dueAt: '2026-10-15T09:00:00.000Z', overdue: false },
    { employeeId: 'e3', name: 'Cara Carer', branch: null, jobTitle: null, status: 'PENDING', viewedAt: null, acknowledgedAt: null, dueAt: '2026-10-15T09:00:00.000Z', overdue: true },
  ],
}

function signIn(permissions: string[]) {
  useAuthStore.setState({
    user: {
      id: 'u-staff',
      email: 'staff@care.test',
      displayName: 'Staff',
      role: 'carer',
      permissions,
    },
  } as never)
}

describe('PolicyAcknowledgementPanel', () => {
  it('asks staff to read and acknowledge by the due date', async () => {
    const onAcknowledge = vi.fn()
    const user = userEvent.setup()
    render(
      <PolicyAcknowledgementPanel
        status="VIEWED"
        dueAt="2026-10-15T09:00:00.000Z"
        overdue={false}
        acknowledgedAt={null}
        versionLabel="v1.0"
        onAcknowledge={onAcknowledge}
      />,
    )
    expect(
      screen.getByText(`You need to read and acknowledge this policy by ${formatPolicyDate('2026-10-15T09:00:00.000Z')}`),
    ).toBeInTheDocument()
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'I have read and understood this policy' }))
    expect(onAcknowledge).toHaveBeenCalledTimes(1)
  })

  it('says when it is overdue', () => {
    render(
      <PolicyAcknowledgementPanel
        status="PENDING"
        dueAt="2026-10-15T09:00:00.000Z"
        overdue
        acknowledgedAt={null}
        onAcknowledge={() => {}}
      />,
    )
    expect(screen.getByText(/this is now overdue/)).toBeInTheDocument()
  })

  it('disables the button while saving', () => {
    render(
      <PolicyAcknowledgementPanel status="PENDING" dueAt={null} overdue={false} acknowledgedAt={null} pending onAcknowledge={() => {}} />,
    )
    expect(screen.getByTestId('policy-acknowledge-button')).toBeDisabled()
  })

  it('shows the acknowledgement date afterwards, with no button', () => {
    render(
      <PolicyAcknowledgementPanel
        status="ACKNOWLEDGED"
        dueAt="2026-10-15T09:00:00.000Z"
        overdue={false}
        acknowledgedAt="2026-10-03T09:00:00.000Z"
        onAcknowledge={() => {}}
      />,
    )
    expect(screen.getByText(`Acknowledged on ${formatPolicyDate('2026-10-03T09:00:00.000Z')}`)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('PolicyForm staff acknowledgement checkbox', () => {
  it('binds the checkbox to acknowledgementRequired', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const values = emptyPolicyForm('u1', true)
    const { rerender } = render(
      <PolicyForm values={values} onChange={onChange} onSubmit={() => {}} submitLabel="Save draft" />,
      { wrapper: wrapper() },
    )
    const checkbox = screen.getByRole('checkbox', { name: 'Staff must read and acknowledge this policy' })
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ acknowledgementRequired: true }))

    rerender(
      <PolicyForm
        values={{ ...values, acknowledgementRequired: true }}
        onChange={onChange}
        onSubmit={() => {}}
        submitLabel="Save draft"
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Staff must read and acknowledge this policy' })).toBeChecked()
  })

  it('is read-only when the form is', () => {
    render(
      <PolicyForm values={emptyPolicyForm('u1', true)} onChange={() => {}} onSubmit={() => {}} submitLabel="Save" readOnly />,
      { wrapper: wrapper() },
    )
    expect(screen.getByRole('checkbox', { name: 'Staff must read and acknowledge this policy' })).toBeDisabled()
  })

  it('loads the flag from the version and always sends it', () => {
    expect(emptyPolicyForm('u1', true).acknowledgementRequired).toBe(false)
    const values = formFromPolicy(publishedPolicy, publishedVersion, 'u1')
    expect(values.acknowledgementRequired).toBe(true)
    expect(policyFormToWriteInput(values).acknowledgementRequired).toBe(true)
    expect(policyFormToWriteInput({ ...values, acknowledgementRequired: false }).acknowledgementRequired).toBe(false)
  })
})

describe('filterStaffAcknowledgements', () => {
  it('filters all / not acknowledged / overdue', () => {
    expect(filterStaffAcknowledgements(report.rows, 'all')).toHaveLength(3)
    expect(filterStaffAcknowledgements(report.rows, 'outstanding').map(r => r.name)).toEqual(['Ben Carer', 'Cara Carer'])
    expect(filterStaffAcknowledgements(report.rows, 'overdue').map(r => r.name)).toEqual(['Cara Carer'])
  })
})

describe('PolicyDetailPage acknowledgement', () => {
  beforeEach(() => {
    recordViewedMock.mockReset()
    acknowledgeMock.mockReset()
    acknowledgeMock.mockResolvedValue({})
    ackState.mine = undefined
    ackState.report = report
    vi.mocked(usePolicy).mockReturnValue({ data: publishedPolicy, isLoading: false, isError: false } as never)
    vi.mocked(usePolicyVersions).mockReturnValue({ data: [publishedVersion], isLoading: false } as never)
  })

  it('records viewed on open and acknowledges from the panel above the content', async () => {
    signIn(['policies.read', 'policies.acknowledgements.me'])
    ackState.mine = mine('PENDING')
    const user = userEvent.setup()
    render(<PolicyDetailPage />, { wrapper: wrapper() })

    await waitFor(() => expect(recordViewedMock).toHaveBeenCalledWith('p1'))
    expect(recordViewedMock).toHaveBeenCalledTimes(1)

    const panel = screen.getByTestId('policy-acknowledgement-panel')
    // Panel comes before the policy content (which opens with the key points for staff).
    const content = screen.getByTestId('policy-formatted-content')
    expect(panel.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(content).getByText('Key points for staff')).toBeInTheDocument()
    expect(screen.getByTestId('policy-acknowledgement-reminder')).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'I have read and understood this policy' }))
    expect(acknowledgeMock).toHaveBeenCalledWith('p1')
    // Staff without the manage permission do not see the report.
    expect(screen.queryByText('Staff acknowledgements')).not.toBeInTheDocument()
  })

  it('does not record viewed again once already viewed or acknowledged', () => {
    signIn(['policies.read', 'policies.acknowledgements.me'])
    ackState.mine = mine('ACKNOWLEDGED')
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    expect(recordViewedMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Acknowledged on/)).toBeInTheDocument()
    expect(screen.queryByTestId('policy-acknowledgement-reminder')).not.toBeInTheDocument()
  })

  it('shows no panel when the policy is not required for the user', () => {
    signIn(['policies.read', 'policies.acknowledgements.me'])
    ackState.mine = { ...mine('PENDING'), items: [] }
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    expect(screen.queryByTestId('policy-acknowledgement-panel')).not.toBeInTheDocument()
    expect(recordViewedMock).not.toHaveBeenCalled()
  })

  it('shows managers the staff acknowledgements with totals and a filter', async () => {
    signIn(['policies.read', 'policies.acknowledgements.manage'])
    const user = userEvent.setup()
    render(<PolicyDetailPage />, { wrapper: wrapper() })

    const section = screen.getByTestId('policy-staff-acknowledgements')
    expect(within(section).getByText('Need to acknowledge')).toBeInTheDocument()
    expect(within(section).getAllByTestId('policy-staff-acknowledgement-row')).toHaveLength(3)
    expect(within(section).getByText('Overdue', { selector: 'span.inline-flex *' })).toBeInTheDocument()

    await user.click(within(section).getByRole('combobox', { name: 'Show' }))
    await user.click(await screen.findByRole('option', { name: 'Overdue' }))
    expect(within(section).getAllByTestId('policy-staff-acknowledgement-row')).toHaveLength(1)
    expect(within(section).getByText('Cara Carer')).toBeInTheDocument()
  })

  it('hides the staff acknowledgements when the published version does not need acknowledging', () => {
    signIn(['policies.read', 'policies.acknowledgements.manage'])
    const plain = { ...publishedVersion, acknowledgementRequired: false }
    vi.mocked(usePolicy).mockReturnValue({
      data: { ...publishedPolicy, currentVersion: plain },
      isLoading: false,
      isError: false,
    } as never)
    vi.mocked(usePolicyVersions).mockReturnValue({ data: [plain], isLoading: false } as never)
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    expect(screen.queryByTestId('policy-staff-acknowledgements')).not.toBeInTheDocument()
  })
})

const preview: PolicyPublishPreview = {
  documentId: 'p1',
  versionId: 'v2',
  versionLabel: 'v1.1',
  acknowledgementRequired: true,
  dueWithinDays: 14,
  inScope: 12,
  staffCount: 9,
  alreadyAcknowledged: 3,
  dueAt: '2026-11-19T09:00:00.000Z',
}

describe('publish dialog: staff acknowledgement', () => {
  it('words the count and due date', () => {
    expect(publishAcknowledgementText(preview)).toBe(
      `9 staff members will need to read and acknowledge this policy by ${formatPolicyDate(preview.dueAt)}. 3 have already acknowledged an earlier minor version and will not be asked again.`,
    )
    expect(publishAcknowledgementText({ ...preview, staffCount: 1, alreadyAcknowledged: 0 })).toBe(
      `1 staff member will need to read and acknowledge this policy by ${formatPolicyDate(preview.dueAt)}.`,
    )
    expect(publishAcknowledgementText({ ...preview, inScope: 0, staffCount: 0, alreadyAcknowledged: 0 })).toMatch(
      /No active staff match/,
    )
    expect(publishAcknowledgementText({ ...preview, acknowledgementRequired: false })).toBeNull()
  })

  function renderActions(acknowledgementRequired: boolean) {
    const onPublish = vi.fn().mockResolvedValue(undefined)
    render(
      <PolicyWorkflowActions
        policyId="p1"
        policyTitle="Safeguarding adults"
        policyReference="POL-SAF-001"
        documentStatus="APPROVED"
        workingStatus="APPROVED"
        hasInProgress
        publishedMajor={1}
        publishedMinor={0}
        can={p => p === 'policies.publish'}
        onSubmit={async () => {}}
        onRequestChanges={async () => {}}
        onApprove={async () => {}}
        onPublish={onPublish}
        onArchive={async () => {}}
        onDelete={async () => {}}
        onCreateVersion={async () => {}}
        acknowledgementRequired={acknowledgementRequired}
      />,
    )
  }

  it('shows the count in Ready to publish and in the publish dialog', async () => {
    signIn(['policies.read', 'policies.publish'])
    ackState.preview = preview
    const user = userEvent.setup()
    renderActions(true)
    const banner = screen.getByTestId('policy-ready-to-publish')
    expect(within(banner).getByTestId('policy-publish-acknowledgement-note')).toHaveTextContent(
      '9 staff members will need to read and acknowledge this policy',
    )
    await user.click(within(banner).getByRole('button', { name: 'Publish policy' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByTestId('policy-publish-acknowledgement-note')).toHaveTextContent(
      `by ${formatPolicyDate(preview.dueAt)}`,
    )
  })

  it('says nothing when the version does not require acknowledgement', () => {
    signIn(['policies.read', 'policies.publish'])
    ackState.preview = preview
    renderActions(false)
    expect(screen.queryByTestId('policy-publish-acknowledgement-note')).not.toBeInTheDocument()
  })
})
