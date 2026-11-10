import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const state = vi.hoisted(() => ({
  policy: null as unknown,
  versions: [] as unknown[],
  search: {} as Record<string, string>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({ policyId: 'p1' }),
  useSearch: () => state.search,
}))
vi.mock('@/features/policies/hooks/usePolicies', () => ({
  usePolicy: () => ({ data: state.policy, isLoading: false }),
  usePolicyVersions: () => ({ data: state.versions, isLoading: false }),
  usePolicyVersion: () => ({ data: undefined, isLoading: false }),
}))
vi.mock('@/store/company.store', () => ({
  useCompanyStore: (pick: (s: unknown) => unknown) =>
    pick({ branding: { displayName: 'Allfor Care', companyName: 'Allfor Care Ltd', displayLogoUrl: null, companyLogoUrl: null }, loadBranding: vi.fn() }),
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: unknown) => unknown) => pick({ user: { displayName: 'Sam Lee', email: 'sam@example.test' } }),
}))
vi.mock('@/features/policies/components/PolicySourceDocument', () => ({ PolicySourceDocument: () => <button type="button">View document</button> }))
vi.mock('@/features/policies/components/PolicyDownloadButtons', () => ({
  PolicyDownloadButtons: ({ target }: { target: { versionId?: string } }) => <span data-testid="downloads">{`downloads ${target.versionId ?? ''}`}</span>,
}))

import PolicyPrintPage, { versionToPrint } from './PolicyPrintPage'

const version = (over: Record<string, unknown> = {}) => ({
  id: 'v1',
  status: 'PUBLISHED',
  versionLabel: 'v1.0',
  contentKind: 'EDITOR',
  hasDocument: false,
  fileName: null,
  contentJson: null,
  contentHtml: '<h2>1. Policy statement</h2><p>We support people with their medicines.</p>',
  effectiveDate: '2026-11-01',
  reviewDate: '2027-11-01',
  publishedAt: '2026-11-05T10:00:00Z',
  ...over,
})

beforeEach(() => {
  window.print = vi.fn()
  state.search = { print: '0' }
  state.policy = {
    id: 'p1',
    reference: 'POL-MED-001',
    title: 'Medicines Management Policy',
    description: 'How we support people with their medicines.',
    documentType: 'POLICY',
    primaryCategory: { name: 'Medication' },
    currentVersion: version(),
  }
  state.versions = [version()]
})

describe('Printed policy', () => {
  it('prints the published version as a document: organisation, reference, details, text and the end note', () => {
    render(<PolicyPrintPage />)
    const doc = screen.getByTestId('policy-print')
    expect(doc).toHaveTextContent('Allfor Care')
    expect(doc).toHaveTextContent('POL-MED-001')
    expect(screen.getByRole('heading', { level: 1, name: 'Medicines Management Policy' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Reference POL-MED-001 Version v1.0/ })).toBeInTheDocument()
    expect(screen.getByTestId('policy-print-content')).toHaveTextContent('1. Policy statement')
    expect(doc).toHaveTextContent('Printed copies are not controlled')
    expect(doc).toHaveTextContent('by Sam Lee')
    expect(screen.queryByText('DRAFT')).toBeNull()
    expect(window.print).not.toHaveBeenCalled() // ?print=0
    // Download PDF / Word for the version shown.
    expect(screen.getByTestId('downloads')).toHaveTextContent('downloads v1')
  })

  it('marks a version that is not published as a draft on the page', () => {
    state.versions = [version({ status: 'DRAFT' })]
    state.policy = { ...(state.policy as object), currentVersion: version({ status: 'DRAFT' }) }
    render(<PolicyPrintPage />)
    expect(screen.getByRole('note')).toHaveTextContent('This version (v1.0) is not published')
    expect(screen.getByText('DRAFT')).toBeInTheDocument()
  })

  it('an uploaded policy prints a cover sheet and points to its document', () => {
    state.versions = [version({ contentKind: 'UPLOAD', hasDocument: true, fileName: 'medicines.pdf', contentHtml: null })]
    render(<PolicyPrintPage />)
    expect(screen.getByTestId('policy-print')).toHaveTextContent('uploaded document (medicines.pdf)')
    expect(screen.getByRole('button', { name: 'View document' })).toBeInTheDocument()
    // An uploaded document is downloaded as it is, not remade as PDF or Word.
    expect(screen.queryByTestId('downloads')).toBeNull()
  })

  it('chooses the published version, else the current one', () => {
    const published = version({ id: 'pub' }) as never
    const draft = version({ id: 'draft', status: 'DRAFT' }) as never
    expect(versionToPrint([draft, published], draft)?.id).toBe('pub')
    expect(versionToPrint([draft], draft)?.id).toBe('draft')
  })
})
