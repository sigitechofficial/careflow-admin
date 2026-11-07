import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyQuestion, SurveyResponseItem } from '@/features/surveys/types'

const { updateAsync, recordAsync } = vi.hoisted(() => ({ updateAsync: vi.fn(), recordAsync: vi.fn() }))

vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useRecordSurveyResponse: () => ({ mutateAsync: recordAsync, isPending: false }),
  useUpdateRecordedSurveyResponse: () => ({ mutateAsync: updateAsync, isPending: false }),
  useSurveyRecordCandidates: () => ({ data: [], isFetching: false }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { RecordSurveyResponseDialog, recordCandidateDescription } from '@/features/surveys/components/RecordSurveyResponseDialog'
import { formatOpsDateNumeric, formatOpsHm } from '@/shared/lib/operational-day.util'

const questions: SurveyQuestion[] = [
  {
    id: 'q1',
    questionText: 'Do carers arrive on time?',
    helpText: null,
    questionType: 'LIKERT',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
    config: null,
    isRequired: true,
    sortOrder: 0,
  },
  {
    id: 'q2',
    questionText: 'I feel listened to',
    helpText: null,
    questionType: 'LIKERT',
    options: null,
    config: null,
    isRequired: false,
    sortOrder: 1,
  },
]

const recorded: SurveyResponseItem = {
  id: 'r1',
  submittedAt: '2026-11-04T10:30:00.000Z',
  respondentLabel: 'Pat Jones',
  employeeId: null,
  serviceUserId: 'su1',
  respondentRelation: 'SELF',
  channel: 'TELEPHONE',
  contactedAt: '2026-11-04T10:12:00.000Z',
  canEdit: true,
  answerCount: 1,
  answers: [
    {
      questionId: 'q1',
      questionText: 'Do carers arrive on time?',
      questionType: 'LIKERT',
      booleanValue: null,
      textValue: null,
      numberValue: null,
      selectedOptions: ['Usually'],
      displayValue: 'Usually',
    },
  ],
}

const callAt = () => within(screen.getByRole('group', { name: 'Call date and time' }))
const callTime = () => within(screen.getByRole('group', { name: 'Call date and time time' }))

describe('RecordSurveyResponseDialog', () => {
  beforeEach(() => {
    updateAsync.mockReset()
    updateAsync.mockResolvedValue({})
  })

  it('shows the call date as dd/mm/yyyy with a 24-hour time, not a browser datetime box', () => {
    render(
      <RecordSurveyResponseDialog
        surveyId="s1"
        targetKind="SERVICE_USER"
        questions={questions}
        open
        editing={recorded}
        onClose={() => {}}
      />,
    )
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull()
    expect(callAt().getByRole('button', { name: /^Call date and time date/ })).toHaveTextContent('04/11/2026')
    expect(callTime().getByPlaceholderText('HH')).toHaveValue('10')
    expect(callTime().getByPlaceholderText('mm')).toHaveValue('12')
  })

  it('shows the editing note (e.g. a period’s own held-back view) only on a correction', () => {
    const note = 'This response is corrected on its period (October 2026).'
    const view = render(
      <RecordSurveyResponseDialog
        surveyId="p1"
        targetKind="SERVICE_USER"
        questions={questions}
        open
        editing={recorded}
        editingNote={note}
        onClose={() => {}}
      />,
    )
    expect(screen.getByTestId('record-editing-note')).toHaveTextContent(note)
    view.unmount()
    render(
      <RecordSurveyResponseDialog surveyId="p1" targetKind="SERVICE_USER" questions={questions} open editingNote={note} onClose={() => {}} />,
    )
    expect(screen.queryByTestId('record-editing-note')).not.toBeInTheDocument()
  })

  it('a new phone response starts at the current UK date and time', () => {
    const now = new Date().toISOString()
    render(
      <RecordSurveyResponseDialog surveyId="s1" targetKind="SERVICE_USER" questions={questions} open onClose={() => {}} />,
    )
    expect(callAt().getByRole('button', { name: /^Call date and time date/ })).toHaveTextContent(formatOpsDateNumeric(now))
    expect(callTime().getByPlaceholderText('HH')).toHaveValue(formatOpsHm(now).slice(0, 2))
  })

  it('shows each scale question with its own labels, and keeps the call time on a correction', async () => {
    render(
      <RecordSurveyResponseDialog
        surveyId="s1"
        targetKind="SERVICE_USER"
        questions={questions}
        open
        editing={recorded}
        onClose={() => {}}
      />,
    )
    for (const label of ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never', 'Neither agree nor disagree']) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('radio', { name: 'Neutral' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByTestId('record-edit-reason'), 'Typo')
    await userEvent.click(screen.getByTestId('record-submit'))
    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1))
    expect(updateAsync.mock.calls[0][0].input.contactedAt).toBe('2026-11-04T10:12:00.000Z')
  })

  it('anonymous survey: held-back written answers do not block a correction and are kept as they are', async () => {
    const withText: SurveyQuestion[] = [
      { ...questions[0]!, commentConfig: { prompt: 'Please tell us why', showWhen: null } },
      {
        id: 'q3',
        questionText: 'Anything else?',
        helpText: null,
        questionType: 'TEXTAREA',
        options: null,
        config: null,
        isRequired: true,
        sortOrder: 2,
      },
    ]
    const heldBack: SurveyResponseItem = {
      ...recorded,
      respondentLabel: 'Anonymous respondent #2',
      isAnonymous: true,
      writtenAnswersWithheld: true,
      answers: [
        { ...recorded.answers[0]!, comment: null, withheldFields: ['comment'] },
        {
          questionId: 'q3',
          questionText: 'Anything else?',
          questionType: 'TEXTAREA',
          booleanValue: null,
          textValue: null,
          numberValue: null,
          selectedOptions: null,
          withheldFields: ['textValue'],
          displayValue: 'Written answer — shown once the survey has closed',
        },
      ],
    }
    render(
      <RecordSurveyResponseDialog
        surveyId="s1"
        targetKind="SERVICE_USER"
        questions={withText}
        open
        editing={heldBack}
        isAnonymous
        onClose={() => {}}
      />,
    )
    expect(screen.getAllByTestId('record-written-withheld')).toHaveLength(2)
    await userEvent.type(screen.getByTestId('record-edit-reason'), 'Wrong option ticked')
    // The required long-text question is not "missing": its saved answer is kept.
    expect(screen.queryByText(/Answer the required question/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('record-submit'))
    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1))
    const sent = updateAsync.mock.calls[0][0].input.answers
    // Sent without text, so the server keeps the saved words.
    expect(sent).toContainEqual({ questionId: 'q3' })
    expect(sent.find((a: { questionId: string }) => a.questionId === 'q1')).toEqual({
      questionId: 'q1',
      selectedOptions: ['Usually'],
    })
  })

  describe('equality answers linked to no one (shown as their group only)', () => {
    const withLookup: SurveyQuestion[] = [
      questions[0]!,
      {
        id: 'q4',
        questionText: 'What is your ethnic group?',
        helpText: null,
        questionType: 'SINGLE_SELECT',
        options: ['Asian - Gujarati', 'Arab', 'White - Irish'],
        optionsFrom: 'ETHNICITY',
        config: null,
        isRequired: true,
        sortOrder: 3,
      },
    ]
    const anonymousEdit = (shown: string): SurveyResponseItem => ({
      ...recorded,
      respondentLabel: 'Anonymous respondent #1',
      isAnonymous: true,
      answers: [
        recorded.answers[0]!,
        {
          questionId: 'q4',
          questionText: 'What is your ethnic group?',
          questionType: 'SINGLE_SELECT',
          booleanValue: null,
          textValue: null,
          numberValue: null,
          selectedOptions: [shown],
          lookupGroupOnly: true,
          displayValue: shown,
        },
      ],
    })
    const renderEdit = (shown: string) =>
      render(
        <RecordSurveyResponseDialog surveyId="s1" targetKind="SERVICE_USER" questions={withLookup} open editing={anonymousEdit(shown)} isAnonymous onClose={() => {}} />,
      )

    it('the group or "Not shown" is never put in the form or sent; the stored answer is kept', async () => {
      renderEdit('Not shown (fewer than 10 chose this group)')
      expect(screen.getByTestId('record-lookup-kept')).toHaveTextContent(/kept as it is unless you choose a new answer/)
      for (const radio of screen.getAllByRole('radio', { name: /Gujarati|Arab|Irish/ })) expect(radio).not.toBeChecked()
      await userEvent.type(screen.getByTestId('record-edit-reason'), 'Wrong scale answer')
      // Required, but not "missing": the recorded answer is kept.
      expect(screen.queryByText(/Answer the required question/)).not.toBeInTheDocument()
      await userEvent.click(screen.getByTestId('record-submit'))
      await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1))
      const sent = updateAsync.mock.calls[0][0].input.answers
      expect(sent).toContainEqual({ questionId: 'q4' })
      expect(JSON.stringify(sent)).not.toMatch(/Not shown|Asian/)
    })

    it('a new choice replaces it', async () => {
      renderEdit('Asian')
      await userEvent.click(screen.getByRole('radio', { name: 'Arab' }))
      await userEvent.type(screen.getByTestId('record-edit-reason'), 'Read back to them')
      await userEvent.click(screen.getByTestId('record-submit'))
      await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1))
      expect(updateAsync.mock.calls[0][0].input.answers).toContainEqual({ questionId: 'q4', selectedOptions: ['Arab'] })
    })
  })

  describe('notes on an anonymous recording', () => {
    it('anonymous survey: "Please do not include names" under the notes box', () => {
      render(
        <RecordSurveyResponseDialog surveyId="s1" targetKind="SERVICE_USER" questions={questions} open isAnonymous onClose={() => {}} />,
      )
      const hint = screen.getByTestId('record-notes-no-names')
      expect(hint).toHaveTextContent('Please do not include names')
      expect(hint.closest('label')).toContainElement(screen.getByTestId('record-notes'))
    })

    it('named survey: shown once the response is recorded as Anonymous, not before', async () => {
      render(
        <RecordSurveyResponseDialog surveyId="s1" targetKind="SERVICE_USER" questions={questions} open onClose={() => {}} />,
      )
      expect(screen.queryByTestId('record-notes-no-names')).not.toBeInTheDocument()
      await userEvent.click(screen.getByTestId('record-anonymous'))
      expect(screen.getByTestId('record-notes-no-names')).toHaveTextContent('Please do not include names')
    })

    it('correcting a held-back recording: says the notes are kept, and sends none unless typed', async () => {
      const heldNotes: SurveyResponseItem = {
        ...recorded,
        respondentLabel: 'Anonymous respondent #3',
        isAnonymous: true,
        contactNotes: null,
        contactNotesWithheld: true,
        writtenAnswersWithheld: true,
      }
      render(
        <RecordSurveyResponseDialog
          surveyId="s1"
          targetKind="SERVICE_USER"
          questions={questions}
          open
          editing={heldNotes}
          isAnonymous
          onClose={() => {}}
        />,
      )
      expect(screen.getByTestId('record-notes-withheld')).toHaveTextContent(/kept as they are unless you type a replacement/)
      expect(screen.getByTestId('record-notes')).toHaveValue('')
      await userEvent.type(screen.getByTestId('record-edit-reason'), 'Wrong option')
      await userEvent.click(screen.getByTestId('record-submit'))
      await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1))
      // Nothing sent, so the server keeps the saved notes.
      expect(updateAsync.mock.calls[0][0].input.contactNotes).toBeUndefined()
    })

    it('a named recording on a named survey shows neither note', () => {
      render(
        <RecordSurveyResponseDialog
          surveyId="s1"
          targetKind="SERVICE_USER"
          questions={questions}
          open
          editing={{ ...recorded, contactNotes: 'Called back' }}
          onClose={() => {}}
        />,
      )
      expect(screen.getByTestId('record-notes')).toHaveValue('Called back')
      expect(screen.queryByTestId('record-notes-no-names')).not.toBeInTheDocument()
      expect(screen.queryByTestId('record-notes-withheld')).not.toBeInTheDocument()
    })
  })

  describe('the contact-me question', () => {
    const withContact: SurveyQuestion[] = [
      { ...questions[0]!, isRequired: false },
      {
        id: 'q-contact',
        key: 'q-contact',
        questionText: 'Would you like someone to contact you about your answers?',
        helpText: null,
        questionType: 'YES_NO',
        options: null,
        config: null,
        isRequired: true,
        sortOrder: 2,
        contactRequest: true,
      },
    ]

    it('is not asked (or required) when staff record an anonymous paper or phone response', async () => {
      recordAsync.mockReset().mockResolvedValue({})
      render(
        <RecordSurveyResponseDialog surveyId="s1" targetKind="SERVICE_USER" questions={withContact} open onClose={() => {}} />,
      )
      // Named: asked and required.
      expect(screen.getByText('Would you like someone to contact you about your answers?')).toBeInTheDocument()
      await userEvent.click(screen.getByTestId('record-anonymous'))
      expect(screen.queryByText('Would you like someone to contact you about your answers?')).not.toBeInTheDocument()
      await userEvent.click(screen.getByTestId('record-channel-paper'))
      await userEvent.click(screen.getByRole('radio', { name: 'Usually' }))
      expect(screen.queryByText(/Answer the required question/)).not.toBeInTheDocument()
      await userEvent.click(screen.getByTestId('record-submit'))
      await waitFor(() => expect(recordAsync).toHaveBeenCalledTimes(1))
      expect(recordAsync.mock.calls[0][0]).toMatchObject({ isAnonymous: true, channel: 'PAPER' })
      expect(recordAsync.mock.calls[0][0].answers.map((a: { questionId: string }) => a.questionId)).toEqual(['q1'])
    })

    it('a named recording still asks it', () => {
      render(
        <RecordSurveyResponseDialog surveyId="s1" targetKind="SERVICE_USER" questions={withContact} open onClose={() => {}} />,
      )
      expect(screen.getByText('Would you like someone to contact you about your answers?')).toBeInTheDocument()
    })
  })
})

