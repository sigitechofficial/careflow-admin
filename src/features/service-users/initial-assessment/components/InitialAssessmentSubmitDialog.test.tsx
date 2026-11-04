import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InitialAssessmentSubmitDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentSubmitDialog'
import type { InitialAssessmentFlaggedItem } from '@/features/service-users/initial-assessment/types'

const trigger = (over: Partial<InitialAssessmentFlaggedItem>): InitialAssessmentFlaggedItem => ({
  answerId: 'a1',
  questionId: 'q1',
  questionText: 'Falls in the last 12 months',
  notes: null,
  textValue: null,
  section: { id: 's5', title: 'Mobility', sectionNumber: 5, carePlanArea: 'Mobility' },
  ...over,
})

describe('InitialAssessmentSubmitDialog', () => {
  it('lists the care plan triggers under the count and links each to its tab', async () => {
    const onGoToTrigger = vi.fn()
    const triggers = [
      trigger({}),
      trigger({ answerId: 'a2', questionId: 'q2', questionText: 'Catheter in situ', section: undefined }),
    ]
    render(
      <InitialAssessmentSubmitDialog
        open
        onOpenChange={vi.fn()}
        blocks={[]}
        warnings={[]}
        canSubmit
        carePlanTriggerCount={3}
        carePlanTriggers={triggers}
        triggerTabLabel={(t) => (t.questionId === 'q1' ? 'Tab 9' : 'Tab 12')}
        onGoToTrigger={onGoToTrigger}
        onGoToSection={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText(/3 care plan triggers identified/)).toBeInTheDocument()
    const list = screen.getByTestId('ia-submit-care-plan-triggers')
    expect(within(list).getByText('Falls in the last 12 months')).toBeInTheDocument()
    expect(within(list).getByText('Mobility')).toBeInTheDocument()
    expect(within(list).getByText('Catheter in situ')).toBeInTheDocument()
    // The count is larger than the items the API returned.
    expect(within(list).getByText('+1 more')).toBeInTheDocument()

    await userEvent.click(within(list).getByRole('button', { name: 'Tab 12' }))
    expect(onGoToTrigger).toHaveBeenCalledWith(triggers[1])
  })

  it('shows only the count when no trigger details are given', () => {
    render(
      <InitialAssessmentSubmitDialog
        open
        onOpenChange={vi.fn()}
        blocks={[]}
        warnings={[]}
        canSubmit
        carePlanTriggerCount={2}
        onGoToSection={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText(/2 care plan triggers identified/)).toBeInTheDocument()
    expect(screen.queryByTestId('ia-submit-care-plan-triggers')).toBeNull()
  })
})
