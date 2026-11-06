import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyDetail, SurveyResponseItem, SurveyResponsesPayload } from '@/features/surveys/types'
import { surveyRespondentRelationLabel } from '@/features/surveys/types'
import { describeSurveyRespondent } from '@/features/surveys/survey-respondent'

const { state } = vi.hoisted(() => ({
  state: {
    responses: undefined as SurveyResponsesPayload | undefined,
    survey: undefined as Partial<SurveyDetail> | undefined,
    /** Other surveys by id (a repeating survey's periods). */
    surveysById: {} as Record<string, Partial<SurveyDetail>>,
    /** A period's own responses list (its own held-back view); the viewed list otherwise. */
    responsesById: {} as Record<string, SurveyResponsesPayload>,
    /** Ids whose survey details / responses list fail to load. */
    surveyFails: new Set<string>(),
    responsesFail: new Set<string>(),
    /** Ids whose responses list is being (re)fetched — cached data, possibly out of date. */
    responsesFetching: new Set<string>(),
    refetchSurvey: vi.fn(),
    refetchResponses: vi.fn(),
    dialogProps: null as Record<string, unknown> | null,
  },
}))

vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurveyResponses: (id: string | undefined) =>
    id && state.responsesFail.has(id)
      ? { data: undefined, isLoading: false, isError: true, refetch: state.refetchResponses, isFetching: state.responsesFetching.has(id) }
      : {
          data: id && state.responsesById[id] ? state.responsesById[id] : state.responses,
          isLoading: false,
          isError: false,
          refetch: state.refetchResponses,
          isFetching: Boolean(id && state.responsesFetching.has(id)),
        },
  useSurvey: (id: string | undefined) =>
    id && state.surveyFails.has(id)
      ? { data: undefined, isError: true, isFetching: false, refetch: state.refetchSurvey }
      : {
          data: id && state.surveysById[id] ? state.surveysById[id] : id ? state.survey : undefined,
          isError: false,
          isFetching: false,
          refetch: state.refetchSurvey,
        },
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: () => boolean }) => unknown) => pick({ can: () => true }),
}))
vi.mock('@/features/surveys/components/RecordSurveyResponseDialog', () => ({
  RecordSurveyResponseDialog: (props: Record<string, unknown>) => {
    state.dialogProps = props
    return null
  },
}))

import { SurveyResponsesPanel } from '@/features/surveys/components/SurveyResponsesPanel'

const response = (over: Partial<SurveyResponseItem> = {}): SurveyResponseItem => ({
  id: 'r1',
  submittedAt: '2026-11-04T10:30:00.000Z',
  respondentLabel: 'Jo Bloggs',
  employeeId: 'e1',
  respondentRelation: 'SELF',
  channel: 'TELEPHONE',
  canEdit: true,
  answerCount: 1,
  answers: [
    {
      questionId: 'q1',
      questionText: 'Do you feel supported?',
      questionType: 'YES_NO',
      booleanValue: true,
      textValue: null,
      numberValue: null,
      selectedOptions: null,
      displayValue: 'Yes',
    },
  ],
  ...over,
})

