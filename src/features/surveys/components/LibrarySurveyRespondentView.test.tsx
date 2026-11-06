import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LibrarySurveyDetail, LibrarySurveyQuestion } from '@/features/surveys/api/survey-library.api'
import { ANSWER_WITHOUT_NAME_LABEL } from '@/features/surveys/types'
import {
  LibrarySurveyRespondentView,
  libraryAsRespondentForm,
} from '@/features/surveys/components/LibrarySurveyRespondentView'

const q = (over: Partial<LibrarySurveyQuestion>): LibrarySurveyQuestion => ({
  id: 'q',
  questionText: 'Q',
  helpText: null,
  questionType: 'YES_NO',
  options: null,
  config: null,
  isRequired: false,
  key: null,
  showIf: null,
  ...over,
})

// As the API's library detail sends it: show-if rules name the earlier question by its key (and its text).
const detail = (over: Partial<LibrarySurveyDetail> = {}): LibrarySurveyDetail =>
  ({
    id: 'lib-1',
    title: 'Your care and support',
    audience: 'SERVICE_USER',
    anonymous: false,
    allowAnonymousResponses: true,
    introduction: 'We want to hear from you.',
    privacyNotice: 'Your answers are kept safe.',
    closingMessage: null,
    sections: [
      {
        title: 'Your visits',
        evidence: [],
        introduction: 'About your visits.',
        questions: [
          q({ id: 'q1', key: 'q-late', questionText: 'Are your carers ever late?' }),
          q({
            id: 'q2',
            key: 'q-late-how',
            questionText: 'How late are they, usually?',
            questionType: 'TEXT',
            showIf: { questionKey: 'q-late', answers: ['Yes'], questionText: 'Are your carers ever late?' },
          }),
          q({ id: 'q3', key: 'q-contact', questionText: 'Would you like someone to contact you about your answers?' }),
          q({
            id: 'q4',
            key: 'q-contact-how',
            questionText: 'How should we contact you?',
            questionType: 'TEXT',
            showIf: { questionKey: 'q-contact', answers: ['Yes'], questionText: 'Would you like someone to contact you about your answers?' },
          }),
        ],
      },
    ],
    ...over,
  }) as unknown as LibrarySurveyDetail

describe('a ready-made survey as people see it', () => {
  it('maps show-if rules to the form (by key, and the id the API form sends) and marks contact-me', () => {
    const form = libraryAsRespondentForm(detail())
    const byId = new Map(form.questions.map(x => [x.id, x]))
    expect(byId.get('q1')).toMatchObject({ key: 'q-late', contactRequest: false })
    expect(byId.get('q2')!.showIf).toEqual({ questionKey: 'q-late', answers: ['Yes'], questionId: 'q1' })
    expect(byId.get('q3')).toMatchObject({ contactRequest: true })
    expect(form.sectionIntros).toEqual({ 'Your visits': 'About your visits.' })
    expect(form.askRespondent).toBe(true)
  })

  it('asks a show-if question only after the answer it depends on', async () => {
    render(<LibrarySurveyRespondentView survey={detail()} />)
    expect(screen.queryByText('How late are they, usually?')).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('radio', { name: 'Yes' })[0]!)
    expect(screen.getByText('How late are they, usually?')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('radio', { name: 'No' })[0]!)
    expect(screen.queryByText('How late are they, usually?')).not.toBeInTheDocument()
  })

  it('answering without a name leaves out contact-me and its follow-up, as the real form does', async () => {
    render(<LibrarySurveyRespondentView survey={detail()} />)
    expect(screen.getByText('Would you like someone to contact you about your answers?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: ANSWER_WITHOUT_NAME_LABEL }))
    expect(screen.queryByText('Would you like someone to contact you about your answers?')).not.toBeInTheDocument()
    expect(screen.queryByText('How should we contact you?')).not.toBeInTheDocument()
  })

  it('an anonymous ready-made survey never asks contact-me', () => {
    render(<LibrarySurveyRespondentView survey={detail({ anonymous: true, allowAnonymousResponses: false })} />)
    expect(screen.queryByText('Would you like someone to contact you about your answers?')).not.toBeInTheDocument()
    expect(screen.getByText('Are your carers ever late?')).toBeInTheDocument()
  })
})
