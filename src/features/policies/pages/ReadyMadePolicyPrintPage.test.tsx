import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({ policy: null as unknown }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({ libraryId: 'lib1' }),
  useSearch: () => ({ print: '0' }),
}))
vi.mock('@/features/policies/api/policy-library.api', () => ({
  useLibraryPolicy: () => ({ data: state.policy, isLoading: false }),
}))
vi.mock('@/store/company.store', () => ({
  useCompanyStore: (pick: (s: unknown) => unknown) => pick({ branding: { displayName: 'Allfor Care' }, loadBranding: vi.fn() }),
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: unknown) => unknown) => pick({ user: { displayName: 'Sam Lee' } }),
}))
vi.mock('@/features/policies/components/PolicyDownloadButtons', () => ({
  PolicyDownloadButtons: ({ target }: { target: { kind: string; libraryId?: string } }) => <span data-testid="downloads">{`${target.kind} ${target.libraryId}`}</span>,
}))

import ReadyMadePolicyPrintPage from './ReadyMadePolicyPrintPage'

const policy = (over: Record<string, unknown> = {}) => ({
  id: 'lib1',
  reference: 'POL-CD-001',
  title: 'Person-Centred Care Policy',
  summary: 'Our parent policy for care delivery.',
  documentType: 'POLICY',
  category: { name: 'Care delivery' },
  researchedOn: '2026-10-01',
  revision: 3,
  reviewFrequencyMonths: 12,
  regulatoryBasis: [{ source: 'Care Act 2014', url: 'https://www.legislation.gov.uk/ukpga/2014/23' }],
  adoptedPolicyId: null,
  contentHtml: '<h2>1. Policy statement</h2><p>We plan care around each person.</p>',
  ...over,
})

beforeEach(() => {
  window.print = vi.fn()
  state.policy = policy()
})

describe('Printed ready-made policy', () => {
  it('prints the policy with its details, says it is ready-made and lists the legislation', () => {
    render(<ReadyMadePolicyPrintPage />)
    const doc = screen.getByTestId('policy-print')
    expect(screen.getByRole('heading', { level: 1, name: 'Person-Centred Care Policy' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('It is not your organisation’s policy until it is adopted, reviewed and published.')
    expect(screen.getByRole('row', { name: /Reference POL-CD-001 Revision 3/ })).toBeInTheDocument()
    expect(screen.getByTestId('policy-print-content')).toHaveTextContent('1. Policy statement')
    expect(doc).toHaveTextContent('Legislation and guidance')
    expect(doc).toHaveTextContent('Care Act 2014')
    expect(screen.getByTestId('downloads')).toHaveTextContent('library lib1')
    expect(window.print).not.toHaveBeenCalled()
  })

  it('once adopted, points to the organisation’s own copy', () => {
    state.policy = policy({ adoptedPolicyId: 'p9' })
    render(<ReadyMadePolicyPrintPage />)
    expect(screen.getByRole('note')).toHaveTextContent('its own copy in Policies is the version staff follow')
  })
})