describe('RecordSurveyResponseDialog — several paper forms in a row', () => {
  it('"Save and record another" saves, keeps how they were collected, and clears the form for the next one', async () => {
    recordAsync.mockReset().mockResolvedValue({})
    const onClose = vi.fn()
    render(<RecordSurveyResponseDialog surveyId="s1" targetKind="SERVICE_USER" questions={questions} open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('record-channel-paper'))
    await userEvent.click(screen.getByTestId('record-anonymous'))
    await userEvent.click(screen.getByRole('radio', { name: 'Usually' }))
    await userEvent.click(screen.getByTestId('record-submit-another'))
    await waitFor(() => expect(recordAsync).toHaveBeenCalledTimes(1))
    expect(recordAsync.mock.calls[0][0]).toMatchObject({ channel: 'PAPER', isAnonymous: true })
    expect(onClose).not.toHaveBeenCalled()
    expect(await screen.findByTestId('record-saved-count')).toHaveTextContent('1 response saved')
    expect(screen.getByTestId('record-channel-paper')).toBeChecked()
    expect(screen.getByTestId('record-anonymous')).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Usually' })).not.toBeChecked()
    expect(screen.getByTestId('record-submit')).toHaveTextContent('Save and finish')
  })

  it('is not offered when the person was chosen already, and starts with the channel given', () => {
    render(
      <RecordSurveyResponseDialog
        surveyId="s1"
        targetKind="SERVICE_USER"
        questions={questions}
        open
        initialPerson={{ id: 'su1', name: 'Pat Jones' }}
        initialChannel="IN_PERSON"
        onClose={() => {}}
      />,
    )
    expect(screen.queryByTestId('record-submit-another')).not.toBeInTheDocument()
    expect(screen.getByTestId('record-channel-in_person')).toBeChecked()
  })
})

describe('recordCandidateDescription', () => {
  it('marks people whose care has ended', () => {
    const base = { id: 'su-1', name: 'Dan Ward', recipientStatus: 'SENT' as const, hasResponse: false, hasPortal: false }
    expect(recordCandidateDescription({ ...base, careEnded: true })).toBe('Care ended · Sent: no portal account — phone, visit or post')
    expect(recordCandidateDescription({ ...base, careEnded: false })).toBe('Sent: no portal account — phone, visit or post')
  })
})
