import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PolicyLibraryUpdateBanner } from '@/features/policies/components/PolicyLibraryUpdateBanner'
import type { LibraryLink } from '@/features/policies/api/policy-library.api'

const { state, applyMock, navigateMock } = vi.hoisted(() => ({
  state: { link: null as LibraryLink | null },
  applyMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))

vi.mock('@/features/policies/api/policy-library.api', () => ({
  useLibraryLink: () => ({ data: state.link, isLoading: false }),
  useLibraryPolicy: (id: string | null) => ({
    data: id ? { contentHtml: '<h2>1. Policy statement</h2><p>Allfor Care protects people.</p>' } : undefined,
    isLoading: false,
  }),
  useApplyLibraryUpdate: () => ({ mutate: applyMock, isPending: false }),
}))

const link = (over: Partial<LibraryLink> = {}): LibraryLink => ({
  libraryId: 'lib-1',
  reference: 'POL-SG-001',
  title: 'Safeguarding Adults Policy',
  adoptedRevision: 1,
  currentRevision: 2,
  revisionNote: 'Updated for the new CQC assessment framework',
  updateAvailable: true,
  ...over,
})

describe('PolicyLibraryUpdateBanner', () => {
  beforeEach(() => {
    applyMock.mockReset()
    navigateMock.mockReset()
  })

  it('stays hidden when the policy is up to date or was not adopted', () => {
    state.link = link({ updateAvailable: false })
    const { container, rerender } = render(<PolicyLibraryUpdateBanner policyId="p1" />)
    expect(container).toBeEmptyDOMElement()
    state.link = null
    rerender(<PolicyLibraryUpdateBanner policyId="p1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('explains the update, shows the new text and applies it to a draft', async () => {
    state.link = link()
    render(<PolicyLibraryUpdateBanner policyId="p1" />)
    expect(screen.getByTestId('policy-library-update-banner')).toHaveTextContent(
      'You adopted revision 1; revision 2 is now available: Updated for the new CQC assessment framework',
    )
    await userEvent.click(screen.getByRole('button', { name: /review the update/i }))
    expect(await screen.findByText('Allfor Care protects people.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /apply to a draft/i }))
    expect(applyMock).toHaveBeenCalledWith('p1', expect.any(Object))
  })
})
