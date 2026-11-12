import * as React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PolicyLibraryPanel } from '@/features/policies/components/PolicyLibraryPanel'
import { PolicyApplicabilityEditor } from '@/features/policies/components/PolicyApplicabilityEditor'
import { PolicyAudienceEditor } from '@/features/policies/components/PolicyAudienceEditor'
import { PolicyWorkflowActions } from '@/features/policies/components/PolicyWorkflowActions'
import { PolicyVersionCreateDialog } from '@/features/policies/components/PolicyVersionCreateDialog'
import { PolicyStatusBadge } from '@/features/policies/components/PolicyStatusBadge'
import { PolicyLinksEditor } from '@/features/policies/components/PolicyLinksEditor'
import { PolicyForm, emptyPolicyForm } from '@/features/policies/components/PolicyForm'
import { PolicyDocumentUploader } from '@/features/policies/components/PolicyDocumentUploader'
import { useAuthStore } from '@/features/auth/store'
import type { PolicyDocument, PolicyStatus } from '@/features/policies/types/policy.types'
import { formatPolicyDate } from '@/features/policies/policy-format'
import { ApiError } from '@/shared/api/api-client'

const {
  librarySearch,
  lookupState,
  createPolicyMock,
  updatePolicyMock,
  deletePolicyMock,
  publishPolicyMutateMock,
  toastSuccessMock,
  toastErrorMock,
  navigateMock,
} = vi.hoisted(() => ({
  librarySearch: { current: {} as Record<string, unknown> },
  lookupState: {
    current: {
      isLoading: false,
      locations: [{ id: 'loc-1', name: 'London' }],
      allLocations: [{ id: 'loc-1', name: 'London' }],
      jobTitles: [{ id: 'jt-1', name: 'Care Worker' }],
      workAreas: [] as Array<{ id: string; name: string }>,
      roles: [
        { id: 'role-1', name: 'Care Worker' },
        { id: 'role-2', name: 'Senior Care Worker' },
      ],
      careTypes: [{ id: 'ct-1', name: 'Domiciliary', code: 'DOMICILIARY' }],
      locationLabels: { 'loc-1': 'London' } as Record<string, string>,
      jobTitleLabels: { 'jt-1': 'Care Worker' } as Record<string, string>,
      workAreaLabels: {} as Record<string, string>,
      roleLabels: { 'role-1': 'Care Worker', 'role-2': 'Senior Care Worker' } as Record<string, string>,
      serviceLabels: { DOMICILIARY: 'Domiciliary' } as Record<string, string>,
      isLocationRestricted: false,
      assignedLocationIds: null as string[] | null,
    },
  },
  createPolicyMock: vi.fn(),
  updatePolicyMock: vi.fn(),
  deletePolicyMock: vi.fn(),
  publishPolicyMutateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={typeof to === 'string' ? to : '#'}>{children}</a>,
  useNavigate: () => navigateMock,
  useSearch: () => librarySearch.current,
  useParams: () => ({ policyId: 'p1' }),
  useBlocker: () => ({ status: 'idle', proceed: vi.fn(), reset: vi.fn() }),
}))

vi.mock('@/shared/lib/toast', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/toast')>('@/shared/lib/toast')
  return {
    ...actual,
    toastSuccess: (...args: unknown[]) => toastSuccessMock(...args),
    toastError: (...args: unknown[]) => toastErrorMock(...args),
  }
})

vi.mock('@/features/policies/api/policies.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/policies/api/policies.api')>(
    '@/features/policies/api/policies.api',
  )
  return {
    ...actual,
    deletePolicy: (...args: unknown[]) => deletePolicyMock(...args),
  }
})

vi.mock('@/features/policies/hooks/usePolicies', async () => {
  const actual = await vi.importActual<typeof import('@/features/policies/hooks/usePolicies')>(
    '@/features/policies/hooks/usePolicies',
  )
  return {
    ...actual,
    usePolicies: vi.fn(),
    usePolicy: vi.fn(),
    usePolicyVersions: vi.fn(),
    useCreatePolicy: vi.fn(() => ({ mutateAsync: createPolicyMock, isPending: false })),
    useUpdatePolicy: vi.fn(() => ({ mutateAsync: updatePolicyMock, isPending: false })),
    usePublishPolicy: vi.fn(() => ({ mutateAsync: publishPolicyMutateMock, isPending: false })),
    useUploadPolicyDocument: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useRemovePolicyDocument: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    usePolicyCategories: vi.fn(() => ({ data: { rows: [] }, isLoading: false })),
    usePolicyTags: vi.fn(() => ({ data: { rows: [{ id: 't1', name: 'Safeguarding', isActive: true }] }, isLoading: false })),
  }
})

vi.mock('@/features/policies/hooks/usePolicyLookups', () => ({
  usePolicyLookups: () => lookupState.current,
}))

