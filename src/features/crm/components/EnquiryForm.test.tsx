import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: toastError }))
vi.mock('@/features/crm/hooks/useCrm', () => ({
  useEnquiryOwners: () => ({ data: [], isError: false, isLoading: false }),
  useEnquiryFundingTypes: () => ({ data: [], isError: false, isLoading: false }),
  useEnquiryCarePlans: () => ({ data: [], isError: false, isLoading: false }),
  useEnquiryDuplicates: () => ({ data: undefined }),
}))
vi.mock('@/features/crm/hooks/useBranchOptions', () => ({
  useBranchOptions: () => ({ options: [{ id: 'loc-1', label: 'Croydon 1' }], restricted: false, isLoading: false }),
}))

import { EnquiryForm } from '@/features/crm/components/EnquiryForm'

describe('EnquiryForm — enquiry or referral', () => {
  it('records a referral with its organisation, reference and referrer role', async () => {
    const onSubmit = vi.fn()
    render(<EnquiryForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    // An enquiry by default: no referral section, "Received from" with a relationship.
    expect(screen.getByRole('radio', { name: 'Enquiry' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('Referral details')).toBeNull()
    expect(screen.getByText('Received from')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Referral' }))
    expect(screen.getByText('Referral details')).toBeInTheDocument()
    expect(screen.getByText('Referrer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create referral' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/First name/), 'Arbab')
    await userEvent.type(screen.getByLabelText(/Last name/), 'Hassan')
    // The organisation is required for a referral.
    await userEvent.click(screen.getByRole('button', { name: 'Create referral' }))
    expect(toastError).toHaveBeenCalledWith(null, 'Enter the referring organisation')
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(/Referring organisation/), 'Croydon Council Adult Social Care')
    await userEvent.type(screen.getByLabelText(/Referral reference/), 'ASC-881')
    await userEvent.type(screen.getByLabelText(/^Role/), 'Social worker')
    // The hours per week are required too: they cap the quote's visits.
    await userEvent.click(screen.getByRole('button', { name: 'Create referral' }))
    expect(toastError).toHaveBeenCalledWith(null, 'Enter the hours per week')
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(/Hours per week/), '14')
    await userEvent.click(screen.getByRole('button', { name: 'Create referral' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'REFERRAL',
        hoursPerWeek: 14,
        referringOrganisation: 'Croydon Council Adult Social Care',
        referralReference: 'ASC-881',
        referrerRole: 'Social worker',
        // A family source is switched to the council when the type becomes a referral.
        source: 'LOCAL_AUTHORITY',
      }),
    )
    // Types a lot of text; slow when the whole suite runs in parallel.
  }, 20_000)
})