describe('SurveyResponsesPanel', () => {
  beforeEach(() => {
    state.survey = { id: 's1', targetKind: 'EMPLOYEE', status: 'ACTIVE', isTemplate: false, questions: [], periodCount: 0 }
    state.responses = { isAnonymous: false, total: 1, responses: [response()] }
    state.surveysById = {}
    state.responsesById = {}
    state.surveyFails = new Set()
    state.responsesFail = new Set()
    state.responsesFetching = new Set()
    state.refetchSurvey = vi.fn()
    state.refetchResponses = vi.fn()
    state.dialogProps = null
  })

  describe('"All periods": editing a period’s response', () => {
    const periodQuestions = [{ id: 'pq1', questionText: 'Anything else?', questionType: 'TEXTAREA' }]
    const writtenAnswer = (over: Record<string, unknown> = {}) => ({
      questionId: 'pq1',
      questionText: 'Anything else?',
      questionType: 'TEXTAREA' as const,
      booleanValue: null,
      textValue: 'More staff at weekends',
      numberValue: null,
      selectedOptions: null,
      withheldFields: [] as Array<'textValue' | 'otherText' | 'comment'>,
      displayValue: 'More staff at weekends',
      ...over,
    })
    beforeEach(() => {
      state.survey = { id: 's1', targetKind: 'EMPLOYEE', status: 'ACTIVE', isTemplate: false, isAnonymous: true, questions: [], periodCount: 2, recurrence: 'MONTHLY' }
      state.surveysById = {
        p1: { id: 'p1', targetKind: 'EMPLOYEE', status: 'CLOSED', isTemplate: false, isAnonymous: true, clonedFromId: 's1', questions: periodQuestions } as Partial<SurveyDetail>,
      }
      // "All periods" pools the closed periods, so the written answer is shown there…
      state.responses = {
        isAnonymous: true,
        total: 6,
        responses: [response({ surveyId: 'p1', periodTitle: 'October 2026', channel: 'PAPER', respondentLabel: 'Anonymous respondent #1', answers: [writtenAnswer()] })],
      }
      // …while on its own the period (fewer than 5 answers) still holds it back — the rule a save applies.
      state.responsesById = {
        p1: {
          isAnonymous: true,
          total: 2,
          responses: [
            response({
              surveyId: 'p1',
              periodTitle: 'October 2026',
              channel: 'PAPER',
              respondentLabel: 'Anonymous respondent #1',
              writtenAnswersWithheld: true,
              answers: [
                writtenAnswer({ textValue: null, withheldFields: ['textValue'], displayValue: 'Written answer — shown once the survey has closed' }),
              ],
            }),
          ],
        },
      }
    })

    it('opens on the period’s own held-back view, so what staff see is what saving does', async () => {
      render(<SurveyResponsesPanel surveyId="s1" />)
      await userEvent.click(screen.getByTestId('survey-response-edit'))
      expect(state.dialogProps).toMatchObject({ surveyId: 'p1', listedOnSurveyId: 's1', open: true })
      const editing = state.dialogProps!.editing as SurveyResponseItem
      // The held text is never handed to the form (it is kept by the server unless replaced)…
      expect(editing.answers[0]).toMatchObject({ textValue: null, withheldFields: ['textValue'] })
      expect(JSON.stringify(editing)).not.toContain('More staff at weekends')
      // …and staff are told why it differs from the list they opened it from.
      expect(state.dialogProps!.editingNote).toMatch(/corrected on its period \(October 2026\).*held back/)
    })

    it('no note when the period shows the same as "All periods"', async () => {
      state.responsesById = {}
      render(<SurveyResponsesPanel surveyId="s1" />)
      await userEvent.click(screen.getByTestId('survey-response-edit'))
      expect(state.dialogProps).toMatchObject({ surveyId: 'p1', open: true, editingNote: null })
    })

    it('the period’s details fail to load: says so and offers Try again, which then opens the edit', async () => {
      state.surveyFails = new Set(['p1'])
      state.refetchSurvey = vi.fn(() => {
        state.surveyFails = new Set()
      })
      const view = render(<SurveyResponsesPanel surveyId="s1" />)
      await userEvent.click(screen.getByTestId('survey-response-edit'))
      expect(screen.getByTestId('period-edit-error')).toHaveTextContent(/could not be loaded/)
      expect(state.dialogProps?.open ?? false).toBe(false)
      await userEvent.click(screen.getByTestId('period-edit-retry'))
      expect(state.refetchSurvey).toHaveBeenCalled()
      view.rerender(<SurveyResponsesPanel surveyId="s1" />)
      expect(screen.queryByTestId('period-edit-error')).not.toBeInTheDocument()
      expect(state.dialogProps).toMatchObject({ surveyId: 'p1', open: true })
    })

    it('the period’s responses fail to load: same error and retry (the edit never opens on the pooled view)', async () => {
      state.responsesFail = new Set(['p1'])
      render(<SurveyResponsesPanel surveyId="s1" />)
      await userEvent.click(screen.getByTestId('survey-response-edit'))
      expect(screen.getByTestId('period-edit-error')).toBeInTheDocument()
      expect(state.dialogProps?.open ?? false).toBe(false)
      await userEvent.click(screen.getByTestId('period-edit-retry'))
      expect(state.refetchResponses).toHaveBeenCalled()
    })

    it('while the period’s list is refreshing, waits for it — never opens on cached (possibly out-of-date) answers', async () => {
      state.responsesFetching = new Set(['p1'])
      const view = render(<SurveyResponsesPanel surveyId="s1" />)
      await userEvent.click(screen.getByTestId('survey-response-edit'))
      expect(screen.getByTestId('period-edit-loading')).toHaveAttribute('role', 'status')
      expect(state.dialogProps?.open ?? false).toBe(false)
      // The refresh brings the period's current answers: those are what the edit opens on.
      const fresh = state.responsesById.p1.responses[0]
      state.responsesById = {
        p1: { ...state.responsesById.p1, responses: [{ ...fresh, answerCount: 2, contactNotes: 'corrected' }] },
      }
      state.responsesFetching = new Set()
      view.rerender(<SurveyResponsesPanel surveyId="s1" />)
      expect(screen.queryByTestId('period-edit-loading')).not.toBeInTheDocument()
      expect(state.dialogProps).toMatchObject({ surveyId: 'p1', open: true })
      expect((state.dialogProps!.editing as SurveyResponseItem).contactNotes).toBe('corrected')
    })

    it('Try again keeps focus while retrying (not disabled) and does not fetch twice', async () => {
      state.responsesFail = new Set(['p1'])
      state.responsesFetching = new Set(['p1'])
      render(<SurveyResponsesPanel surveyId="s1" />)
      await userEvent.click(screen.getByTestId('survey-response-edit'))
      const retry = screen.getByTestId('period-edit-retry')
      expect(retry).not.toBeDisabled()
      expect(retry).toHaveAttribute('aria-disabled', 'true')
      expect(retry).toHaveTextContent('Trying again…')
      await userEvent.click(retry)
      expect(state.refetchResponses).not.toHaveBeenCalled()
    })

    it('Close dismisses the error without opening anything', async () => {
      state.surveyFails = new Set(['p1'])
      render(<SurveyResponsesPanel surveyId="s1" />)
      await userEvent.click(screen.getByTestId('survey-response-edit'))
      await userEvent.click(screen.getByTestId('period-edit-close'))
      expect(screen.queryByTestId('period-edit-error')).not.toBeInTheDocument()
    })
  })

  it('"All periods": a period’s response is edited on that period (its own id and questions)', async () => {
    const periodQuestions = [{ id: 'pq1', questionText: 'Do you feel supported?', questionType: 'YES_NO' }]
    state.survey = { id: 's1', targetKind: 'EMPLOYEE', status: 'ACTIVE', isTemplate: false, questions: [], periodCount: 2, recurrence: 'MONTHLY' }
    state.surveysById = {
      p1: { id: 'p1', targetKind: 'EMPLOYEE', status: 'ACTIVE', isTemplate: false, isAnonymous: false, clonedFromId: 's1', questions: periodQuestions } as Partial<SurveyDetail>,
    }
    state.responses = {
      isAnonymous: false,
      total: 1,
      responses: [response({ surveyId: 'p1', periodTitle: 'November 2026', answers: [{ ...response().answers[0], questionId: 'pq1' }] })],
    }
    render(<SurveyResponsesPanel surveyId="s1" />)
    await userEvent.click(screen.getByTestId('survey-response-edit'))
    expect(state.dialogProps).toMatchObject({ surveyId: 'p1', listedOnSurveyId: 's1', open: true, questions: periodQuestions })
  })

  it('a response on the survey being viewed is edited on it, as before', async () => {
    state.responses = { isAnonymous: false, total: 1, responses: [response({ surveyId: 's1' })] }
    render(<SurveyResponsesPanel surveyId="s1" />)
    await userEvent.click(screen.getByTestId('survey-response-edit'))
    expect(state.dialogProps).toMatchObject({ surveyId: 's1', open: true })
  })

  it('"Answered by" names the employee on a staff survey, not "the service user"', async () => {
    render(<SurveyResponsesPanel surveyId="s1" />)
    const row = screen.getByRole('row', { name: /Jo Bloggs/ })
    expect(within(row).getByText('The employee')).toBeInTheDocument()
    expect(screen.queryByText('The service user')).not.toBeInTheDocument()
    await userEvent.click(within(row).getByRole('button', { name: /View response/ }))
    expect(within(screen.getByRole('dialog')).getByText(/Answered by the employee/)).toBeInTheDocument()
  })

  it('service-user surveys still say "The service user"', () => {
    state.survey = { ...state.survey, targetKind: 'SERVICE_USER' }
    render(<SurveyResponsesPanel surveyId="s1" />)
    expect(screen.getByText('The service user')).toBeInTheDocument()
  })

  it('anonymous survey: View response says written answers are held back and shows none', async () => {
    state.survey = { ...state.survey, isAnonymous: true }
    state.responses = {
      isAnonymous: true,
      total: 1,
      writtenAnswersNote:
        'Written answers on an anonymous survey are shown once the survey has closed and at least 5 people have answered, so they cannot be traced to anyone.',
      responses: [
        response({
          respondentLabel: 'Anonymous respondent #1',
          respondentRelation: null,
          writtenAnswersWithheld: true,
          answers: [
            {
              questionId: 'q2',
              questionText: 'Anything else?',
              questionType: 'TEXTAREA',
              booleanValue: null,
              textValue: null,
              numberValue: null,
              selectedOptions: null,
              comment: null,
              withheldFields: ['textValue'],
              displayValue: 'Written answer — shown once the survey has closed',
            },
          ],
        }),
      ],
    }
    render(<SurveyResponsesPanel surveyId="s1" />)
    expect(screen.getByTestId('responses-written-withheld')).toHaveTextContent(/once the survey has closed/)
    await userEvent.click(screen.getByRole('button', { name: /View response/ }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByTestId('response-written-withheld')).toHaveTextContent(/at least 5 people have answered/)
    expect(dialog.getByText('Written answer — shown once the survey has closed')).toBeInTheDocument()
    expect(dialog.queryByTestId('response-comment')).not.toBeInTheDocument()
  })

  it('anonymous recording: held-back notes are not shown, and say why', async () => {
    state.survey = { ...state.survey, isAnonymous: true }
    state.responses = {
      isAnonymous: true,
      total: 1,
      writtenAnswersNote:
        'Written answers on an anonymous survey are shown once the survey has closed and at least 5 people have answered, so they cannot be traced to anyone.',
      responses: [
        response({
          respondentLabel: 'Anonymous respondent #1',
          respondentRelation: null,
          channel: 'PAPER',
          contactNotes: null,
          contactNotesWithheld: true,
          writtenAnswersWithheld: true,
        }),
      ],
    }
    render(<SurveyResponsesPanel surveyId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /View response/ }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByTestId('response-contact-notes-withheld')).toHaveTextContent('Notes — shown once the survey has closed')
    expect(dialog.queryByTestId('response-contact-notes')).not.toBeInTheDocument()
    expect(dialog.getByTestId('response-written-withheld')).toBeInTheDocument()
  })

  it('notes are shown as before once they may be', async () => {
    state.responses = {
      isAnonymous: false,
      total: 1,
      responses: [response({ channel: 'PAPER', contactNotes: 'Typed up from the paper form' })],
    }
    render(<SurveyResponsesPanel surveyId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: /View response/ }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByTestId('response-contact-notes')).toHaveTextContent('Typed up from the paper form')
    expect(dialog.queryByTestId('response-contact-notes-withheld')).not.toBeInTheDocument()
  })

  it('accepted: Record response is offered only on an open survey, never on a closed one or a repeating survey’s own row', () => {
    const { unmount } = render(<SurveyResponsesPanel surveyId="s1" />)
    expect(screen.getByTestId('survey-record-response')).toBeInTheDocument()
    unmount()
    for (const over of [{ status: 'CLOSED' }, { recurrence: 'MONTHLY' }, { periodCount: 3 }] as const) {
      state.survey = { id: 's1', targetKind: 'EMPLOYEE', status: 'ACTIVE', isTemplate: false, questions: [], periodCount: 0, ...over } as Partial<SurveyDetail>
      const view = render(<SurveyResponsesPanel surveyId="s1" />)
      expect(screen.queryByTestId('survey-record-response')).not.toBeInTheDocument()
      view.unmount()
    }
    // A period of a repeating survey can be recorded on.
    state.survey = { id: 's1', targetKind: 'EMPLOYEE', status: 'ACTIVE', isTemplate: false, questions: [], periodCount: 0, clonedFromId: 'src' }
    render(<SurveyResponsesPanel surveyId="s1" />)
    expect(screen.getByTestId('survey-record-response')).toBeInTheDocument()
  })

  it('named survey: says why answers given without a name are not listed yet', () => {
    const note =
      '1 response was given without a name and is not shown or counted in the answers yet: they are included once the survey (or period) has closed and at least 5 people have answered that way, so they cannot be traced to anyone.'
    state.responses = {
      isAnonymous: false,
      total: 1,
      answeredWithoutName: 1,
      withoutNameAnswersHeldBack: 1,
      withoutNameAnswersNote: note,
      responses: [],
    }
    render(<SurveyResponsesPanel surveyId="s1" />)
    expect(screen.getByTestId('responses-without-name-held')).toHaveTextContent(note)
    expect(screen.getByText('No responses to show yet.')).toBeInTheDocument()
    expect(screen.queryByText(/No responses yet\. Send the survey/)).not.toBeInTheDocument()
  })

  it('anonymous survey: says when responses are counted but not listed yet (being added)', () => {
    const note =
      '2 responses are counted but not yet in the answers: answers not linked to anyone are added in batches (or when the survey closes), so they cannot be matched to who has just answered.'
    state.responses = {
      isAnonymous: true,
      total: 2,
      answeredWithoutName: null,
      withoutNameAnswersHeldBack: 0,
      withoutNameAnswersNote: null,
      responsesBeingAdded: 2,
      responsesBeingAddedNote: note,
      responses: [],
    }
    render(<SurveyResponsesPanel surveyId="s1" />)
    expect(screen.getByTestId('responses-being-added')).toHaveTextContent(note)
  })
})

describe('respondent labels by audience', () => {
  it('surveyRespondentRelationLabel', () => {
    expect(surveyRespondentRelationLabel('SELF', 'EMPLOYEE')).toBe('The employee')
    expect(surveyRespondentRelationLabel('SELF', 'SERVICE_USER')).toBe('The service user')
    expect(surveyRespondentRelationLabel('SELF', 'PUBLIC')).toBe('The respondent')
    expect(surveyRespondentRelationLabel('STAFF', 'EMPLOYEE')).toBe('Staff on their behalf')
  })

  it('describeSurveyRespondent', () => {
    expect(describeSurveyRespondent('SELF', null, 'EMPLOYEE')).toBe('Answered by the employee')
    // The portal (service users) passes no audience.
    expect(describeSurveyRespondent('SELF')).toBe('Answered by the service user')
    expect(describeSurveyRespondent('FAMILY_MEMBER', 'Ann', 'SERVICE_USER')).toBe('Answered by a family member (Ann)')
  })
})