vi.mock('@/shared/ui/rich-text-editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    disabled,
  }: {
    value?: string
    onChange?: (html: string) => void
    disabled?: boolean
  }) => (
    <textarea
      data-testid="policy-rich-text-mock"
      aria-label="Policy text"
      value={value}
      disabled={disabled}
      onChange={e => onChange?.(e.target.value)}
    />
  ),
}))

import { usePolicies, usePolicy, usePolicyCategories, usePolicyVersions, usePublishPolicy } from '@/features/policies/hooks/usePolicies'
import PolicyNewPage from '@/features/policies/pages/PolicyNewPage'
import PolicyEditPage from '@/features/policies/pages/PolicyEditPage'
import PolicyDetailPage from '@/features/policies/pages/PolicyDetailPage'

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function W({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

const samplePolicy: PolicyDocument = {
  id: 'p1',
  reference: 'POL-SAF-001',
  title: 'Safeguarding adults',
  description: 'Protect adults at risk',
  documentType: 'POLICY',
  source: 'EDITOR',
  primaryCategoryId: 'c1',
  primaryCategory: { id: 'c1', name: 'Safeguarding', code: 'SAF' },
  tags: [],
  parentDocumentId: null,
  currentVersionId: 'v1',
  status: 'DRAFT',
  isCatalogue: false,
  ownerId: 'u1',
  reviewerId: null,
  approverId: null,
  createdById: 'u1',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  currentVersion: {
    id: 'v1',
    documentId: 'p1',
    versionMajor: 1,
    versionMinor: 0,
    versionLabel: 'v1.0',
    status: 'DRAFT',
    titleSnapshot: 'Safeguarding adults',
    contentJson: { type: 'text', version: 1, text: 'Body' },
    contentHtml: 'Body',
    changeSummary: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    hasDocument: false,
    contentKind: 'EDITOR',
    effectiveDate: null,
    reviewDate: '2027-09-01',
    publishedAt: null,
    publishedById: null,
    archivedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    applicability: [{ organisationWide: true, locationId: null, serviceTypeCode: null }],
    audiences: [],
    links: [],
  },
}

function policyWithStatus(status: PolicyStatus, title = 'Safeguarding adults'): PolicyDocument {
  return {
    ...samplePolicy,
    id: `p-${status}`,
    title,
    status,
    currentVersion: samplePolicy.currentVersion
      ? { ...samplePolicy.currentVersion, status }
      : samplePolicy.currentVersion,
  }
}

function workflowProps(overrides: Partial<React.ComponentProps<typeof PolicyWorkflowActions>> = {}) {
  const noop = async () => {}
  return {
    policyId: 'p1',
    policyTitle: 'Safeguarding adults',
    documentStatus: 'DRAFT' as const,
    workingStatus: 'DRAFT' as const,
    hasInProgress: true,
    publishedMajor: 1,
    publishedMinor: 0,
    can: ((p: string) =>
      p === 'policies.archive' || p === 'policies.update' || p === 'policies.submit') as React.ComponentProps<
      typeof PolicyWorkflowActions
    >['can'],
    onSubmit: noop,
    onRequestChanges: noop,
    onApprove: noop,
    onPublish: noop,
    onArchive: noop,
    onDelete: noop,
    onCreateVersion: noop,
    ...overrides,
  }
}

describe('PolicyStatusBadge', () => {
  it('renders an accessible status label', () => {
    render(<PolicyStatusBadge status="IN_REVIEW" />)
    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('In review')).toBeInTheDocument()
  })
})

describe('PolicyLibraryPanel', () => {
  beforeEach(() => {
    librarySearch.current = {}
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Admin',
        role: 'admin',
        permissions: ['policies.read', 'policies.create', 'policies.archive'],
      },
    } as never)
    deletePolicyMock.mockReset()
    publishPolicyMutateMock.mockReset()
    publishPolicyMutateMock.mockResolvedValue(undefined)
    vi.mocked(usePublishPolicy).mockReturnValue({
      mutateAsync: publishPolicyMutateMock,
      isPending: false,
    } as never)
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    navigateMock.mockReset()
    vi.mocked(usePolicyCategories).mockReturnValue({
      data: { rows: [{ id: 'c1', name: 'Safeguarding', code: 'SAF', description: null, displayOrder: 0, isActive: true, createdAt: '', updatedAt: '' }] },
      isLoading: false,
    } as never)
  })

  it('renders policies in the library table', () => {
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [samplePolicy], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    expect(screen.getByText('Safeguarding adults')).toBeInTheDocument()
    expect(screen.getByText('POL-SAF-001')).toBeInTheDocument()
    expect(screen.getByText('Create policy')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Effective date' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Review date' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Updated' })).toBeInTheDocument()
    expect(screen.getByTestId('policy-effective-date')).toHaveTextContent('—')
    expect(screen.getByTestId('policy-review-date')).toHaveTextContent(formatPolicyDate('2027-09-01'))
  })

  it('shows the current version effective date in the library', () => {
    vi.mocked(usePolicies).mockReturnValue({
      data: {
        rows: [
          {
            ...samplePolicy,
            currentVersion: samplePolicy.currentVersion
              ? { ...samplePolicy.currentVersion, effectiveDate: '2026-09-03' }
              : null,
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    expect(screen.getByTestId('policy-effective-date')).toHaveTextContent(formatPolicyDate('2026-09-03'))
    expect(screen.getByTestId('policy-review-date')).toHaveTextContent(formatPolicyDate('2027-09-01'))
  })

  it('shows an empty state when there are no policies', () => {
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    expect(screen.getByText('No policies yet')).toBeInTheDocument()
    expect(screen.getByText(/Create your first policy/i)).toBeInTheDocument()
  })

  it('shows a no-match empty state when filters are applied', () => {
    librarySearch.current = { search: 'safeguarding' }
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    expect(screen.getByText('No policies match your filters.')).toBeInTheDocument()
  })

  it('paginates with Previous and Next', () => {
    librarySearch.current = { page: 2 }
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [samplePolicy], meta: { page: 2, limit: 20, total: 40, totalPages: 2, hasNextPage: false, hasPrevPage: true } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('does not show create when the user cannot create policies', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Staff',
        role: 'staff',
        permissions: ['policies.read'],
      },
    } as never)
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [samplePolicy], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    expect(screen.queryByText('Create policy')).not.toBeInTheDocument()
  })

  it('shows Delete for draft policies', async () => {
    const user = userEvent.setup()
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [samplePolicy], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Safeguarding adults' }))
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('does not show Delete for published policies', async () => {
    const user = userEvent.setup()
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [policyWithStatus('PUBLISHED', 'Live policy')], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Live policy' }))
    expect(await screen.findByText('Open')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows Publish policy first for approved policies', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Admin',
        role: 'admin',
        permissions: ['policies.read', 'policies.publish'],
      },
    } as never)
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [policyWithStatus('APPROVED', 'Approved policy')], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Approved policy' }))
    const items = await screen.findAllByRole('menuitem')
    expect(items[0]).toHaveTextContent('Publish policy')
  })

  it('does not show Publish policy for published policies', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Admin',
        role: 'admin',
        permissions: ['policies.read', 'policies.publish'],
      },
    } as never)
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [policyWithStatus('PUBLISHED', 'Live policy')], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Live policy' }))
    expect(await screen.findByText('Open')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Publish policy' })).not.toBeInTheDocument()
  })

  it('does not show Delete for historical statuses', async () => {
    const user = userEvent.setup()
    vi.mocked(usePolicies).mockReturnValue({
      data: {
        rows: [
          policyWithStatus('SUPERSEDED', 'Old policy'),
          policyWithStatus('ARCHIVED', 'Archived policy'),
          policyWithStatus('IN_REVIEW', 'Review policy'),
          policyWithStatus('APPROVED', 'Approved policy'),
        ],
        meta: { page: 1, limit: 20, total: 4, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    for (const title of ['Old policy', 'Archived policy', 'Review policy', 'Approved policy']) {
      await user.click(screen.getByRole('button', { name: `Actions for ${title}` }))
      expect(await screen.findByText('Open')).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
      await user.keyboard('{Escape}')
    }
  })

  it('does not show whole-policy Delete for a published document with a draft version', async () => {
    const user = userEvent.setup()
    const publishedWithDraft: PolicyDocument = {
      ...samplePolicy,
      title: 'Live with draft',
      status: 'PUBLISHED',
      currentVersion: samplePolicy.currentVersion
        ? { ...samplePolicy.currentVersion, status: 'DRAFT' }
        : samplePolicy.currentVersion,
    }
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [publishedWithDraft], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Live with draft' }))
    expect(await screen.findByText('Open')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('opens a confirmation dialog and cancel does not delete', async () => {
    const user = userEvent.setup()
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [samplePolicy], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Safeguarding adults' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete policy?')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete "Safeguarding adults"/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(deletePolicyMock).not.toHaveBeenCalled()
  })

  it('confirms deletion, calls DELETE, and shows a success toast', async () => {
    const user = userEvent.setup()
    deletePolicyMock.mockResolvedValue({ id: 'p1', deleted: true })
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [samplePolicy], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Safeguarding adults' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete policy' }))
    await waitFor(() => expect(deletePolicyMock).toHaveBeenCalledWith('p1'))
    expect(toastSuccessMock).toHaveBeenCalledWith('Policy deleted successfully.')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('keeps the policy and shows an error when deletion fails', async () => {
    const user = userEvent.setup()
    deletePolicyMock.mockRejectedValue(new ApiError('Only draft policies that have never been published can be permanently deleted', 400))
    vi.mocked(usePolicies).mockReturnValue({
      data: { rows: [samplePolicy], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyLibraryPanel />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Actions for Safeguarding adults' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete policy' }))
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(screen.getByText('Safeguarding adults')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('PolicyApplicabilityEditor', () => {
  const locations = [
    { id: 'loc-london', name: 'London' },
    { id: 'loc-birmingham', name: 'Birmingham' },
  ]
  const careTypes = [
    { id: 'ct-1', name: 'Domiciliary', code: 'DOMICILIARY' },
    { id: 'ct-2', name: 'Residential', code: 'RESIDENTIAL' },
  ]

  it('explains organisation-wide vs targeted matching', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PolicyApplicabilityEditor
        value={[{ organisationWide: true }]}
        onChange={onChange}
        locations={[{ id: 'loc-1', name: 'London' }]}
        careTypes={[{ id: 'ct-1', name: 'Domiciliary', code: 'DOMICILIARY' }]}
      />,
    )
    expect(screen.getByTestId('policy-applicability-summary')).toHaveTextContent('Applies to the whole organisation.')
    await user.click(screen.getByText('Specific branches or care services'))
    expect(onChange).toHaveBeenCalled()
  })

  it('lets unrestricted users choose Any branch', async () => {
    const user = userEvent.setup()
    render(
      <PolicyApplicabilityEditor
        value={[{ organisationWide: false }]}
        onChange={() => {}}
        locations={locations}
        careTypes={careTypes}
      />,
    )
    await user.click(screen.getByRole('combobox', { name: /Branch/i }))
    expect(screen.getByRole('option', { name: 'Any branch' })).toBeInTheDocument()
  })

  it('does not offer organisation-wide or Any branch to branch-scoped users', async () => {
    const user = userEvent.setup()
    render(
      <PolicyApplicabilityEditor
        value={[{ organisationWide: false }]}
        onChange={() => {}}
        locations={[{ id: 'loc-london', name: 'London' }]}
        careTypes={careTypes}
        locationRestricted
      />,
    )
    expect(screen.queryByText('Organisation-wide')).not.toBeInTheDocument()
    expect(screen.getByText(/Organisation-wide is not available/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: /Branch/i }))
    expect(screen.queryByRole('option', { name: 'Any branch' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'London' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Birmingham' })).not.toBeInTheDocument()
  })

  it('blocks saving an empty targeted row for a branch-scoped user', () => {
    render(
      <PolicyApplicabilityEditor
        value={[{ organisationWide: false }]}
        onChange={() => {}}
        locations={[{ id: 'loc-london', name: 'London' }]}
        careTypes={careTypes}
        locationRestricted
      />,
    )
    expect(screen.getByTestId('policy-applicability-error')).toHaveTextContent(
      'Select a branch for each target.',
    )
  })

  it('summarises location + service type, including multiple OR rows', () => {
    render(
      <PolicyApplicabilityEditor
        value={[
          { organisationWide: false, locationId: 'loc-london', serviceTypeCode: 'DOMICILIARY' },
          { organisationWide: false, locationId: 'loc-birmingham', serviceTypeCode: 'RESIDENTIAL' },
        ]}
        onChange={() => {}}
        locations={locations}
        careTypes={careTypes}
      />,
    )
    expect(screen.getByTestId('policy-applicability-summary')).toHaveTextContent(
      'London + Domiciliary OR Birmingham + Residential',
    )
    expect(screen.queryByTestId('policy-applicability-error')).not.toBeInTheDocument()
  })
})

describe('PolicyAudienceEditor', () => {
  it('shows all employees by default and builds an OR/AND summary', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <PolicyAudienceEditor
        value={[]}
        onChange={onChange}
        roles={[{ id: 'role-1', name: 'Care Worker' }, { id: 'role-2', name: 'Senior Care Worker' }]}
        jobTitles={[]}
        workAreas={[]}
        locations={[{ id: 'loc-1', name: 'London' }]}
      />,
    )
    expect(screen.getByTestId('policy-audience-summary')).toHaveTextContent('All employees')
    await user.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith([])
    rerender(
      <PolicyAudienceEditor
        value={[
          { targetType: 'ROLE', roleId: 'role-1' },
          { targetType: 'ROLE', roleId: 'role-2' },
          { targetType: 'LOCATION', locationId: 'loc-1' },
        ]}
        onChange={onChange}
        roles={[{ id: 'role-1', name: 'Care Worker' }, { id: 'role-2', name: 'Senior Care Worker' }]}
        jobTitles={[]}
        workAreas={[]}
        locations={[{ id: 'loc-1', name: 'London' }]}
      />,
    )
    expect(screen.getByTestId('policy-audience-summary')).toHaveTextContent(
      'Care Worker OR Senior Care Worker AND London',
    )
  })
})

describe('PolicyWorkflowActions', () => {
  it('hides edit for published policies and for users without update', () => {
    const { rerender } = render(
      <PolicyWorkflowActions
        {...workflowProps({
          documentStatus: 'PUBLISHED',
          workingStatus: null,
          hasInProgress: false,
          publishedMinor: 2,
          can: p => p === 'policies.archive' || p === 'policies.update',
        })}
      />,
    )
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create new version' })).toBeInTheDocument()

    rerender(
      <PolicyWorkflowActions
        {...workflowProps({
          can: () => false,
        })}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows Delete for a never-published draft and confirms through the dialog', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <PolicyWorkflowActions
        {...workflowProps({
          versions: [{ status: 'DRAFT' }],
          onDelete,
        })}
      />,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Delete policy?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete policy' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
  })

  it('does not show Delete for a published policy with an in-progress draft version', () => {
    render(
      <PolicyWorkflowActions
        {...workflowProps({
          documentStatus: 'PUBLISHED',
          workingStatus: 'DRAFT',
          hasInProgress: true,
          versions: [{ status: 'PUBLISHED' }, { status: 'DRAFT' }],
        })}
      />,
    )
    expect(screen.getByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows Ready to publish and opens the confirmation dialog for an approved policy', async () => {
    const user = userEvent.setup()
    const onPublish = vi.fn().mockResolvedValue(undefined)
    render(
      <PolicyWorkflowActions
        {...workflowProps({
          documentStatus: 'APPROVED',
          workingStatus: 'APPROVED',
          hasInProgress: true,
          policyReference: 'POL-SAF-001',
          effectiveDate: '2026-09-04',
          links: [{ moduleType: 'CARE_PLAN', scope: 'FORM_TEMPLATE', recordId: 'form-1', sectionKey: null, label: 'Falls' }],
          can: p => p === 'policies.publish',
          onPublish,
        })}
      />,
    )
    expect(screen.getByTestId('policy-ready-to-publish')).toHaveTextContent('Ready to publish')
    expect(screen.getByText('This policy has been approved and is ready to be made available to staff.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish policy' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publish policy' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Publish policy?')).toBeInTheDocument()
    expect(screen.getByText(/available to staff in its linked CareFlow areas/)).toBeInTheDocument()
    expect(screen.getByTestId('policy-publish-summary')).toHaveTextContent('Safeguarding adults')
    expect(screen.getByTestId('policy-publish-summary')).toHaveTextContent('POL-SAF-001')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Publish policy' }))
    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(1))
  })

  it('does not show Publish on a published policy', () => {
    render(
      <PolicyWorkflowActions
        {...workflowProps({
          documentStatus: 'PUBLISHED',
          workingStatus: null,
          hasInProgress: false,
          can: p => p === 'policies.publish' || p === 'policies.update' || p === 'policies.archive',
        })}
      />,
    )
    expect(screen.queryByTestId('policy-ready-to-publish')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish policy' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create new version' })).toBeInTheDocument()
  })
})

describe('PolicyDetailPage delete', () => {
  it('navigates to the library after a successful draft deletion', async () => {
    const user = userEvent.setup()
    deletePolicyMock.mockResolvedValue({ id: 'p1', deleted: true })
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Admin',
        role: 'admin',
        permissions: ['policies.read', 'policies.update', 'policies.submit', 'policies.archive'],
      },
    } as never)
    vi.mocked(usePolicy).mockReturnValue({
      data: samplePolicy,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(usePolicyVersions).mockReturnValue({
      data: [{ ...samplePolicy.currentVersion!, status: 'DRAFT' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete policy' }))
    await waitFor(() => expect(deletePolicyMock).toHaveBeenCalledWith('p1'))
    expect(toastSuccessMock).toHaveBeenCalledWith('Policy deleted successfully.')
    expect(navigateMock).toHaveBeenCalledWith({ to: '/policies' })
  })
})

describe('PolicyDetailPage publish', () => {
  const approvedPolicy: PolicyDocument = {
    ...samplePolicy,
    status: 'APPROVED',
    currentVersion: samplePolicy.currentVersion
      ? {
          ...samplePolicy.currentVersion,
          status: 'APPROVED',
          effectiveDate: '2026-09-04',
          links: [
            {
              moduleType: 'CARE_PLAN',
              scope: 'FORM_TEMPLATE',
              recordId: 'form-falls',
              sectionKey: null,
              label: 'Falls',
            },
          ],
        }
      : samplePolicy.currentVersion,
  }

  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Admin',
        role: 'admin',
        permissions: ['policies.read', 'policies.publish'],
      },
    } as never)
    vi.mocked(usePublishPolicy).mockReturnValue({
      mutateAsync: publishPolicyMutateMock,
      isPending: false,
    } as never)
    vi.mocked(usePolicy).mockReturnValue({
      data: approvedPolicy,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(usePolicyVersions).mockReturnValue({
      data: [{ ...approvedPolicy.currentVersion!, status: 'APPROVED' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
  })

  it('lists every part of the page in tabs under the title, in page order, and a tab jumps to its part', async () => {
    const user = userEvent.setup()
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    const nav = screen.getByRole('navigation', { name: 'Sections of this policy' })
    const tabs = within(nav).getAllByRole('button').map(b => b.textContent)
    expect(tabs).toEqual(['Summary', 'Content', 'Applicability', 'Audience', 'CareFlow links', 'Version history'])
    // Content follows the summary on the page, as on the tabs.
    const summary = document.getElementById('policy-summary')!
    const content = document.getElementById('policy-content')!
    expect(summary.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(within(nav).getByRole('button', { name: 'Version history' }))
    expect(scrolled).toHaveBeenCalled()
    expect(within(nav).getByRole('button', { name: 'Version history' })).toHaveAttribute('aria-current', 'true')
  })

  it('shows Ready to publish and Publish policy for an approved policy', () => {
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    expect(screen.getByTestId('policy-ready-to-publish')).toHaveTextContent('Ready to publish')
    expect(screen.getByRole('button', { name: 'Publish policy' })).toBeInTheDocument()
    expect(screen.getByTestId('policy-workflow-stepper')).toHaveTextContent('Draft')
    expect(screen.getByTestId('policy-approved-not-live')).toHaveTextContent('Approved but not yet live')
  })

  it('opens the publish confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Publish policy' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Publish policy?')).toBeInTheDocument()
    expect(within(dialog).getByText('Safeguarding adults')).toBeInTheDocument()
    expect(within(dialog).getByText('POL-SAF-001')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Publish policy' })).toBeInTheDocument()
  })

  it('does not show Publish on a published policy', () => {
    const published = {
      ...approvedPolicy,
      status: 'PUBLISHED' as const,
      currentVersion: approvedPolicy.currentVersion
        ? { ...approvedPolicy.currentVersion, status: 'PUBLISHED' as const }
        : approvedPolicy.currentVersion,
    }
    vi.mocked(usePolicy).mockReturnValue({
      data: published,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(usePolicyVersions).mockReturnValue({
      data: [{ ...published.currentVersion!, status: 'PUBLISHED' }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    expect(screen.queryByTestId('policy-ready-to-publish')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish policy' })).not.toBeInTheDocument()
    expect(screen.getAllByTestId('policy-status-badge')[0]).toHaveTextContent('Published')
  })

  it('refreshes status after a successful publish', async () => {
    const user = userEvent.setup()
    const published = {
      ...approvedPolicy,
      status: 'PUBLISHED' as const,
      currentVersion: approvedPolicy.currentVersion
        ? { ...approvedPolicy.currentVersion, status: 'PUBLISHED' as const }
        : approvedPolicy.currentVersion,
    }
    publishPolicyMutateMock.mockImplementation(async () => {
      vi.mocked(usePolicy).mockReturnValue({
        data: published,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never)
      vi.mocked(usePolicyVersions).mockReturnValue({
        data: [{ ...published.currentVersion!, status: 'PUBLISHED' }],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never)
      return published
    })
    const { rerender } = render(<PolicyDetailPage />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Publish policy' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Publish policy' }))
    await waitFor(() => expect(publishPolicyMutateMock).toHaveBeenCalledWith({ id: 'p1' }))
    expect(toastSuccessMock).toHaveBeenCalledWith('Policy published successfully')
    rerender(<PolicyDetailPage />)
    expect(screen.queryByTestId('policy-ready-to-publish')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish policy' })).not.toBeInTheDocument()
    expect(screen.getAllByTestId('policy-status-badge')[0]).toHaveTextContent('Published')
  })

  it('keeps Ready to publish and shows the existing error toast when publish fails', async () => {
    const user = userEvent.setup()
    publishPolicyMutateMock.mockRejectedValue(new ApiError("You don't have permission to perform this action.", 403))
    render(<PolicyDetailPage />, { wrapper: wrapper() })
    await user.click(screen.getByRole('button', { name: 'Publish policy' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Publish policy' }))
    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Permission denied',
        "You don't have permission to perform this action.",
      ),
    )
    expect(screen.getByTestId('policy-ready-to-publish')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})

describe('PolicyVersionCreateDialog', () => {
  it('previews minor and major versions from 1.2', () => {
    render(
      <PolicyVersionCreateDialog
        open
        onOpenChange={() => {}}
        currentMajor={1}
        currentMinor={2}
        bump="minor"
        onBumpChange={() => {}}
        onConfirm={() => {}}
        reusePreviousContent
        onReusePreviousContentChange={() => {}}
      />,
    )
    expect(screen.getByText(/Current v1.2 → v1.3/)).toBeInTheDocument()
    expect(screen.getByText(/Current v1.2 → v2.0/)).toBeInTheDocument()
    expect(screen.getByText('Copy previous content')).toBeInTheDocument()
  })

  it('offers reuse or replacement for uploaded policies', () => {
    render(
      <PolicyVersionCreateDialog
        open
        onOpenChange={() => {}}
        currentMajor={1}
        currentMinor={0}
        bump="minor"
        onBumpChange={() => {}}
        onConfirm={() => {}}
        contentKind="UPLOAD"
        reusePreviousContent
        onReusePreviousContentChange={() => {}}
      />,
    )
    expect(screen.getByText('Reuse previous document')).toBeInTheDocument()
    expect(screen.getByText('Upload replacement document')).toBeInTheDocument()
  })
})

describe('PolicyLinksEditor', () => {
  it('shows an empty state until a CareFlow area is linked', () => {
    render(<PolicyLinksEditor value={[]} onChange={() => {}} />)
    expect(screen.getByText('This policy is not linked to any CareFlow area.')).toBeInTheDocument()
  })
})

describe('PolicyForm', () => {
  beforeEach(() => {
    lookupState.current = {
      ...lookupState.current,
      isLocationRestricted: false,
      assignedLocationIds: null,
      locations: [{ id: 'loc-1', name: 'London' }],
    }
  })

  it('renders create fields and source selection', () => {
    render(
      <PolicyForm
        values={emptyPolicyForm('u1', true)}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Save draft"
      />,
      { wrapper: wrapper() },
    )
    expect(screen.getByLabelText(/Policy title/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Reference/)).toBeInTheDocument()
    expect(screen.getByTestId('policy-source-editor')).toBeInTheDocument()
    expect(screen.getByTestId('policy-source-upload')).toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
    expect(screen.getByTestId('policy-rich-text-mock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled()
  })

  it('puts the summary (title, owner, dates) and tags above the policy content, with tabs for every part', () => {
    render(
      <PolicyForm values={emptyPolicyForm('u1', true)} onChange={vi.fn()} onSubmit={() => {}} submitLabel="Save draft" />,
      { wrapper: wrapper() },
    )
    const nav = screen.getByTestId('policy-form-section-nav')
    expect(within(nav).getAllByRole('button').map(b => b.textContent)).toEqual([
      'Summary',
      'Tags',
      'Content',
      'Applicability',
      'Audience',
      'Staff acknowledgement',
      'CareFlow links',
    ])
    const title = screen.getByLabelText(/Policy title/)
    const content = screen.getByTestId('policy-content-source')
    expect(title.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('opens the upload interface when Upload document is selected', async () => {
    const user = userEvent.setup()
    const values = emptyPolicyForm('u1', true)
    const onChange = vi.fn()
    const { rerender } = render(
      <PolicyForm values={values} onChange={onChange} onSubmit={() => {}} submitLabel="Save draft" />,
      { wrapper: wrapper() },
    )
    await user.click(screen.getByTestId('policy-source-upload'))
    expect(onChange).toHaveBeenCalled()
    rerender(
      <PolicyForm
        values={{ ...values, contentMode: 'UPLOAD' }}
        onChange={onChange}
        onSubmit={() => {}}
        submitLabel="Save draft"
      />,
    )
    expect(screen.getByTestId('policy-upload-dropzone')).toBeInTheDocument()
    expect(screen.getByText(/Drag & drop your policy here/)).toBeInTheDocument()
    expect(screen.getByText(/PDF, DOC, DOCX · Maximum 25 MB/)).toBeInTheDocument()
  })

  it('keeps save enabled when a branch-scoped user has not selected a location', async () => {
    lookupState.current = {
      ...lookupState.current,
      isLocationRestricted: true,
      assignedLocationIds: ['loc-1'],
      locations: [{ id: 'loc-1', name: 'London' }],
    }
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <PolicyForm
        values={{
          ...emptyPolicyForm('u1', false),
          title: 'Partial draft',
          reference: 'POL-BR-DRAFT',
          primaryCategoryId: 'c1',
        }}
        onChange={() => {}}
        onSubmit={onSubmit}
        submitLabel="Save draft"
        hasChanges
      />,
      { wrapper: wrapper() },
    )
    const save = screen.getByRole('button', { name: 'Save draft' })
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSubmit).toHaveBeenCalled()
    expect(screen.getByTestId('policy-applicability-error')).toHaveTextContent(
      'Select a branch for each target.',
    )
  })

  it('keeps save enabled when final-policy fields are still empty', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <PolicyForm
        values={{
          ...emptyPolicyForm('u1', true),
          title: 'Title only',
          reference: 'POL-MIN-001',
          primaryCategoryId: 'c1',
        }}
        onChange={() => {}}
        onSubmit={onSubmit}
        submitLabel="Save draft"
        hasChanges
      />,
      { wrapper: wrapper() },
    )
    const save = screen.getByRole('button', { name: 'Save draft' })
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('keeps save enabled when there is no change yet so the click can report validation errors', () => {
    render(
      <PolicyForm
        values={emptyPolicyForm('u1', true)}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Save draft"
        hasChanges={false}
      />,
      { wrapper: wrapper() },
    )
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled()
  })

  it('shows a loading label while saving', () => {
    render(
      <PolicyForm
        values={emptyPolicyForm('u1', true)}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Save draft"
        pending
        hasChanges
      />,
      { wrapper: wrapper() },
    )
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('keeps the editor read-only for published versions', () => {
    render(
      <PolicyForm
        values={{ ...emptyPolicyForm('u1', true), contentHtml: '<p>Published</p>' }}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Save draft"
        readOnly
      />,
      { wrapper: wrapper() },
    )
    expect(screen.getByTestId('policy-rich-text-mock')).toBeDisabled()
    expect(screen.getByTestId('policy-source-editor')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument()
  })
})

describe('PolicyDocumentUploader', () => {
  it('shows empty, success, progress, and error states', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { rerender } = render(
      <PolicyDocumentUploader
        uploaded={null}
        pendingFile={null}
        status="idle"
        progress={0}
        error={null}
        onSelectFile={onSelect}
        onClearPending={() => {}}
      />,
    )
    expect(screen.getByTestId('policy-upload-dropzone')).toBeInTheDocument()

    const input = screen.getByTestId('policy-upload-input') as HTMLInputElement
    const bad = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [bad] } })
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByTestId('policy-upload-error')).toHaveTextContent('Unsupported file type')

    rerender(
      <PolicyDocumentUploader
        uploaded={null}
        pendingFile={null}
        status="uploading"
        progress={42}
        error={null}
        onSelectFile={onSelect}
        onClearPending={() => {}}
      />,
    )
    expect(screen.getByTestId('policy-upload-progress')).toHaveTextContent('42%')

    rerender(
      <PolicyDocumentUploader
        uploaded={{ fileName: 'Safeguarding.pdf', mimeType: 'application/pdf', fileSize: 2048 }}
        pendingFile={null}
        status="success"
        progress={100}
        error={null}
        onSelectFile={onSelect}
        onClearPending={() => {}}
      />,
    )
    expect(screen.getByTestId('policy-upload-success')).toHaveTextContent('Safeguarding.pdf')
    expect(screen.getByText(/PDF/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('rejects files over 25 MB', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <PolicyDocumentUploader
        uploaded={null}
        pendingFile={null}
        status="idle"
        progress={0}
        error={null}
        onSelectFile={onSelect}
        onClearPending={() => {}}
      />,
    )
    const big = new File(['x'], 'policy.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 26 * 1024 * 1024 })
    fireEvent.change(screen.getByTestId('policy-upload-input'), { target: { files: [big] } })
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByTestId('policy-upload-error')).toHaveTextContent('File too large')
  })
})

describe('Save draft mutation flow', () => {
  beforeEach(() => {
    createPolicyMock.mockReset()
    updatePolicyMock.mockReset()
    createPolicyMock.mockResolvedValue({ id: 'p-new', currentVersion: { id: 'v-new' } })
    updatePolicyMock.mockResolvedValue({ id: 'p1' })
    lookupState.current = {
      ...lookupState.current,
      isLocationRestricted: false,
      assignedLocationIds: null,
    }
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Admin',
        role: 'admin',
        permissions: ['policies.read', 'policies.create', 'policies.update'],
        assignedLocationIds: null,
      },
    } as never)
    vi.mocked(usePolicyCategories).mockReturnValue({
      data: {
        rows: [{ id: 'c1', name: 'Safeguarding', code: 'SAF', description: null, displayOrder: 0, isActive: true, createdAt: '', updatedAt: '' }],
      },
      isLoading: false,
    } as never)
  })

  it('clicks Save draft on create and calls the create mutation with persistable fields', async () => {
    const user = userEvent.setup()
    render(<PolicyNewPage />, { wrapper: wrapper() })
    await user.type(screen.getByLabelText(/Policy title/), 'Safeguarding adults')
    await user.type(screen.getByLabelText(/Reference/), 'POL-SAF-NEW')
    await user.click(screen.getByRole('combobox', { name: /Category/i }))
    await user.click(await screen.findByRole('option', { name: 'Safeguarding' }))
    await user.click(screen.getByTestId('policy-save-draft'))
    expect(createPolicyMock).toHaveBeenCalledTimes(1)
    expect(createPolicyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Safeguarding adults',
        reference: 'POL-SAF-NEW',
        documentType: 'POLICY',
        primaryCategoryId: 'c1',
        source: 'EDITOR',
      }),
    )
    const payload = createPolicyMock.mock.calls[0][0] as Record<string, unknown>
    expect(payload.contentHtml).toBeUndefined()
  })

  it('clicks Save draft on edit and calls the update mutation', async () => {
    const user = userEvent.setup()
    vi.mocked(usePolicy).mockReturnValue({
      data: samplePolicy,
      isLoading: false,
      isError: false,
    } as never)
    vi.mocked(usePolicyVersions).mockReturnValue({
      data: [samplePolicy.currentVersion],
      isLoading: false,
    } as never)
    render(<PolicyEditPage />, { wrapper: wrapper() })
    const description = await screen.findByLabelText(/Description/)
    await user.clear(description)
    await user.type(description, 'Updated draft notes')
    await user.click(screen.getByTestId('policy-save-draft'))
    expect(updatePolicyMock).toHaveBeenCalledTimes(1)
    expect(updatePolicyMock).toHaveBeenCalledWith({
      id: 'p1',
      body: expect.objectContaining({
        title: 'Safeguarding adults',
        reference: 'POL-SAF-001',
        primaryCategoryId: 'c1',
        description: 'Updated draft notes',
      }),
    })
  })
})
