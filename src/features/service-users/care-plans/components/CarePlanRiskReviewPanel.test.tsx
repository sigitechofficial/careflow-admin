import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CarePlanRiskReviewPanel } from '@/features/service-users/care-plans/components/CarePlanRiskReviewPanel'
import type { CarePlanRisks, CarePlanRiskSummary } from '@/features/service-users/care-plans/types'

const risk = (over: Partial<CarePlanRiskSummary>): CarePlanRiskSummary => ({
  id: 'r1',
  submissionId: 'ia-1',
  riskType: 'FALLS',
  description: 'Two falls this year',
  riskLevel: 'HIGH',
  severity: 'HIGH',
  controlMeasures: 'Walking frame',
  status: 'OPEN',
  supersedeReviewRequired: false,
  supersededBySubmissionId: null,
  ...over,
})

const data: CarePlanRisks = {
  instanceId: 'inst-1',
  links: [
    {
      id: 'l1',
      status: 'REVIEW_REQUIRED',
      reviewReason: 'The risk record changed (level, severity, controls or status).',
      linkedAt: '2026-11-01T09:00:00Z',
      reviewedAt: null,
      snapshot: {},
      risk: risk({ supersedeReviewRequired: true }),
    },
  ],
  availableRisks: [risk({ id: 'r2', riskType: 'FIRE', riskLevel: 'MEDIUM', description: 'No smoke alarm' })],
  reassessmentFlags: [
    {
      id: 'f1',
      status: 'OPEN',
      changeTypes: ['CHANGED_NEED', 'NEW_RISK'],
      reason: 'Reassessment: the assessment answers behind this care plan have changed. Review Falls.',
      triggeringSubmissionId: 'ia-2',
      createdAt: '2026-11-02T09:00:00Z',
      resolvedAt: null,
      resolutionNote: null,
    },
    {
      id: 'f0',
      status: 'RESOLVED',
      changeTypes: ['GENERAL'],
      reason: 'Old',
      triggeringSubmissionId: 'ia-1',
      createdAt: '2026-06-02T09:00:00Z',
      resolvedAt: '2026-06-03T09:00:00Z',
      resolutionNote: 'done',
    },
  ],
}

describe('CarePlanRiskReviewPanel', () => {
  it('shows the open review flag (published plan stays in use), linked risks and their review state', () => {
    render(<CarePlanRiskReviewPanel data={data} canManage onAction={vi.fn()} />)
    expect(screen.getByTestId('care-plan-review-required')).toHaveTextContent('Changed need · New or higher risk')
    expect(screen.getByText(/published plan stays in use/)).toBeInTheDocument()
    expect(screen.queryByText('Old')).toBeNull()
    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getByText(/newer assessment recorded this risk again/)).toBeInTheDocument()
  })

  it('a manager resolves the flag with a note, reviews and links risks', async () => {
    const onAction = vi.fn()
    render(<CarePlanRiskReviewPanel data={data} canManage onAction={onAction} />)

    await userEvent.click(screen.getAllByRole('button', { name: 'Mark Reviewed' })[0])
    const confirm = screen.getAllByRole('button', { name: 'Mark Reviewed' }).at(-1)!
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/What did you review/), 'Falls plan updated and published')
    await userEvent.click(confirm)
    expect(onAction).toHaveBeenCalledWith({ action: 'resolve_flag', flagId: 'f1', note: 'Falls plan updated and published' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Mark Reviewed' })[1])
    expect(onAction).toHaveBeenCalledWith({ action: 'review', linkId: 'l1' })

    await userEvent.selectOptions(screen.getByLabelText('Link an assessment risk'), 'r2')
    await userEvent.click(screen.getByRole('button', { name: 'Link Risk' }))
    expect(onAction).toHaveBeenCalledWith({ action: 'link', riskRecordId: 'r2' })
  })

  it('read-only without the manager permission', () => {
    render(<CarePlanRiskReviewPanel data={data} canManage={false} onAction={vi.fn()} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByTestId('care-plan-review-required')).toBeInTheDocument()
  })
})
