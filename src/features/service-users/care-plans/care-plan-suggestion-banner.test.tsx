import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CarePlanFieldSuggestionBanner } from '@/features/service-users/care-plans/components/CarePlanFieldSuggestionBanner'
import { CarePlanReviewRow } from '@/features/service-users/care-plans/components/CarePlanReviewRow'
import { CarePlanSectionHeader } from '@/features/service-users/care-plans/components/CarePlanSectionHeader'
import { IARecommendationCard } from '@/features/service-users/care-plans/components/IARecommendationCard'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import { TooltipProvider } from '@/shared/ui/tooltip'

const contextSuggestion: CarePlanFieldSuggestion = {
  id: 'falls:count:ctx',
  kind: 'context',
  targetFieldKey: 'hist:count',
  targetLabel: 'Falls in last 12 months',
  targetFieldType: 'NUMBER',
  suggestedValue: null,
  displayText: 'Initial Assessment confirms falls in the last 12 months, but the number of falls was not recorded.',
  sourceType: 'INITIAL_ASSESSMENT',
  submissionId: 'ia-1',
  sourceDate: '2026-08-19T07:36:44.000Z',
  sourceSection: 'Mobility, ADL and Practical Support',
  sourceQuestions: [],
  transform: 'context',
}

const valueSuggestion: CarePlanFieldSuggestion = {
  ...contextSuggestion,
  id: 'falls:count:val',
  kind: 'value',
  suggestedValue: '2',
  displayText: '2',
  transform: 'typed',
}

describe('IARecommendationCard / banner adapter', () => {
  it('renders context information without a Use suggestion action', () => {
    const onUse = vi.fn()
    render(
      <TooltipProvider>
        <CarePlanFieldSuggestionBanner
          suggestion={contextSuggestion}
          currentValue={undefined}
          onUse={onUse}
          onIgnore={() => undefined}
          onKeepCurrent={() => undefined}
        />
      </TooltipProvider>,
    )
    expect(screen.getByText(/IA Recommendation/i)).toBeInTheDocument()
    expect(screen.getByText(/number of falls was not recorded/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /use suggestion/i })).not.toBeInTheDocument()
    expect(onUse).not.toHaveBeenCalled()
  })

  it('shows Use suggestion, Dismiss, and source metadata', () => {
    render(
      <TooltipProvider>
        <IARecommendationCard
          suggestion={valueSuggestion}
          currentValue={undefined}
          onUse={() => undefined}
          onDismiss={() => undefined}
          onKeepCurrent={() => undefined}
        />
      </TooltipProvider>,
    )
    expect(screen.getByRole('button', { name: /use suggestion/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    expect(screen.getByText(/Initial Assessment/i)).toBeInTheDocument()
    expect(screen.getByText('Mobility, ADL and Practical Support')).toBeInTheDocument()
  })
})

describe('CarePlanReviewRow layout', () => {
  it('renders a 3-column review row and wires Use suggestion', async () => {
    const onUse = vi.fn()
    const onDismiss = vi.fn()
    render(
      <TooltipProvider>
        <CarePlanReviewRow
          label="Falls in last 12 months"
          required
          category="Falls history"
          helpText="Number of falls recorded in the last year"
          input={<input aria-label="Falls in last 12 months" defaultValue="" />}
          suggestion={valueSuggestion}
          currentValue={undefined}
          onUseSuggestion={onUse}
          onDismissSuggestion={onDismiss}
          onKeepCurrentSuggestion={onDismiss}
        />
      </TooltipProvider>,
    )

    expect(screen.getByTestId('care-plan-field-review-hist:count')).toBeInTheDocument()
    expect(screen.getByText('Falls in last 12 months')).toBeInTheDocument()
    expect(screen.getByText('Falls history')).toBeInTheDocument()
    expect(screen.getByText(/Number of falls recorded/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /use suggestion/i }))
    expect(onUse).toHaveBeenCalledWith(valueSuggestion)

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledWith(valueSuggestion)
  })

  it('shows a section-level recommendations badge', () => {
    render(
      <CarePlanSectionHeader title="Prevention plan" recommendationCount={3} />,
    )
    expect(screen.getByTestId('care-plan-section-ia-hint')).toHaveTextContent(
      /3 IA recommendations available/i,
    )
    expect(screen.getByText('Prevention plan')).toBeInTheDocument()
  })
})

describe('NoYesToggle unanswered state', () => {
  it('shows a neutral unanswered control when value is missing', () => {
    render(<NoYesToggle value={undefined} onChange={() => undefined} />)
    expect(screen.getByTestId('no-yes-toggle-unanswered')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /yes or no/i })).toHaveAttribute('data-state', 'unanswered')
  })

  it('displays No for false and Yes for true without treating missing as No', () => {
    const { rerender } = render(<NoYesToggle value={false} onChange={() => undefined} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByTestId('no-yes-toggle-unanswered')).not.toBeInTheDocument()
    rerender(<NoYesToggle value={true} onChange={() => undefined} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('does not persist a value until the user selects Yes or No', async () => {
    const onChange = vi.fn()
    render(<NoYesToggle value={undefined} onChange={onChange} />)
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'YES' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
