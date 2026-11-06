import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PublicSurveyForm, PublicSurveyQuestion, SurveyDetail } from '@/features/surveys/types'

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
import { ANSWER_WITHOUT_NAME_LABEL, ANSWER_WITHOUT_NAME_NOTE } from '@/features/surveys/types'
import { questionsAsked } from '@/features/surveys/survey-logic'

const q = (over: Partial<PublicSurveyQuestion>): PublicSurveyQuestion => ({
  id: 'q',
  questionText: 'Q',
  helpText: null,
  questionType: 'YES_NO',
  options: null,
  config: null,
  isRequired: false,
  sortOrder: 0,
  ...over,
})

const questions: PublicSurveyQuestion[] = [
  q({ id: 'q1', key: 'q-safe', questionText: 'Do you feel safe?', isRequired: true }),
  q({ id: 'q2', key: 'q-better', questionText: 'What could we do better?', questionType: 'TEXTAREA', sortOrder: 1 }),
  q({
    id: 'q3',
    key: 'q-contact',
    questionText: 'Would you like someone to contact you about your answers?',
    isRequired: true,
    sortOrder: 2,
    contactRequest: true,
  }),
  q({
    id: 'q4',
    key: 'q-how',
    questionText: 'How should we contact you?',
    questionType: 'TEXT',
    sortOrder: 3,
    showIf: { questionKey: 'q-contact', answers: ['Yes'] },
  }),
]

const form = (over: Partial<PublicSurveyForm> = {}): PublicSurveyForm => ({
  title: 'Your care and support',
  description: null,
  isAnonymous: false,
  allowAnonymousResponses: true,
  status: 'ACTIVE',
  opensAt: null,
  closesAt: null,
  alreadyCompleted: false,
  canSubmit: true,
  unavailableReason: null,
  linkKind: 'recipient',
  askRespondent: true,
  forName: 'Mary Jones',
  questions,
  ...over,
})

const pressed = (name: string) => (screen.getByRole('radio', { name }) as HTMLInputElement).checked

describe('questionsAsked', () => {
  it('leaves out the contact-me question and anything asked only after it', () => {
    expect(questionsAsked(questions, false).map(x => x.id)).toEqual(['q1', 'q2', 'q3', 'q4'])
    expect(questionsAsked(questions, true).map(x => x.id)).toEqual(['q1', 'q2'])
  })
})

describe('answer form: answer without my name', () => {
  beforeEach(() => {
    state.form = form()
    submit.mockReset().mockResolvedValue({})
  })

  it('offers the choice, named by default', () => {
    render(<TakeSurveyPage />)
    expect(screen.getByTestId('survey-answer-without-name')).toBeInTheDocument()
    expect(pressed('Answer with my name')).toBe(true)
    expect(pressed(ANSWER_WITHOUT_NAME_LABEL)).toBe(false)
    expect(screen.getByText('Would you like someone to contact you about your answers?')).toBeInTheDocument()
    // Their survey still turns Completed: they are told staff can see that, never which answers are theirs.
    expect(screen.getByTestId('survey-answer-without-name-note')).toHaveTextContent(
      'Staff can see that you have answered, but not which answers are yours.',
    )
    expect(ANSWER_WITHOUT_NAME_NOTE).toBe('Staff can see that you have answered, but not which answers are yours.')
  })

  it('hides the contact-me question and who is answering, and sends only the choice', async () => {
    render(<TakeSurveyPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'I am a family member answering for them' }))
    expect(screen.getByText('Your name (optional)')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('radio', { name: 'Yes' })[1]!)
    await userEvent.click(screen.getByRole('radio', { name: ANSWER_WITHOUT_NAME_LABEL }))

    expect(screen.queryByText('Would you like someone to contact you about your answers?')).not.toBeInTheDocument()
    expect(screen.queryByText('How should we contact you?')).not.toBeInTheDocument()
    expect(screen.queryByText('Your name (optional)')).not.toBeInTheDocument()
    // Who is answering is neither asked nor sent (it would narrow down who it was).
    expect(screen.queryByRole('radio', { name: 'I am a family member answering for them' })).not.toBeInTheDocument()
    expect(screen.getByText('Answering without your name')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit response' }))
    await waitFor(() => expect(submit).toHaveBeenCalled())
    expect(submit.mock.calls[0][0]).toEqual({
      answers: [{ questionId: 'q1', booleanValue: true }],
      answerWithoutName: true,
    })
  })

  it('a named answer still asks the contact-me question and sends no flag', async () => {
    render(<TakeSurveyPage />)
    await userEvent.click(screen.getByRole('radio', { name: 'I am the service user' }))
    const yes = screen.getAllByRole('radio', { name: 'Yes' })
    await userEvent.click(yes[0]!)
    await userEvent.click(yes[1]!)
    await userEvent.click(screen.getByRole('button', { name: 'Submit response' }))
    await waitFor(() => expect(submit).toHaveBeenCalled())
    expect(submit.mock.calls[0][0]).not.toHaveProperty('answerWithoutName')
    expect(submit.mock.calls[0][0].answers.map((a: { questionId: string }) => a.questionId)).toEqual(['q1', 'q3'])
  })

  it('is not offered on anonymous surveys or surveys without the setting', () => {
    state.form = form({ isAnonymous: true })
    const { unmount } = render(<TakeSurveyPage />)
    expect(screen.queryByTestId('survey-answer-without-name')).not.toBeInTheDocument()
    unmount()
    state.form = form({ allowAnonymousResponses: false })
    render(<TakeSurveyPage />)
    expect(screen.queryByTestId('survey-answer-without-name')).not.toBeInTheDocument()
  })

  it('the preview shows the same choice', async () => {
    state.survey = {
      id: 's1',
      title: 'Your care and support',
      description: null,
      isAnonymous: false,
      allowAnonymousResponses: true,
      questions,
    } as unknown as SurveyDetail
    render(<SurveyPreviewDialog surveyId="s1" open onOpenChange={() => {}} />)
    expect(screen.getByText('Would you like someone to contact you about your answers?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: ANSWER_WITHOUT_NAME_LABEL }))
    expect(screen.queryByText('Would you like someone to contact you about your answers?')).not.toBeInTheDocument()
  })

  describe('an older anonymous survey that still asks contact-me', () => {
    it('the answer form never shows it or its follow-up, and sends nothing for them', async () => {
      state.form = form({ isAnonymous: true, allowAnonymousResponses: false, askRespondent: false })
      render(<TakeSurveyPage />)
      expect(screen.queryByText('Would you like someone to contact you about your answers?')).not.toBeInTheDocument()
      expect(screen.queryByText('How should we contact you?')).not.toBeInTheDocument()
      expect(screen.getByText('Do you feel safe?')).toBeInTheDocument()
    })

    it('the preview leaves them out too', () => {
      state.survey = {
        id: 's1',
        title: 'Staff pulse',
        description: null,
        isAnonymous: true,
        allowAnonymousResponses: false,
        questions,
      } as unknown as SurveyDetail
      render(<SurveyPreviewDialog surveyId="s1" open onOpenChange={() => {}} />)
      expect(screen.queryByText('Would you like someone to contact you about your answers?')).not.toBeInTheDocument()
      expect(screen.queryByText('How should we contact you?')).not.toBeInTheDocument()
    })
  })
})
