import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Enquiry } from '@/features/crm/types/crm.types'

const { navigate, mutate } = vi.hoisted(() => ({ navigate: vi.fn(), mutate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: () => boolean }) => unknown) => pick({ can: () => true }),
}))
vi.mock('@/features/crm/hooks/useCrm', () => ({
  useStartEnquiryInitialAssessment: () => ({ mutate, isPending: false }),
}))

import { EnquiryInitialAssessment } from '@/features/crm/components/EnquiryInitialAssessment'

const base = { id: 'e1', stage: 'ASSESSMENT', firstName: 'Jo', lastName: 'Bloggs' } as Enquiry

describe('EnquiryInitialAssessment (Plan → Assessment)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts the full assessment on a new Pre-admission service user and opens it', async () => {
    mutate.mockImplementation((_: unknown, opts: { onSuccess: (r: { serviceUserId: string }) => void }) =>
      opts.onSuccess({ serviceUserId: 'su-new' }),
    )
    render(<EnquiryInitialAssessment enquiry={{ ...base, convertedServiceUserId: null, initialAssessment: null }} canManage />)
    expect(screen.getByTestId('crm-enquiry-initial-assessment')).toHaveTextContent('Not started')
    await userEvent.click(screen.getByRole('button', { name: 'Start full initial assessment' }))
    expect(mutate).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({ to: '/service-users/initial-assessment', search: { serviceUserId: 'su-new' } })
  })

  it('shows the status and opens the linked service user without creating another', async () => {
    const enquiry = {
      ...base,
      convertedServiceUserId: 'su-1',
      initialAssessment: { id: 's1', status: 'IN_PROGRESS', updatedAt: '2026-10-30T10:00:00Z' },
    } as Enquiry
    render(<EnquiryInitialAssessment enquiry={enquiry} canManage />)
    expect(screen.getByTestId('crm-enquiry-initial-assessment')).toHaveTextContent('In progress')
    await userEvent.click(screen.getByRole('button', { name: 'Continue initial assessment' }))
    expect(mutate).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith({ to: '/service-users/initial-assessment', search: { serviceUserId: 'su-1' } })
  })
})
