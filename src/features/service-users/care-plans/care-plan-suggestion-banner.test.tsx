import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CarePlanFieldSuggestionBanner } from '@/features/service-users/care-plans/components/CarePlanFieldSuggestionBanner'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'

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

describe('CarePlanFieldSuggestionBanner context', () => {
  it('renders context information without a Use action', () => {
    const onUse = vi.fn()
    render(
      <CarePlanFieldSuggestionBanner
        suggestion={contextSuggestion}
        currentValue={undefined}
        onUse={onUse}
        onIgnore={() => undefined}
        onKeepCurrent={() => undefined}
      />,
    )
    expect(screen.getByText(/Suggested information from Initial Assessment/i)).toBeInTheDocument()
    expect(screen.getByText(/number of falls was not recorded/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /use suggestion/i })).not.toBeInTheDocument()
    expect(onUse).not.toHaveBeenCalled()
  })

  it('keeps Use and Ignore for actionable value suggestions', () => {
    render(
      <CarePlanFieldSuggestionBanner
        suggestion={valueSuggestion}
        currentValue={undefined}
        onUse={() => undefined}
        onIgnore={() => undefined}
        onKeepCurrent={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: /use suggestion/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ignore/i })).toBeInTheDocument()
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
