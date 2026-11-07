import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyDetail, SurveyQuestion } from '@/features/surveys/types'

const { state, submitPublic } = vi.hoisted(() => ({
  state: { survey: undefined as unknown, isLoading: false, isError: false },
  submitPublic: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a href={to} data-to={to} {...rest}>
      {children}
    </a>
  ),
  useParams: () => ({ surveyId: 's1' }),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurvey: () => ({ data: state.survey, isLoading: state.isLoading, isError: state.isError }),
  useSubmitPublicSurvey: () => ({ mutateAsync: submitPublic, isPending: false }),
}))

vi.mock('@/features/surveys/translations/survey-translations.api', () => ({
  usePreviewTranslations: () => ({ languages: [], translations: {} }),
}))

import SurveyPreviewPage from '@/features/surveys/pages/SurveyPreviewPage'

function question(overrides: Partial<SurveyQuestion>): SurveyQuestion {
  return {
    id: 'q',
    questionText: 'Question',
    helpText: null,
    questionType: 'YES_NO',
    options: null,
    config: null,
    isRequired: true,
    sortOrder: 0,
    ...overrides,
  }
}

function survey(overrides: Partial<SurveyDetail> = {}): SurveyDetail {
  return {
    id: 's1',
    title: 'Your care and support',
    description: 'Please tell us what you think.',
    targetKind: 'SERVICE_USER',
    status: 'ACTIVE',
    isAnonymous: false,
    allowAnonymousResponses: true,
    opensAt: null,
    closesAt: null,
    publishedAt: null,
    distributeAt: null,
    distributedAt: null,
    recurrence: null,
    clonedFromId: null,
    clonedFromTitle: null,
    periodKey: null,
    periodOpenDays: null,
    recurrenceAnchorAt: null,
    distributionFailedAt: null,
    distributionError: null,
    locationIds: [],
    roleIds: [],
    audienceEmployeeIds: [],
    isTemplate: false,
    shareToken: null,
    createdById: null,
    createdByName: null,
    scheduledByName: null,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    recipientCount: 0,
    responseCount: 0,
    periodCount: 0,
    questionsLocked: false,
    settingsLocked: false,
    questions: [
      question({ id: 'q1', questionText: 'Are you happy with your care?', sortOrder: 0 }),
      question({
        id: 'q2',
        questionText: 'Would you like someone to contact you about your answers?',
        isRequired: false,
        sortOrder: 1,
        contactRequest: true,
      }),
    ],
    ...overrides,
  }
}

