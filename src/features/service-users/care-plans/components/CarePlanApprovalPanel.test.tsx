import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CarePlanApprovalPanel } from '@/features/service-users/care-plans/components/CarePlanApprovalPanel'
import { carePlanApprovalView } from '@/features/service-users/care-plans/care-plan-approval-state'
import type { CarePlanDraftApproval, CarePlanInstance } from '@/features/service-users/care-plans/types'

const pending: CarePlanDraftApproval = {
  status: 'PENDING_APPROVAL',
  contentHash: 'a'.repeat(64),
  submittedAt: '2026-11-03T09:00:00Z',
  submittedById: 'author-1',
}

function instance(over: Partial<CarePlanInstance> & { approval?: CarePlanDraftApproval | null }): CarePlanInstance {
  const { approval, ...rest } = over
  return {
    id: 'inst-1',
    serviceUserId: 'su1',
    carePathwayFormId: 'form-1',
    status: 'DRAFT',
    displayStatus: 'DRAFT',
    createdAt: '',
    updatedAt: '',
    draft: { values: { a: 'x' }, approval: approval ?? { status: 'DRAFT' } },
    ...rest,
  }
}

describe('carePlanApprovalView', () => {
  it('approval off and nothing in flight: plain Publish, no panel, editable', () => {
    const v = carePlanApprovalView(instance({}))
    expect(v).toMatchObject({ footerAction: 'publish', footerLabel: 'Publish Care Plan', showPanel: false, locked: false })
  })

  it('approval on: Submit for Approval, then locked while pending, then Publish Approved Plan', () => {
    expect(carePlanApprovalView(instance({ carePlanApprovalRequired: true }))).toMatchObject({
      footerLabel: 'Submit for Approval',
      showPanel: true,
    })
    expect(carePlanApprovalView(instance({ carePlanApprovalRequired: true, approval: pending }))).toMatchObject({
      locked: true,
    })
    expect(
      carePlanApprovalView(instance({ carePlanApprovalRequired: true, approval: { ...pending, status: 'APPROVED' } })),
    ).toMatchObject({ footerAction: 'publish_approved', footerLabel: 'Publish Approved Plan', locked: false })
  })

  it('detects edits made after approval', () => {
    const v = carePlanApprovalView(instance({ carePlanApprovalRequired: true, approval: { ...pending, status: 'APPROVED' } }))
    expect(v.hasUnsavedChanges({ a: 'x', empty: '' })).toBe(false)
    expect(v.hasUnsavedChanges({ a: 'changed' })).toBe(true)
  })
})

describe('CarePlanApprovalPanel', () => {
  const noop = () => {}

  it('a manager can approve a pending plan, and the live version stays mentioned', async () => {
    const onApprove = vi.fn()
    render(
      <CarePlanApprovalPanel approval={pending} publishedVersionNumber={3} canApprove actorId="manager-1" onApprove={onApprove} onRequestChanges={noop} />,
    )
    expect(screen.getByTestId('care-plan-approval-status')).toHaveTextContent('Pending approval')
    expect(screen.getByText(/Version 3 stays the live plan/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onApprove).toHaveBeenCalled()
  })

  it('requesting changes needs a reason', async () => {
    const onRequestChanges = vi.fn()
    render(<CarePlanApprovalPanel approval={pending} canApprove actorId="manager-1" onApprove={noop} onRequestChanges={onRequestChanges} />)
    await userEvent.click(screen.getByRole('button', { name: 'Request Changes' }))
    const confirm = screen.getAllByRole('button', { name: 'Request Changes' }).at(-1)!
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/What needs to change/), 'Add night routine')
    await userEvent.click(confirm)
    expect(onRequestChanges).toHaveBeenCalledWith('Add night routine')
  })

  it('no approve actions for the submitter or for users without the approval permission', () => {
    const { rerender } = render(
      <CarePlanApprovalPanel approval={pending} canApprove actorId="author-1" onApprove={noop} onRequestChanges={noop} />,
    )
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByText(/another manager must approve it/)).toBeInTheDocument()
    rerender(<CarePlanApprovalPanel approval={pending} canApprove={false} actorId="x" onApprove={noop} onRequestChanges={noop} />)
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  })

  it('shows the changes-requested reason on a returned draft', () => {
    render(
      <CarePlanApprovalPanel
        approval={{ status: 'DRAFT', reason: 'Add the night-time toileting plan' }}
        canApprove
        onApprove={noop}
        onRequestChanges={noop}
      />,
    )
    expect(screen.getByTestId('care-plan-changes-requested')).toHaveTextContent('Add the night-time toileting plan')
  })
})
