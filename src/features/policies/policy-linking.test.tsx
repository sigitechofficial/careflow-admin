import * as React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PolicyLinksEditor } from '@/features/policies/components/PolicyLinksEditor'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { useAuthStore } from '@/features/auth/store'
import { useApplicablePolicies } from '@/features/policies/hooks/usePolicies'
import type { PolicyDocument } from '@/features/policies/types/policy.types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={typeof to === 'string' ? to : '#'}>{children}</a>
  ),
}))

vi.mock('@/features/policies/hooks/usePolicies', async () => {
  const actual = await vi.importActual<typeof import('@/features/policies/hooks/usePolicies')>(
    '@/features/policies/hooks/usePolicies',
  )
  return {
    ...actual,
    useApplicablePolicies: vi.fn(),
  }
})

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
  ownerId: 'u1',
  reviewerId: null,
  approverId: null,
  createdById: 'u1',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  currentVersion: null,
}

describe('PolicyLinksEditor', () => {
  it('shows an empty state until a CareFlow area is linked', () => {
    render(<PolicyLinksEditor value={[]} onChange={() => {}} />)
    expect(screen.getByText('This policy is not linked to any CareFlow area.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add CareFlow link' })).toBeInTheDocument()
  })

  it('adds the first link without replacing later ones', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const first = { moduleType: 'CARE_PLAN' as const, scope: 'MODULE' as const }
    const { rerender } = render(<PolicyLinksEditor value={[]} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Add CareFlow link' }))
    await user.click(screen.getByRole('button', { name: 'Save link' }))
    expect(onChange).toHaveBeenCalledWith([first])

    onChange.mockClear()
    rerender(<PolicyLinksEditor value={[first]} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Add CareFlow link' }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Incidents' }))
    await user.click(screen.getByRole('button', { name: 'Save link' }))
    expect(onChange).toHaveBeenCalledWith([
      first,
      { moduleType: 'INCIDENT', scope: 'MODULE' },
    ])
  })

  it('edits and removes an existing link', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const value = [{ moduleType: 'CARE_PLAN' as const, scope: 'MODULE' as const }]
    const { rerender } = render(<PolicyLinksEditor value={value} onChange={onChange} />)
    expect(screen.getByTestId('policy-link-card')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit link' }))
    expect(screen.getByText('Edit CareFlow link')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Medication' }))
    await user.click(screen.getByRole('button', { name: 'Save link' }))
    expect(onChange).toHaveBeenCalledWith([{ moduleType: 'MEDICATION', scope: 'MODULE' }])

    onChange.mockClear()
    rerender(<PolicyLinksEditor value={value} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Remove link' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('prevents duplicate CareFlow links', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PolicyLinksEditor
        value={[{ moduleType: 'CARE_PLAN', scope: 'MODULE' }]}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Add CareFlow link' }))
    await user.click(screen.getByRole('button', { name: 'Save link' }))
    expect(screen.getByText('This CareFlow link has already been added.')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('displays multiple module links as separate cards', () => {
    render(
      <PolicyLinksEditor
        value={[
          { moduleType: 'CARE_PLAN', scope: 'MODULE' },
          { moduleType: 'INCIDENT', scope: 'MODULE', label: 'All incidents' },
        ]}
        onChange={() => {}}
      />,
    )
    expect(screen.getAllByTestId('policy-link-card')).toHaveLength(2)
    expect(screen.getByText('Care Plans')).toBeInTheDocument()
    expect(screen.getByText('Incidents')).toBeInTheDocument()
  })
})

describe('PolicyContextPanel', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'a@b.c',
        displayName: 'Admin',
        role: 'admin',
        permissions: ['policies.read'],
      },
    } as never)
  })

  it('shows loading, empty, and error states without breaking the host', () => {
    vi.mocked(useApplicablePolicies).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never)
    const { rerender } = render(<PolicyContextPanel moduleType="CARE_PLAN" />, { wrapper: wrapper() })
    expect(screen.getByText('Policies & Guidance')).toBeInTheDocument()
    expect(screen.getByTestId('policy-context-panel-loading')).toBeInTheDocument()

    vi.mocked(useApplicablePolicies).mockReturnValue({
      data: { rows: [] },
      isLoading: false,
      isError: false,
    } as never)
    rerender(<PolicyContextPanel moduleType="CARE_PLAN" />)
    expect(
      screen.getByText('No policies or guidance are currently linked to this area.'),
    ).toBeInTheDocument()

    vi.mocked(useApplicablePolicies).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never)
    rerender(<PolicyContextPanel moduleType="CARE_PLAN" />)
    expect(screen.getByText('Policies could not be loaded.')).toBeInTheDocument()
  })

  it('renders unique policy cards and a view link', () => {
    vi.mocked(useApplicablePolicies).mockReturnValue({
      data: { rows: [samplePolicy] },
      isLoading: false,
      isError: false,
    } as never)
    render(<PolicyContextPanel moduleType="CARE_PLAN" recordId="cp-margaret" />, { wrapper: wrapper() })
    expect(screen.getByText('Safeguarding adults')).toBeInTheDocument()
    expect(screen.getByText('POL-SAF-001')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Policy' })).toHaveAttribute('href', '/policies/$policyId')
  })
})