describe('SurveyPreviewPage', () => {
  beforeEach(() => {
    state.survey = survey()
    state.isLoading = false
    state.isError = false
    submitPublic.mockReset()
  })

  it('shows the page people answer on, with who sees it and that nothing is saved', () => {
    render(<SurveyPreviewPage />)
    expect(screen.getByRole('heading', { name: /Preview: what people see/ })).toBeInTheDocument()
    expect(screen.getByText(/People we support see this in their portal/)).toBeInTheDocument()
    expect(screen.getByText('Try answering. Nothing you enter here is saved.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your care and support' })).toBeInTheDocument()
    expect(screen.getByText('Please tell us what you think.')).toBeInTheDocument()
    // Service-user surveys ask who is answering, as the real page does.
    expect(screen.getByText(/Who is answering this survey\?/)).toBeInTheDocument()
    expect(screen.getByTestId('survey-answer-without-name')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the survey' })).toHaveAttribute('data-to', '/surveys/$surveyId')
  })

  it('submitting shows the thank-you screen and saves nothing; Start again clears the answers', async () => {
    const user = userEvent.setup()
    render(<SurveyPreviewPage />)
    const submit = screen.getByRole('button', { name: 'Submit response' })
    await user.click(screen.getByRole('radio', { name: 'I am the service user' }))
    await user.click(screen.getAllByRole('radio', { name: 'Yes' })[0]!)
    await user.click(submit)
    expect(screen.getByText('Response recorded')).toBeInTheDocument()
    expect(screen.getByText(/In this preview nothing was saved/)).toBeInTheDocument()
    expect(submitPublic).not.toHaveBeenCalled()

    await user.click(screen.getAllByRole('button', { name: 'Start again' }).at(-1)!)
    expect(screen.getByText('Answered 0 of 2')).toBeInTheDocument()
    expect(screen.queryByTestId('survey-error-summary')).not.toBeInTheDocument()
  })

  it('submitting too early lists the problems, moves focus to them and links each to its answers', async () => {
    const user = userEvent.setup()
    render(<SurveyPreviewPage />)
    // Never a disabled button with no explanation: it can always be pressed.
    const submit = screen.getByRole('button', { name: 'Submit response' })
    expect(submit).toBeEnabled()
    await user.click(submit)
    const summary = screen.getByRole('alert')
    expect(summary).toHaveFocus()
    expect(within(summary).getByRole('heading', { name: 'There is a problem' })).toBeInTheDocument()
    const links = within(summary).getAllByRole('link')
    expect(links.map(l => l.textContent)).toEqual([
      'Choose who is answering this survey',
      expect.stringMatching(/^Answer this question: question 1, /),
    ])
    expect(screen.queryByText('Response recorded')).not.toBeInTheDocument()

    // Each question in error says so, and its answers are marked invalid and described by the error.
    const group = screen.getByRole('group', { name: /^Who is answering this survey\?/ })
    expect(group).toHaveAccessibleDescription(/Choose who is answering this survey/)
    await user.click(links[1]!)
    const firstYes = screen.getAllByRole('radio', { name: 'Yes' })[0]!
    expect(firstYes).toHaveFocus()
    expect(firstYes).toHaveAttribute('aria-invalid', 'true')

    // Put right, the problems go away as they are fixed.
    await user.click(firstYes)
    await user.click(screen.getByRole('radio', { name: 'I am the service user' }))
    expect(screen.queryByTestId('survey-error-summary')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('survey-field-error')).toHaveLength(0)
  })

  it('answering without a name hides the contact-me question and who is answering, as for real', async () => {
    const user = userEvent.setup()
    render(<SurveyPreviewPage />)
    expect(screen.getByText(/Would you like someone to contact you/)).toBeInTheDocument()
    const choice = screen.getByTestId('survey-answer-without-name')
    await user.click(choice.querySelectorAll('input[type=radio]')[1]!)
    expect(screen.queryByText(/Would you like someone to contact you/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Who is answering this survey\?/)).not.toBeInTheDocument()
  })

  it('describes a staff survey and a public survey by how those people open it', () => {
    state.survey = survey({ targetKind: 'EMPLOYEE', allowAnonymousResponses: false })
    const { unmount } = render(<SurveyPreviewPage />)
    expect(screen.getByText(/Staff see this when they open the personal link/)).toBeInTheDocument()
    expect(screen.queryByText(/Who is answering this survey\?/)).not.toBeInTheDocument()
    unmount()

    state.survey = survey({ targetKind: 'PUBLIC', isAnonymous: true, allowAnonymousResponses: false })
    render(<SurveyPreviewPage />)
    expect(screen.getByText(/Anyone who opens the shareable link sees this page/)).toBeInTheDocument()
    expect(screen.getByText('Anonymous responses')).toBeInTheDocument()
  })

  it('says so when there are no questions yet or the survey cannot be loaded', () => {
    state.survey = survey({ questions: [] })
    const { unmount } = render(<SurveyPreviewPage />)
    expect(screen.getByText(/This survey has no questions yet/)).toBeInTheDocument()
    unmount()

    state.survey = undefined
    state.isError = true
    render(<SurveyPreviewPage />)
    expect(screen.getByText(/This survey could not be loaded/)).toBeInTheDocument()
  })
})
