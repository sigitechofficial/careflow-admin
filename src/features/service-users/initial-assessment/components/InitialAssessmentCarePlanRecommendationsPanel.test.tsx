import type * as React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CarePlanRecommendation } from '@/features/service-users/initial-assessment/types'

const { decide, navigate } = vi.hoisted(() => ({ decide: vi.fn(), navigate: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/features/service-users/initial-assessment/api', () => ({
  decideInitialAssessmentCarePlanRecommendation: decide,
}))
vi.mock('@/features/service-users/care-plans/api', () => ({ createCarePlanDraftFromCompose: vi.fn() }))
// The reason box is a rich editor jsdom cannot drive; a plain textarea keeps the same props.
vi.mock('@/features/service-users/initial-assessment/components/InitialAssessmentTextarea', () => ({
  InitialAssessmentTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { InitialAssessmentCarePlanRecommendationsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanRecommendationsPanel'

const rec = (over: Partial<CarePlanRecommendation> & { id: string }): CarePlanRecommendation => ({
  carePlanArea: 'Falls',
  sectionNumber: 3,
  sectionTitle: 'Mobility',
  title: 'Falls',
  triggerCount: 1,
  triggers: [{ questionId: `q-${over.id}`, questionText: `Trigger ${over.id}` }],
  status: 'pending',
  carePathwayFormId: 'form-falls',
  carePathwayFormName: 'Falls',
  ...over,
})

function renderPanel(recommendations: CarePlanRecommendation[], layout: 'full' | 'lifecycle' = 'full') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <InitialAssessmentCarePlanRecommendationsPanel
        serviceUserId="su1"
        submissionId="s1"
        submissionStatus="REVIEWED"
        recommendations={recommendations}
        canDecide
        layout={layout}
      />
    </QueryClientProvider>,
  )
}

describe('InitialAssessmentCarePlanRecommendationsPanel — manager decisions', () => {
  beforeEach(() => {
    decide.mockReset()
    decide.mockResolvedValue(undefined)
  })

  it('defers a pending recommendation with a required reason', async () => {
    renderPanel([rec({ id: 'rule-1' })])
    await userEvent.click(screen.getByRole('button', { name: 'Defer' }))

    const confirm = screen.getAllByRole('button', { name: 'Defer' }).at(-1)!
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), 'Waiting for GP letter')
    await userEvent.click(confirm)

    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith('su1', 's1', 'rule-1', {
        decision: 'deferred',
        reason: 'Waiting for GP letter',
      }),
    )
  })

  it('shows a deferred recommendation with its reason and lets the manager accept or decline it later', async () => {
    renderPanel([rec({ id: 'rule-1', status: 'deferred', decisionReason: 'Waiting for GP letter' })])

    expect(screen.getByText('Deferred')).toBeInTheDocument()
    expect(screen.getByText('Deferred: Waiting for GP letter')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Defer' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Accept' }).at(-1)!)
    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith('su1', 's1', 'rule-1', { decision: 'accepted', reason: undefined }),
    )
  })

  it('shows pending, accepted, declined and deferred states', () => {
    renderPanel([
      rec({ id: 'a', title: 'Pending plan', carePathwayFormId: 'f1' }),
      rec({ id: 'b', title: 'Accepted plan', status: 'accepted', carePathwayFormId: 'f2' }),
      rec({ id: 'c', title: 'Declined plan', status: 'declined', declineReason: 'Family manage', carePathwayFormId: 'f3' }),
      rec({ id: 'd', title: 'Deferred plan', status: 'deferred', decisionReason: 'Need OT', carePathwayFormId: 'f4' }),
    ])
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Declined')).toBeInTheDocument()
    expect(screen.getByText('Deferred')).toBeInTheDocument()
    expect(screen.getByText('Decline reason: Family manage')).toBeInTheDocument()
    expect(screen.getByText('Deferred: Need OT')).toBeInTheDocument()
    // Decision buttons only on the pending and deferred cards.
    expect(screen.getAllByRole('button', { name: 'Decline' })).toHaveLength(2)
  })

  it('a grouped card decides every recommendation in the group, not only the first', async () => {
    renderPanel(
      [
        rec({ id: 'rule-falls', title: 'Falls' }),
        rec({ id: 'cp-3-environment', title: 'Environment', source: 'legacy' }),
      ],
      'lifecycle',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }))
    await userEvent.type(screen.getByRole('textbox'), 'Family provide this support')
    await userEvent.click(screen.getAllByRole('button', { name: 'Decline' }).at(-1)!)

    await waitFor(() => expect(decide).toHaveBeenCalledTimes(2))
    const body = { decision: 'declined', reason: 'Family provide this support' }
    expect(decide).toHaveBeenCalledWith('su1', 's1', 'rule-falls', body)
    expect(decide).toHaveBeenCalledWith('su1', 's1', 'cp-3-environment', body)
  })

  it('shows the linked care plan state and opens it', async () => {
    navigate.mockReset()
    renderPanel([
      rec({
        id: 'rule-1',
        status: 'accepted',
        carePlanInstanceId: 'inst-1',
        linkedCarePlan: { instanceId: 'inst-1', carePathwayFormId: 'form-falls', status: 'DRAFT', hasDraft: true },
      }),
      rec({
        id: 'rule-2',
        title: 'Medication',
        status: 'accepted',
        carePathwayFormId: 'form-med',
        linkedCarePlan: { instanceId: 'inst-2', carePathwayFormId: 'form-med', status: 'PUBLISHED', hasDraft: false },
      }),
    ])
    expect(screen.getByText('Care plan: Draft')).toBeInTheDocument()
    expect(screen.getByText('Care plan: Published')).toBeInTheDocument()
    const open = screen.getAllByRole('button', { name: 'Open Care Plan' })
    expect(open).toHaveLength(2)
    await userEvent.click(open[1])
    expect(navigate).toHaveBeenCalledWith({
      to: '/service-users/$serviceUserId/care-plan/forms/$formId',
      params: { serviceUserId: 'su1', formId: 'form-med' },
    })
  })

  it('flags a linked plan kept after an accepted recommendation was declined', () => {
    renderPanel([
      rec({
        id: 'rule-1',
        status: 'declined',
        declineReason: 'Accepted in error',
        linkedCarePlanReviewRequired: true,
        linkedCarePlan: { instanceId: 'inst-1', carePathwayFormId: 'form-falls', status: 'DRAFT', hasDraft: true },
      }),
    ])
    expect(screen.getByTestId('ia-care-plan-linked-plan')).toHaveTextContent(/kept after this decision changed/)
    expect(screen.getByRole('button', { name: 'Open Care Plan' })).toBeInTheDocument()
  })
})
