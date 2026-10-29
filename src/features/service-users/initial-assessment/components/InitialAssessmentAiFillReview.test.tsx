import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InitialAssessmentAiFillReview } from '@/features/service-users/initial-assessment/components/InitialAssessmentAiFillReview'
import type {
  InitialAssessmentAiFillSuggestion,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise', () => ({
  useSuggestInitialAssessmentAnswers: () => ({ mutate: mocks.mutate, isPending: false }),
}))
vi.mock('@/features/service-users/hooks/useServiceUserLookups', () => ({
  useServiceUserLookups: () => ({ data: undefined }),
}))
vi.mock('@/features/service-users/body-map/hooks/useBodyMapLookups', () => ({
  useBodyMapLookups: () => ({ data: undefined }),
}))

const question = (id: string, questionText: string, extra: Partial<InitialAssessmentQuestion> = {}): InitialAssessmentQuestion => ({
  id,
  questionText,
  questionType: 'TEXT',
  isRequired: false,
  riskFlag: false,
  carePlanTrigger: false,
  sortOrder: 0,
  ...extra,
})

const suggestion = (questionId: string, questionText: string, display: string): InitialAssessmentAiFillSuggestion => ({
  questionId,
  questionText,
  questionType: 'TEXT',
  answer: { questionId, textValue: display },
  display,
  evidence: `my ${questionText.toLowerCase()} is ${display}`,
})

afterEach(() => vi.clearAllMocks())

describe('InitialAssessmentAiFillReview', () => {
  it('sends the tab questions (not secure ones), then applies only the ticked answers', async () => {
    const onApply = vi.fn()
    const questions = [
      question('q-first', 'First name'),
      question('q-last', 'Last name'),
      question('q-key', 'Key safe code', { metadata: { secureField: true } }),
    ]
    mocks.mutate.mockImplementation((_body, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess({
        suggestions: [suggestion('q-first', 'First name', 'Fatima'), suggestion('q-last', 'Last name', 'Al-Rashid')],
        questionCount: 2,
        usage: { model: 'claude-haiku-5-5', inputTokens: 12000, outputTokens: 3000, costUsd: 0.0027 },
        totals: { requests: 3, inputTokens: 30000, outputTokens: 9000, costUsd: 0.0075, since: '2026-10-29T09:00:00.000Z' },
      }),
    )

    render(
      <InitialAssessmentAiFillReview
        serviceUserId="su"
        submissionId="sub"
        transcript="My first name is Fatima. My last name is Al-Rashid."
        target={{
          tabTitle: 'Personal Details',
          questions,
          answers: { 'q-last': { questionId: 'q-last', textValue: 'Smith' } },
          editable: true,
          onApply,
        }}
      />,
    )

    await userEvent.click(screen.getByTestId('ia-ai-fill'))

    const body = mocks.mutate.mock.calls[0]![0] as { questions: { id: string }[] }
    expect(body.questions.map((q) => q.id)).toEqual(['q-first', 'q-last'])

    const usage = screen.getByTestId('ia-ai-usage')
    expect(usage).toHaveTextContent('This fill: Claude Haiku 5.5 · 12,000 in + 3,000 out tokens ≈ $0.0027')
    expect(usage).toHaveTextContent('Since the API started: 3 fills · 39,000 tokens ≈ $0.0075')

    // The already-answered field starts unticked and is flagged.
    expect(screen.getByText('Already answered: ticking this replaces the current answer')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Apply 1 to form/ }))

    expect(onApply).toHaveBeenCalledWith([{ questionId: 'q-first', textValue: 'Fatima' }])

    // After applying, the filled fields stay listed by name with their value.
    const filled = screen.getByTestId('ia-ai-filled-list')
    expect(filled).toHaveTextContent('1 field filled from the transcript on “Personal Details”')
    expect(filled).toHaveTextContent('First name')
    expect(filled).toHaveTextContent('Fatima')
    expect(filled).not.toHaveTextContent('Last name')
  })

  it('does not offer filling on a read-only assessment', () => {
    render(
      <InitialAssessmentAiFillReview
        serviceUserId="su"
        submissionId="sub"
        transcript="text"
        target={{ tabTitle: 'Tab', questions: [], answers: {}, editable: false, onApply: vi.fn() }}
      />,
    )
    expect(screen.queryByTestId('ia-ai-fill')).not.toBeInTheDocument()
  })
})
