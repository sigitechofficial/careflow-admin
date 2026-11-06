import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PublicSurveyForm, SurveyDetail } from '@/features/surveys/types'

const { state, submit } = vi.hoisted(() => ({
  state: { form: undefined as unknown, survey: undefined as unknown },
  submit: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to: _to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a {...rest}>{children}</a>
  ),
  useParams: () => ({ token: 'tok' }),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  usePublicSurvey: () => ({ data: state.form, isLoading: false, isError: false, error: null }),
  useSubmitPublicSurvey: () => ({ mutateAsync: submit, isPending: false }),
  useSurvey: () => ({ data: state.survey, isLoading: false }),
}))
vi.mock('@/components/layout/AppToaster', () => ({ AppToaster: () => null }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import TakeSurveyPage from '@/features/surveys/pages/TakeSurveyPage'
import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'

const CLOSING = 'The right answers are in our staff handbook, page 4.\nIf you are worried about anything, speak to the Registered Manager.'

const form = (over: Partial<PublicSurveyForm> = {}): PublicSurveyForm => ({
  title: 'Speaking up',
  description: null,
  isAnonymous: true,
  allowAnonymousResponses: false,
  status: 'ACTIVE',
  opensAt: null,
  closesAt: null,
  alreadyCompleted: false,
  canSubmit: true,
  unavailableReason: null,
  linkKind: 'recipient',
  askRespondent: false,
  forName: null,
  questions: [
    { id: 'q1', questionText: 'Do you know how to raise a concern?', helpText: null, questionType: 'YES_NO', options: null, config: null, isRequired: true, sortOrder: 0 },
  ],
  ...over,
})

describe('closing-screen message', () => {
  beforeEach(() => {
    submit.mockReset()
    submit.mockResolvedValue({})
  })

  it('is shown under the thank-you after submitting, with its line breaks', async () => {
    // The form people answer never holds it (it may hold the answers to knowledge questions): it
    // comes back with the submit.
    state.form = form({ closingMessage: null })
    submit.mockResolvedValue({ id: 'r1', submittedAt: '2026-11-06T10:00:00.000Z', closingMessage: CLOSING })
    render(<TakeSurveyPage />)
    expect(screen.queryByTestId('survey-closing-message')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(await screen.findByRole('heading', { name: 'Response recorded' })).toBeInTheDocument()
    const message = screen.getByTestId('survey-closing-message')
    expect(message.textContent).toBe(CLOSING)
    expect(message).toHaveClass('whitespace-pre-line')
  })

  it('is shown again when someone opens a link they already answered', () => {
    state.form = form({ closingMessage: CLOSING, alreadyCompleted: true, canSubmit: false })
    render(<TakeSurveyPage />)
    expect(screen.getByText('You have already completed this survey. Thank you.')).toBeInTheDocument()
    expect(screen.getByTestId('survey-closing-message')).toHaveTextContent('staff handbook, page 4')
  })

  it('without one, only the thank-you shows', () => {
    state.form = form({ alreadyCompleted: true, canSubmit: false })
    render(<TakeSurveyPage />)
    expect(screen.queryByTestId('survey-closing-message')).not.toBeInTheDocument()
  })

  it('the preview shows what people see after submitting', () => {
    state.survey = {
      id: 's1',
      title: 'Speaking up',
      description: null,
      closingMessage: CLOSING,
      isAnonymous: true,
      allowAnonymousResponses: false,
      questions: form().questions,
    } as unknown as SurveyDetail
    render(<SurveyPreviewDialog surveyId="s1" open onOpenChange={() => undefined} />)
    expect(screen.getByTestId('preview-closing-message')).toHaveTextContent('After submitting, people see')
    expect(screen.getByTestId('preview-closing-message')).toHaveTextContent('staff handbook, page 4')
  })
})
