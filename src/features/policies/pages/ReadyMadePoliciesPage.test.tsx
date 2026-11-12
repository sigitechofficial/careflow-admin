import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  adoptResult: null as unknown,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => state.navigate,
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: unknown) => unknown) => pick({ can: () => true }),
}))
vi.mock('@/features/policies/components/PolicySectionLayout', () => ({
  PolicySectionLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/features/policies/components/PolicyDownloadButtons', () => ({ PolicyDownloadButtons: () => null }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

const libraryPolicy = (id: string, title: string) => ({
  id,
  reference: id.toUpperCase(),
  title,
  summary: 'A ready-made policy.',
  documentType: 'POLICY',
  category: { id: 'c1', name: 'Care delivery', code: null, displayOrder: 1 },
  researchedOn: '2026-10-01',
  wordCount: 1200,
  revision: 1,
  revisionNote: null,
  sectionHeadings: ['1. Policy statement'],
  reviewFrequencyMonths: 12,
  adoptedPolicyId: null,
  adoptedRevision: null,
  updateAvailable: false,
})

vi.mock('@/features/policies/api/policy-library.api', () => ({
  MODULE_LABELS: {},
  useLibraryPolicies: () => ({
    data: [libraryPolicy('lib1', 'Person-Centred Care Policy'), libraryPolicy('lib2', 'Consent Policy')],
    isLoading: false,
    isError: false,
  }),
  useLibraryPolicy: () => ({ data: null, isLoading: false }),
  useAdoptLibraryPolicies: () => ({
    isPending: false,
    mutate: (_ids: string[], opts: { onSuccess: (r: unknown) => void }) => opts.onSuccess(state.adoptResult),
  }),
}))

import ReadyMadePoliciesPage from './ReadyMadePoliciesPage'

beforeEach(() => {
  state.navigate.mockReset()
})

describe('Ready-made policies: adopting', () => {
  it('opens the new draft after adopting one policy, ready to edit and send for review', async () => {
    const user = userEvent.setup()
    state.adoptResult = { created: [{ libraryId: 'lib1', policyId: 'p9', reference: 'LIB1', title: 'Person-Centred Care Policy' }], skipped: [] }
    render(<ReadyMadePoliciesPage />)
    await user.click(screen.getByRole('checkbox', { name: 'Select Person-Centred Care Policy' }))
    await user.click(screen.getByRole('button', { name: /Adopt as drafts/ }))
    expect(state.navigate).toHaveBeenCalledWith({ to: '/policies/$policyId', params: { policyId: 'p9' } })
  })

  it('opens the Policy Library after adopting several at once', async () => {
    const user = userEvent.setup()
    state.adoptResult = {
      created: [
        { libraryId: 'lib1', policyId: 'p9', reference: 'LIB1', title: 'Person-Centred Care Policy' },
        { libraryId: 'lib2', policyId: 'p10', reference: 'LIB2', title: 'Consent Policy' },
      ],
      skipped: [],
    }
    render(<ReadyMadePoliciesPage />)
    await user.click(screen.getByRole('checkbox', { name: 'Select Person-Centred Care Policy' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Consent Policy' }))
    await user.click(screen.getByRole('button', { name: /Adopt as drafts/ }))
    expect(state.navigate).toHaveBeenCalledWith({ to: '/policies' })
  })

  it('stays on the list when nothing was added (all already adopted)', async () => {
    const user = userEvent.setup()
    state.adoptResult = {
      created: [],
      skipped: [
        { libraryId: 'lib1', reference: 'LIB1', title: 'Person-Centred Care Policy', reason: 'Already adopted' },
        { libraryId: 'lib2', reference: 'LIB2', title: 'Consent Policy', reason: 'Already adopted' },
      ],
    }
    render(<ReadyMadePoliciesPage />)
    await user.click(screen.getByRole('checkbox', { name: 'Select Person-Centred Care Policy' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Consent Policy' }))
    await user.click(screen.getByRole('button', { name: /Adopt as drafts/ }))
    expect(state.navigate).not.toHaveBeenCalled()
  })
})
