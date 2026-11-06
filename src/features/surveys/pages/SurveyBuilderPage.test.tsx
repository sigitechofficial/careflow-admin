import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyDetail } from '@/features/surveys/types'

const { state, mutation, addQuestion, updateQuestion, updateSurvey, openSurvey, publishSurvey, moveQuestion, copyQuestion } = vi.hoisted(() => ({
  state: { survey: undefined as unknown, results: undefined as unknown, bank: [] as unknown[] },
  mutation: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  addQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  updateSurvey: vi.fn(),
  openSurvey: vi.fn(),
  publishSurvey: vi.fn(),
  moveQuestion: vi.fn(),
  copyQuestion: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a href={to} data-to={to} {...rest}>
      {children}
    </a>
  ),
  useParams: () => ({ surveyId: 's1' }),
  useNavigate: () => vi.fn(),
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: () => boolean }) => unknown) => pick({ can: () => true }),
}))
vi.mock('@/features/surveys/insight/SurveyScoringPanel', () => ({ SurveyScoringPanel: () => <div data-testid="survey-scoring" /> }))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurvey: () => ({ data: state.survey, isLoading: false, isError: false }),
  useSurveys: () => ({ data: [state.survey], isLoading: false, isError: false }),
  useCreateSurvey: mutation,
  useSurveyResults: () => ({ data: state.results }),
  useAddQuestion: () => ({ mutateAsync: addQuestion, isPending: false }),
  useUpdateQuestion: () => ({ mutateAsync: updateQuestion, isPending: false }),
  useRemoveQuestion: mutation,
  useMoveQuestion: () => ({ mutateAsync: moveQuestion, isPending: false }),
  useCopyQuestion: () => ({ mutateAsync: copyQuestion, isPending: false }),
  usePublishSurvey: () => ({ mutateAsync: publishSurvey, isPending: false }),
  useOpenSurvey: () => ({ mutateAsync: openSurvey, isPending: false }),
  useCloseSurvey: mutation,
  useCancelSurveySchedule: mutation,
  useUpdateSurvey: () => ({ mutateAsync: updateSurvey, isPending: false }),
  useSendSurvey: mutation,
  useDuplicateSurvey: mutation,
}))
vi.mock('@/features/settings/hooks/useLocationManagement', () => ({
  useLocationManagementTree: () => ({
    data: {
      zones: [
        {
          id: 'z1',
          name: 'North',
          branches: [
            { id: 'b1', name: 'Leeds', locationId: 'loc-1' },
            { id: 'b2', name: 'York', locationId: 'loc-2' },
          ],
        },
      ],
    },
  }),
}))
vi.mock('@/features/employees/hooks/useEmployees', () => ({
  useEmployeeLookups: () => ({ data: { jobTitles: [{ id: 'jt-1', name: 'Carer' }] } }),
}))
vi.mock('@/features/employees/hooks/useEmployeeTabs', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn(), toastInfo: vi.fn() }))
vi.mock('@/features/surveys/api/survey-library.api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/surveys/api/survey-library.api')>()),
  useLibrarySurveys: () => ({ data: [], isLoading: false, isError: false }),
  useLibrarySurvey: () => ({ data: undefined, isLoading: false, isError: false }),
  useAdoptLibrarySurveys: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSurveyLibraryLink: () => ({ data: null }),
  useQuestionBank: () => ({
    data: { items: state.bank, total: state.bank.length, page: 1, pageSize: 25, topics: [] },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('@/features/surveys/components/SurveyBranchLinksPanel', () => ({ SurveyBranchLinksPanel: () => <div data-testid="branch-links" /> }))
const sectionState = vi.hoisted(() => ({ place: vi.fn(), headers: [] as Array<{ title: string; onAddHere: () => void }> }))
vi.mock('@/features/surveys/sections/SurveySectionControls', () => ({
  useSectionActions: () => ({ place: { mutateAsync: sectionState.place, isPending: false } }),
  SplitSectionsWarning: ({ titles }: { titles: string[] }) =>
    titles.length ? <div data-testid="split-sections-warning">{titles.join(', ')}</div> : null,
  MoveToSectionButton: () => null,
  SurveySectionHeader: (p: { title: string; introduction: string | null; onAddHere: () => void }) => {
    sectionState.headers.push(p)
    return (
      <li>
        {p.title ? <h3 data-testid="survey-section-heading">{p.title}</h3> : <h3 data-testid="survey-no-section">No section</h3>}
        {p.introduction ? <p data-testid="survey-section-intro">{p.introduction}</p> : null}
        <button type="button" onClick={p.onAddHere}>
          Add question here: {p.title}
        </button>
      </li>
    )
  },
}))
const shareState = vi.hoisted(() => ({ links: undefined as unknown, setShared: vi.fn(), renew: vi.fn() }))
vi.mock('@/features/surveys/sharing/survey-sharing.api', () => ({
  useShareLinks: () => ({ data: shareState.links }),
  useSetSharedLink: () => ({ mutateAsync: shareState.setShared, isPending: false }),
  useRenewMainLink: () => ({ mutateAsync: shareState.renew, isPending: false }),
  useSharedLinkSettings: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}))
vi.mock('@/features/surveys/access/SurveyAccessPanel', () => ({ SurveyAccessPanel: () => <div data-testid="survey-access" /> }))
vi.mock('@/features/surveys/reviewers/SurveyReviewers', () => ({ SurveyReviewersPanel: () => null }))
// Alert rules have their own tests (SurveyAlertRulesPanel.test.tsx).
vi.mock('@/features/surveys/alerts/SurveyAlertRulesPanel', () => ({
  SurveyAlertRulesPanel: () => <div data-testid="survey-alert-rules" />,
}))
// Reminders have their own tests (reminders/SurveyRemindersPanel.test.tsx).
vi.mock('@/features/surveys/reminders/SurveyRemindersPanel', () => ({
  SurveyRemindersPanel: () => <div data-testid="survey-reminders" />,
}))
vi.mock('@/features/surveys/contact-rule/SendContactRuleCheck', () => ({ SendContactRuleCheck: () => null }))
vi.mock('@/features/surveys/components/SurveyFormerPeopleField', () => ({ SurveyFormerPeopleField: () => null }))
vi.mock('@/features/surveys/event-triggers/SurveyEventTriggerPanel', () => ({
  SurveyEventTriggerPanel: () => <div data-testid="survey-event-trigger" />,
}))
vi.mock('@/features/surveys/contact-rule/SurveyContactRulePanel', () => ({
  SurveyContactRulePanel: () => <div data-testid="survey-contact-rule" />,
}))
vi.mock('@/features/surveys/components/SurveyLibraryUpdateBanner', () => ({
  SurveyLibraryUpdateBanner: ({ surveyId, canApply }: { surveyId: string; canApply: boolean }) => (
    <div data-testid="library-update-banner">{`${surveyId}:${String(canApply)}`}</div>
  ),
}))

import SurveyBuilderPage from '@/features/surveys/pages/SurveyBuilderPage'

// Radix Select needs these in jsdom.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
})

function survey(overrides: Partial<SurveyDetail> = {}): SurveyDetail {
  return {
    id: 's1',
    title: 'Quarterly feedback',
    description: null,
    targetKind: 'EMPLOYEE',
    status: 'DRAFT',
    isAnonymous: false,
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
    locationIds: ['loc-1'],
    roleIds: ['jt-1'],
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
      {
        id: 'q1',
        questionText: 'Do you feel supported?',
        helpText: null,
        questionType: 'YES_NO',
        options: null,
        config: null,
        isRequired: true,
        sortOrder: 0,
        answerCount: 0,
      },
    ],
    ...overrides,
  }
}

const actions = () => within(screen.getByTestId('survey-actions'))

describe('SurveyBuilderPage', () => {
  beforeEach(() => {
    state.survey = survey()
    state.results = undefined
    state.bank = []
    addQuestion.mockReset().mockResolvedValue({})
    updateQuestion.mockReset().mockResolvedValue({})
    updateSurvey.mockReset().mockResolvedValue({})
  })

  describe('scale (LIKERT) questions', () => {
    const FREQUENCY = ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never']
    const scaleQ = (id: string, options: string[] | null, sortOrder = 0, answerCount = 0) => ({
      id,
      questionText: `Scale question ${id}`,
      helpText: null,
      questionType: 'LIKERT' as const,
      options,
      config: null,
      isRequired: true,
      sortOrder,
      sectionTitle: null,
      answerCount,
    })
    const editDialog = async (index = 0) => {
      await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[index]!)
      return within(screen.getByRole('dialog'))
    }
    const labels = (dialog: ReturnType<typeof within>) =>
      dialog.getAllByRole('textbox', { name: /^Scale label \d+$/ }).map(i => (i as HTMLInputElement).value)

    it('the question list describes each scale by its real labels', () => {
      state.survey = survey({ questions: [scaleQ('q1', FREQUENCY), scaleQ('q2', null, 1)] })
      render(<SurveyBuilderPage />)
      expect(screen.getByText('Scale: Always … Never')).toBeInTheDocument()
      expect(screen.getByText('Scale: Strongly agree … Strongly disagree')).toBeInTheDocument()
    })

    it('Edit shows the Scale tile, the matching standard scale and its labels', async () => {
      state.survey = survey({ questions: [scaleQ('q1', FREQUENCY)] })
      render(<SurveyBuilderPage />)
      const dialog = await editDialog()
      expect(dialog.getByText('Edit question 1 of 1')).toBeInTheDocument()
      expect(dialog.getByRole('radio', { name: 'Scale' })).toHaveAttribute('aria-checked', 'true')
      expect(dialog.getByRole('radio', { name: /^Frequency:/ })).toHaveAttribute('aria-checked', 'true')
      expect(labels(dialog)).toEqual(FREQUENCY)
    })

    it('saving an unchanged scale question never sends or changes its labels', async () => {
      state.survey = survey({ questions: [scaleQ('q1', FREQUENCY), scaleQ('q2', null, 1)] })
      render(<SurveyBuilderPage />)
      for (const index of [0, 1]) {
        const dialog = await editDialog(index)
        await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
        await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(index + 1))
        const { input } = updateQuestion.mock.calls[index]![0]
        expect(input).not.toHaveProperty('options')
        expect(input).not.toHaveProperty('config')
        expect(input.questionType).toBe('LIKERT')
      }
    })

    it('picking a standard scale replaces the labels; your own labels are saved as typed', async () => {
      state.survey = survey({ questions: [scaleQ('q1', FREQUENCY)] })
      render(<SurveyBuilderPage />)
      let dialog = await editDialog()
      await userEvent.click(dialog.getByRole('radio', { name: /^Rating:/ }))
      expect(labels(dialog)).toEqual(['Very good', 'Good', 'Neither good nor poor', 'Poor', 'Very poor'])
      await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(1))
      expect(updateQuestion.mock.calls[0]![0].input.options).toEqual(['Very good', 'Good', 'Neither good nor poor', 'Poor', 'Very poor'])

      dialog = await editDialog()
      // A standard scale's labels are fixed until "Your own labels" is chosen.
      expect(dialog.getByRole('textbox', { name: 'Scale label 1' })).toHaveAttribute('readonly')
      await userEvent.click(dialog.getByRole('radio', { name: 'Your own labels' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Remove Scale label 5' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Remove Scale label 4' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(2))
      expect(updateQuestion.mock.calls[1]![0].input.options).toEqual(['Always', 'Usually', 'Sometimes'])
    })

    it('choosing the agreement scale for a custom-label question goes back to the built-in scale', async () => {
      state.survey = survey({ questions: [scaleQ('q1', FREQUENCY)] })
      render(<SurveyBuilderPage />)
      const dialog = await editDialog()
      await userEvent.click(dialog.getByRole('radio', { name: /^Agreement:/ }))
      await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(1))
      expect(updateQuestion.mock.calls[0]![0].input.options).toBeNull()
    })

    it('a new scale question can use a standard scale (agreement, built in, by default)', async () => {
      render(<SurveyBuilderPage />)
      await userEvent.click(screen.getByRole('button', { name: 'Add question' }))
      let dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'I feel supported')
      await userEvent.click(dialog.getByRole('radio', { name: 'Scale' }))
      expect(dialog.getByRole('radio', { name: /^Agreement:/ })).toHaveAttribute('aria-checked', 'true')
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(1))
      expect(addQuestion.mock.calls[0]![0]).not.toHaveProperty('options')

      await userEvent.click(screen.getByRole('button', { name: 'Add question' }))
      dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'How often are carers on time?')
      await userEvent.click(dialog.getByRole('radio', { name: 'Scale' }))
      await userEvent.click(dialog.getByRole('radio', { name: /^Frequency:/ }))
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(2))
      expect(addQuestion.mock.calls[1]![0]).toMatchObject({ questionType: 'LIKERT', options: FREQUENCY })
    })

    it('once answered, the editor explains why and only the help text, section and comment box are saved', async () => {
      state.survey = survey({
        status: 'ACTIVE',
        responseCount: 2,
        questionsLocked: true,
        settingsLocked: true,
        questions: [scaleQ('q1', FREQUENCY, 0, 2)],
      })
      render(<SurveyBuilderPage />)
      const dialog = await editDialog()
      expect(dialog.getByTestId('question-locked')).toHaveTextContent(/already answered this survey/)
      expect(dialog.getByRole('textbox', { name: 'Scale label 1' })).toHaveAttribute('readonly')
      expect(dialog.getByRole('radio', { name: /^Rating:/ })).toBeDisabled()
      expect(dialog.getByRole('radio', { name: 'Yes / No' })).toBeDisabled()
      expect(dialog.queryByRole('button', { name: /Remove Scale label/ })).not.toBeInTheDocument()
      expect(dialog.getByPlaceholderText(/How supported do you feel/)).toHaveAttribute('readonly')
      expect(dialog.getByPlaceholderText('Optional guidance shown under the question')).not.toHaveAttribute('readonly')
      await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(1))
      expect(Object.keys(updateQuestion.mock.calls[0]![0].input).sort()).toEqual(['helpText', 'sectionTitle'])
    })
  })

  describe('the question editor', () => {
    const supported = {
      id: 'q1',
      key: 'q-supported',
      questionText: 'Do you feel supported?',
      helpText: null,
      questionType: 'YES_NO' as const,
      options: null,
      config: null,
      isRequired: true,
      sortOrder: 0,
      answerCount: 0,
    }
    const openAdd = async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Add question' }))
      return within(screen.getByRole('dialog'))
    }

    it('adds several answers with Other, a clearing answer, a not-counted answer, a comment box and Show only if', async () => {
      state.survey = survey({ questions: [supported] })
      render(<SurveyBuilderPage />)
      const dialog = await openAdd()
      expect(dialog.getByText('Add question', { selector: 'h2' })).toBeInTheDocument()
      await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'What would help?')
      await userEvent.click(dialog.getByRole('radio', { name: 'Several answers' }))
      await userEvent.type(dialog.getByRole('textbox', { name: 'Answer 1' }), 'Training')
      await userEvent.type(dialog.getByRole('textbox', { name: 'Answer 2' }), 'Supervision{enter}None of these{enter}Prefer not to say')
      // "Prefer not to say" typed in a row is not marked by itself.
      await userEvent.click(dialog.getByRole('switch', { name: 'Prefer not to say: not counted in percentages' }))
      await userEvent.click(dialog.getByRole('switch', { name: 'None of these: clears the others' }))
      await userEvent.click(dialog.getByTestId('other-enabled'))
      await userEvent.clear(dialog.getByTestId('other-label'))
      await userEvent.type(dialog.getByTestId('other-label'), 'Something else')
      await userEvent.click(dialog.getByTestId('comment-enabled'))
      await userEvent.click(within(dialog.getByTestId('comment-show-when')).getByRole('button', { name: 'Something else' }))
      await userEvent.click(dialog.getByTestId('show-if-only-after'))
      expect(dialog.getByTestId('question-error')).toHaveTextContent(/Pick at least one answer for “Only after certain answers”/)
      await userEvent.click(within(dialog.getByTestId('show-if-answers')).getByRole('button', { name: 'No' }))
      // The preview says when it is asked.
      expect(dialog.getByTestId('preview-show-if')).toHaveTextContent('Asked only if “Do you feel supported?” is No')
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(1))
      expect(addQuestion.mock.calls[0]![0]).toMatchObject({
        questionType: 'MULTI_SELECT',
        options: ['Training', 'Supervision', 'None of these', 'Prefer not to say'],
        config: { notCountedOptions: ['Prefer not to say'] },
        otherOption: { label: 'Something else', textPrompt: 'Please tell us', textRequired: true },
        exclusiveOptions: ['None of these'],
        commentConfig: { prompt: 'Please tell us why', showWhen: ['Something else'] },
        showIf: { questionKey: 'q-supported', answers: ['No'] },
        sortOrder: 1,
      })
    }, 15_000) // Many steps in one editor: slow when the whole suite runs at once.

    it('a plain question sends no extras, and written-answer questions offer no comment box', async () => {
      render(<SurveyBuilderPage />)
      const dialog = await openAdd()
      await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'Anything else?')
      await userEvent.click(dialog.getByRole('radio', { name: 'Long text' }))
      expect(dialog.queryByTestId('comment-enabled')).not.toBeInTheDocument()
      expect(dialog.queryByTestId('other-enabled')).not.toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(1))
      expect(addQuestion.mock.calls[0]![0]).toMatchObject({
        questionType: 'TEXTAREA',
        otherOption: null,
        exclusiveOptions: null,
        commentConfig: null,
        showIf: null,
      })
      expect(addQuestion.mock.calls[0]![0]).not.toHaveProperty('config')
    })

    it('the question list labels what each question does, explained on hover', () => {
      state.survey = survey({
        questions: [
          supported,
          {
            ...supported,
            id: 'q2',
            key: 'q-why',
            questionText: 'What would help?',
            questionType: 'MULTI_SELECT',
            options: ['Training', 'None of these', "Don't know"],
            config: { notCountedOptions: ["Don't know"] },
            isRequired: false,
            sortOrder: 1,
            otherOption: { label: 'Other (please tell us)', textPrompt: 'Please tell us', textRequired: true },
            exclusiveOptions: ['None of these'],
            commentConfig: { prompt: 'Why?', showWhen: ['Training'] },
            showIf: { questionKey: 'q-supported', answers: ['No'] },
          },
        ],
      })
      render(<SurveyBuilderPage />)
      const items = screen.getAllByTestId('survey-question-item')
      expect(within(items[0]!).getAllByTestId('question-label').map(l => l.textContent)).toEqual(['Required'])
      const labels = within(items[1]!).getAllByTestId('question-label')
      expect(labels.map(l => [l.textContent, l.getAttribute('title')])).toEqual([
        ['Other', '“Other (please tell us)” with a text box'],
        ['Clears the others', 'Choosing “None of these” clears other answers'],
        ['Comment box', 'Comment box after: Training'],
        ['Asked only if…', 'Asked only if “Do you feel supported?” is No'],
        ['Not counted answers', "Not counted in percentages: Don't know"],
      ])
    })

    it('editing a question others depend on keeps it always asked; editing loads its settings', async () => {
      state.survey = survey({
        questions: [
          supported,
          {
            ...supported,
            id: 'q2',
            key: 'q-why',
            questionText: 'Why not?',
            questionType: 'SINGLE_SELECT',
            options: ['Workload', 'Rota'],
            sortOrder: 1,
            commentConfig: { prompt: 'Tell us more', showWhen: null },
            showIf: { questionKey: 'q-supported', answers: ['No'] },
          },
        ],
      })
      render(<SurveyBuilderPage />)
      await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
      let dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByTestId('show-if-only-after')).toBeDisabled()
      expect(dialog.getByTestId('show-if-dependents')).toHaveTextContent(/another question depends on this one/)
      await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))

      await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1]!)
      dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByText('Edit question 2 of 2')).toBeInTheDocument()
      expect(dialog.getByTestId('show-if-question')).toHaveTextContent('Do you feel supported?')
      expect(within(dialog.getByTestId('show-if-answers')).getByRole('button', { name: 'No' })).toHaveAttribute('aria-pressed', 'true')
      expect(dialog.getByTestId('comment-prompt')).toHaveValue('Tell us more')
      expect(dialog.getByTestId('comment-when-any')).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(1))
      expect(updateQuestion.mock.calls[0]![0].input).toMatchObject({
        options: ['Workload', 'Rota'],
        commentConfig: { prompt: 'Tell us more', showWhen: null },
        showIf: { questionKey: 'q-supported', answers: ['No'] },
      })
    })

    it('a new question goes after the last one, even when removed questions left gaps in the positions', async () => {
      state.survey = survey({
        questions: [
          { ...supported, sortOrder: 2 },
          { ...supported, id: 'q2', key: 'q-last', questionText: 'Last question', sortOrder: 3 },
        ],
      })
      render(<SurveyBuilderPage />)
      const dialog = await openAdd()
      await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'Anything else?')
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(1))
      expect(addQuestion.mock.calls[0]![0]).toMatchObject({ sortOrder: 4 })
    })

    it('emptying the help text removes it (sent as null, not left out)', async () => {
      state.survey = survey({ questions: [{ ...supported, helpText: 'Think about the last month' }] })
      render(<SurveyBuilderPage />)
      await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.clear(dialog.getByDisplayValue('Think about the last month'))
      await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(updateQuestion).toHaveBeenCalledTimes(1))
      expect(updateQuestion.mock.calls[0]![0].input.helpText).toBeNull()
    })

    it('the section is picked from the survey’s headings, or a new one is typed', async () => {
      state.survey = survey({
        questions: [
          { ...supported, sectionTitle: 'Your visits' },
          { ...supported, id: 'q2', key: 'q-2', questionText: 'Q2', sortOrder: 1, sectionTitle: 'Your say' },
        ],
      })
      render(<SurveyBuilderPage />)
      const dialog = await openAdd()
      await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'Anything else?')
      await userEvent.click(dialog.getByRole('combobox', { name: 'Section' }))
      expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['No section', 'Your visits', 'Your say', 'New section…'])
      await userEvent.click(screen.getByRole('option', { name: 'New section…' }))
      await userEvent.type(dialog.getByPlaceholderText(/e.g. Your visits/), 'Anything else')
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(1))
      expect(addQuestion.mock.calls[0]![0].sectionTitle).toBe('Anything else')
    })

    describe('moving and copying in the list', () => {
      beforeEach(() => {
        moveQuestion.mockReset().mockResolvedValue({})
        copyQuestion.mockReset().mockResolvedValue({})
      })
      const dependent = {
        ...supported,
        id: 'q2',
        key: 'q-why',
        questionText: 'Why not?',
        sortOrder: 1,
        showIf: { questionKey: 'q-supported', answers: ['No'] },
      }

      it('moves a question up or down (and says where it went), and copies it', async () => {
        state.survey = survey({ questions: [supported, { ...supported, id: 'q2', key: 'q-2', questionText: 'Q2', sortOrder: 1 }] })
        render(<SurveyBuilderPage />)
        // The ends stay focusable (focus is not lost after a move) but do nothing.
        const firstUp = screen.getByRole('button', { name: 'Move question 1 up' })
        expect(firstUp).toHaveAttribute('aria-disabled', 'true')
        expect(screen.getByRole('button', { name: 'Move question 2 down' })).toHaveAttribute('aria-disabled', 'true')
        await userEvent.click(firstUp)
        expect(moveQuestion).not.toHaveBeenCalled()
        await userEvent.click(screen.getByRole('button', { name: 'Move question 2 up' }))
        expect(moveQuestion).toHaveBeenCalledWith({ questionId: 'q2', direction: 'up' })
        await waitFor(() => expect(screen.getByTestId('question-move-status')).toHaveTextContent('Question moved to position 1 of 2.'))
        await userEvent.click(screen.getByRole('button', { name: 'Copy question 1' }))
        expect(copyQuestion).toHaveBeenCalledWith('q1')
      })

      it('a question cannot move above the one it depends on, nor that one below it (and says why)', async () => {
        state.survey = survey({ questions: [supported, dependent] })
        render(<SurveyBuilderPage />)
        const up = screen.getByRole('button', { name: 'Move question 2 up' })
        const down = screen.getByRole('button', { name: 'Move question 1 down' })
        expect(up).toHaveAttribute('aria-disabled', 'true')
        expect(up).toHaveAttribute('title', expect.stringMatching(/asked only after an answer to the question above/))
        expect(down).toHaveAttribute('aria-disabled', 'true')
        expect(down).toHaveAttribute('title', expect.stringMatching(/question below is asked only after an answer to this one/))
        // Keyboard and screen-reader users hear the reason too (a tooltip is never read out).
        await userEvent.click(up)
        expect(moveQuestion).not.toHaveBeenCalled()
        expect(screen.getByTestId('question-move-status')).toHaveTextContent(/asked only after an answer to the question above/)
      })

      it('answered surveys can still reorder, but not copy (the copy could never be reworded)', () => {
        state.survey = survey({
          status: 'ACTIVE',
          responseCount: 3,
          questionsLocked: true,
          settingsLocked: true,
          questions: [supported, { ...supported, id: 'q2', key: 'q-2', questionText: 'Q2', sortOrder: 1 }],
        })
        render(<SurveyBuilderPage />)
        expect(screen.getByRole('button', { name: 'Move question 2 up' })).not.toHaveAttribute('aria-disabled', 'true')
        expect(screen.queryByRole('button', { name: 'Copy question 1' })).not.toBeInTheDocument()
      })
    })
  })

  it('See example questions (survey page) opens the examples, then the editor on the chosen format', async () => {
    render(<SurveyBuilderPage />)
    await userEvent.click(screen.getByRole('button', { name: 'See example questions' }))
    const gallery = within(screen.getByTestId('format-dialog'))
    await userEvent.click(gallery.getByRole('radio', { name: 'Score 0 to 10' }))
    await userEvent.click(gallery.getByRole('button', { name: 'Use this format' }))
    const editor = within(screen.getByTestId('question-editor'))
    expect(editor.getByText('Add question', { selector: 'h2' })).toBeInTheDocument()
    expect(editor.getByRole('radio', { name: 'Score' })).toHaveAttribute('aria-checked', 'true')
    expect(editor.getByRole('spinbutton', { name: 'Highest score' })).toHaveValue(10)
  })

  describe('Add from question bank', () => {
    const bq = (id: string, text: string, over: Record<string, unknown> = {}) => ({
      id,
      questionText: text,
      helpText: null,
      questionType: 'YES_NO',
      options: null,
      config: null,
      notCountedOptions: [],
      isRequired: true,
      otherOption: null,
      exclusiveOptions: [],
      commentConfig: null,
      topic: 'Feeling safe',
      contactRequest: false,
      askedOnlyIf: null,
      audiences: ['PWS'],
      sources: [{ surveyId: 'lib-1', reference: 'SUR-PWS-003', title: 'Annual survey', group: 'People we support' }],
      ...over,
    })

    it('adds the chosen questions in the order chosen after the last one, then opens the first to check', async () => {
      state.bank = [
        bq('b1', 'Do you feel safe?'),
        bq('b2', 'How was your last visit?', {
          questionType: 'SINGLE_SELECT',
          options: ['Good', 'Poor', "Don't know"],
          config: { notCountedOptions: ["Don't know"] },
          notCountedOptions: ["Don't know"],
          topic: 'Your visits',
        }),
      ]
      let added = 0
      addQuestion.mockImplementation(async (input: { questionText: string }) => ({
        id: `new-${(added += 1)}`,
        ...input,
      }))
      const { rerender } = render(<SurveyBuilderPage />)
      await userEvent.click(screen.getByRole('button', { name: 'Add from question bank' }))
      const dialog = within(screen.getByTestId('question-bank'))
      await userEvent.click(dialog.getByRole('checkbox', { name: /How was your last visit/ }))
      await userEvent.click(dialog.getByRole('checkbox', { name: /Do you feel safe/ }))
      await userEvent.click(dialog.getByRole('button', { name: 'Add 2 questions' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(2))
      expect(addQuestion.mock.calls[0]![0]).toMatchObject({
        questionText: 'How was your last visit?',
        options: ['Good', 'Poor', "Don't know"],
        config: { notCountedOptions: ["Don't know"] },
        sectionTitle: 'Your visits',
        showIf: null,
        sortOrder: 1,
      })
      expect(addQuestion.mock.calls[1]![0]).toMatchObject({ questionText: 'Do you feel safe?', sectionTitle: 'Feeling safe', sortOrder: 2 })
      // Once the survey has them, the first opens for editing.
      state.survey = survey({
        questions: [
          survey().questions[0]!,
          { ...survey().questions[0]!, id: 'new-1', questionText: 'How was your last visit?', sortOrder: 1 },
        ],
      })
      rerender(<SurveyBuilderPage />)
      await waitFor(() => expect(within(screen.getByTestId('question-editor')).getByText('Edit question 2 of 2')).toBeInTheDocument())
    })

    it('anonymous survey: the contact-me question cannot be added', async () => {
      state.survey = survey({ isAnonymous: true })
      state.bank = [bq('b9', 'Would you like someone to contact you about your answers?', { contactRequest: true })]
      render(<SurveyBuilderPage />)
      await userEvent.click(screen.getByRole('button', { name: 'Add from question bank' }))
      expect(within(screen.getByTestId('question-bank')).getByRole('checkbox', { name: /contact you/ })).toBeDisabled()
    })
  })

  it('a staff template that says {{manager}} offers "Make a copy for each manager"; others do not', () => {
    state.survey = survey({ isTemplate: true, title: 'Feedback on your manager', description: 'About {{manager}}.' })
    const { unmount } = render(<SurveyBuilderPage />)
    expect(actions().getByRole('button', { name: 'Make a copy for each manager' })).toBeInTheDocument()
    unmount()
    state.survey = survey({ isTemplate: true })
    render(<SurveyBuilderPage />)
    expect(actions().queryByRole('button', { name: 'Make a copy for each manager' })).not.toBeInTheDocument()
  })

  describe('template mode', () => {
    beforeEach(() => {
      state.survey = survey({ isTemplate: true, targetKind: 'PUBLIC', shareToken: null })
    })

    it('says it is never sent and offers only "Use this template"', () => {
      render(<SurveyBuilderPage />)
      expect(screen.getByText('This is a template — it is never sent')).toBeInTheDocument()
      expect(actions().getByRole('button', { name: /Use this template/ })).toBeInTheDocument()
      for (const name of [/Send or schedule/, /Publish/, /Close survey/, /Open for responses/, /Copy shareable link/]) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
      }
      expect(screen.queryByText('Shareable link')).not.toBeInTheDocument()
      expect(screen.queryByText(/Completion progress/)).not.toBeInTheDocument()
      expect(actions().queryByText('Results')).not.toBeInTheDocument()
      expect(screen.queryByTestId('survey-results-strip')).not.toBeInTheDocument()
    })

    it('"Use this template" opens the New survey dialog on its details, with this template chosen', async () => {
      render(<SurveyBuilderPage />)
      await userEvent.click(actions().getByRole('button', { name: /Use this template/ }))
      const dialog = within(screen.getByTestId('new-survey-dialog'))
      expect(dialog.getByText('New survey')).toBeInTheDocument()
      expect(dialog.getByText('Step 2 of 2 · Details')).toBeInTheDocument()
      expect(dialog.getByTestId('new-survey-source')).toHaveTextContent('From template: Quarterly feedback')
      expect(dialog.getByDisplayValue('Quarterly feedback')).toBeInTheDocument()
      expect(dialog.getByTestId('new-survey-target-fixed')).toHaveTextContent('Public')
      expect(dialog.getByRole('button', { name: 'Back' })).toBeInTheDocument()
      expect(dialog.getByRole('button', { name: 'Create survey' })).toBeInTheDocument()
    })
  })

  it('a staff survey has no share link and can be opened for responses or sent', () => {
    render(<SurveyBuilderPage />)
    expect(screen.queryByText('Shareable link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Publish/ })).not.toBeInTheDocument()
    expect(actions().getByRole('button', { name: /Open for responses/ })).toBeInTheDocument()
    expect(actions().getByRole('button', { name: /Send or schedule/ })).toBeInTheDocument()
  })

  it('a service-user survey explains phone / visit recording via Open for responses', () => {
    state.survey = survey({ targetKind: 'SERVICE_USER', roleIds: [] })
    render(<SurveyBuilderPage />)
    expect(actions().getByRole('button', { name: /Open for responses/ })).toBeInTheDocument()
    const how = screen.getByTestId('survey-how-people-answer')
    expect(within(how).getByText('How people answer this survey')).toBeInTheDocument()
    expect(how).toHaveTextContent(/By phone, on a visit or on paper: use Open for responses, then Results → Individual responses → Record response/)
    expect(how).toHaveTextContent(/use Copy link under Results → Recipients/)
    expect(screen.queryByText('Shareable link')).not.toBeInTheDocument()
  })

  it('an anonymous survey never offers people’s own links', () => {
    state.survey = survey({ targetKind: 'SERVICE_USER', roleIds: [], isAnonymous: true })
    render(<SurveyBuilderPage />)
    expect(screen.getByTestId('survey-how-people-answer')).toHaveTextContent(/nobody’s own link is ever shown/)
  })

  describe('shared link on a staff survey', () => {
    beforeEach(() => {
      shareState.links = { main: null, enabled: false, branches: [], availableBranches: [] }
      shareState.setShared.mockReset().mockResolvedValue({})
    })

    it('is off until turned on, after the manager has seen what it means', async () => {
      state.survey = survey({ status: 'ACTIVE' })
      render(<SurveyBuilderPage />)
      const panel = screen.getByTestId('survey-share-panel')
      expect(within(panel).getByText('Shared link')).toBeInTheDocument()
      expect(screen.queryByTestId('shared-link-url')).not.toBeInTheDocument()
      fireEvent.click(within(panel).getByRole('button', { name: /Turn on the shared link/ }))
      const tradeOffs = await screen.findByTestId('shared-link-trade-offs')
      expect(tradeOffs).toHaveTextContent(/never linked to a name/)
      expect(tradeOffs).toHaveTextContent(/never which answers came through it/)
      expect(shareState.setShared).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Turn on' }))
      await waitFor(() => expect(shareState.setShared).toHaveBeenCalledWith(true))
    })

    it('once on, shows the link with messages, QR code and poster, a new link and turning it off', async () => {
      shareState.links = { main: { token: 'staff-token' }, enabled: true, branches: [], availableBranches: [] }
      state.survey = survey({ status: 'ACTIVE', sharedLinkEnabled: true, shareToken: 'staff-token' })
      render(<SurveyBuilderPage />)
      expect(screen.getByTestId('shared-link-url')).toHaveTextContent('/survey/staff-token')
      fireEvent.click(screen.getByRole('button', { name: /Messages to send/ }))
      const message = (screen.getByLabelText('WhatsApp message') as HTMLTextAreaElement).value
      expect(message).toContain('/survey/staff-token')
      expect(message).toContain('not linked to your name')
      fireEvent.click(screen.getByRole('button', { name: 'Turn off' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }))
      await waitFor(() => expect(shareState.setShared).toHaveBeenCalledWith(false))
    })
  })

  it('an open service-user survey sends staff straight to Record response', () => {
    state.survey = survey({ targetKind: 'SERVICE_USER', roleIds: [], status: 'ACTIVE' })
    render(<SurveyBuilderPage />)
    const how = screen.getByTestId('survey-how-people-answer')
    expect(how).toHaveTextContent(/go to Results → Individual responses → Record response and type in their answers/)
    expect(how).not.toHaveTextContent(/Open for responses/)
  })

  it('a staff survey says each person gets their own link', () => {
    render(<SurveyBuilderPage />)
    expect(screen.getByTestId('survey-how-people-answer')).toHaveTextContent(
      /email with their own link and a carer app notification/,
    )
  })

  it('Preview opens the page people answer on, first among the actions', () => {
    render(<SurveyBuilderPage />)
    const preview = actions().getByRole('link', { name: /Preview/ })
    expect(preview).toHaveAttribute('data-to', '/surveys/$surveyId/preview')
    expect(actions().getAllByRole('link')[0]).toBe(preview)
  })

  it('Preview is offered on templates and is disabled until the survey has a question', () => {
    state.survey = survey({ isTemplate: true, questions: [] })
    render(<SurveyBuilderPage />)
    expect(actions().getByRole('button', { name: /Preview/ })).toBeDisabled()
    expect(actions().queryByRole('link', { name: /Preview/ })).not.toBeInTheDocument()
  })

  it('a long introduction is shown in short below the actions, with the rest a click away', async () => {
    const intro = ['First paragraph of the introduction.', 'Second paragraph.', 'Third paragraph.'].join('\n\n')
    state.survey = survey({ description: intro })
    render(<SurveyBuilderPage />)
    const text = screen.getByText(/First paragraph of the introduction/)
    expect(text).toHaveClass('line-clamp-2')
    const toggle = screen.getByRole('button', { name: 'Show the full introduction' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(text).not.toHaveClass('line-clamp-2')
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('only a public survey shows the share link and Publish', () => {
    state.survey = survey({ targetKind: 'PUBLIC', shareToken: 'tok-1', locationIds: [], roleIds: [] })
    render(<SurveyBuilderPage />)
    expect(screen.getByText('Shareable link')).toBeInTheDocument()
    expect(actions().getByRole('button', { name: /Publish & copy link/ })).toBeInTheDocument()
    expect(actions().queryByRole('button', { name: /Send or schedule/ })).not.toBeInTheDocument()
  })

  it('shows the saved audience on the scheduled distribution panel', () => {
    state.survey = survey({ distributeAt: '2026-11-10T09:00:00.000Z', scheduledByName: 'Sam Manager' })
    render(<SurveyBuilderPage />)
    const panel = screen.getByTestId('scheduled-distribution')
    expect(within(panel).getByText('Leeds · Job titles: Carer')).toBeInTheDocument()
    expect(within(panel).getByText('10 Nov 2026, 09:00')).toBeInTheDocument()
    expect(panel).toHaveTextContent('scheduled by Sam Manager')
  })

  it('a failed scheduled send is shown instead of a pending schedule', () => {
    state.survey = survey({
      distributeAt: '2026-11-10T09:00:00.000Z',
      distributionFailedAt: '2026-11-10T09:01:00.000Z',
      distributionError: 'The survey has no questions.',
    })
    render(<SurveyBuilderPage />)
    expect(screen.getByText('Scheduled send failed')).toBeInTheDocument()
    expect(screen.queryByTestId('scheduled-distribution')).not.toBeInTheDocument()
  })

  it('once answered, a question can only have its help text edited and cannot be removed', async () => {
    state.survey = survey({
      status: 'ACTIVE',
      responseCount: 3,
      questionsLocked: true,
      settingsLocked: true,
      questions: [{ ...survey().questions[0]!, answerCount: 3 }],
    })
    render(<SurveyBuilderPage />)
    expect(screen.queryByRole('button', { name: 'Remove question 1' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByDisplayValue('Do you feel supported?')).toHaveAttribute('readonly')
    expect(within(dialog).getByPlaceholderText('Optional guidance shown under the question')).not.toHaveAttribute('readonly')
  })

  it('no question can be removed once the survey has responses, even with none counted against it', () => {
    // Answers given without a name (or still being added) are not in the per-question counts.
    state.survey = survey({
      status: 'ACTIVE',
      responseCount: 2,
      questionsLocked: true,
      settingsLocked: true,
      questions: [{ ...survey().questions[0]!, answerCount: 0 }],
    })
    const { unmount } = render(<SurveyBuilderPage />)
    expect(screen.queryByRole('button', { name: 'Remove question 1' })).not.toBeInTheDocument()
    unmount()
    state.survey = survey()
    render(<SurveyBuilderPage />)
    expect(screen.getByRole('button', { name: 'Remove question 1' })).toBeInTheDocument()
  })

  describe('results live on the results page; the survey page shows "Results so far"', () => {
    const results = (over: Record<string, unknown> = {}) => ({
      isAnonymous: false,
      recipients: 20,
      completed: 8,
      responses: 9,
      responseRate: 40,
      participation: {
        sentTo: 20,
        answered: 9,
        answeredFromSent: 8,
        responseRate: 40,
        openedNotFinished: 2,
        notOpened: 10,
        answeredThroughLink: null,
        recordedByStaff: null,
        answeredEveryQuestion: 7,
        skippedSomeQuestions: 2,
        responsesInFigures: 9,
      },
      questionSummaries: [
        { questionId: 'q1', questionText: 'Do you feel supported?', questionType: 'YES_NO', sortOrder: 0, answerCount: 9, options: [] },
      ],
      breakdowns: [{ dimension: 'branch', groups: [{ key: 'l', label: 'Leeds', responses: 9 }], suppressed: false, note: null }],
      ...over,
    })

    it('shows sent to, answered and the response rate, with See results — and no question summary or breakdowns', () => {
      state.survey = survey({ status: 'ACTIVE', recipientCount: 20, responseCount: 9 })
      state.results = results()
      render(<SurveyBuilderPage />)
      const strip = screen.getByTestId('survey-results-strip')
      expect(strip).toHaveTextContent('Results so far')
      expect(strip).toHaveTextContent(/Sent to\s*20\s*·\s*Answered\s*9\s*·\s*Response rate\s*40%/)
      expect(within(strip).getByRole('link', { name: 'See results' })).toHaveAttribute('href', '/surveys/$surveyId/responses')
      expect(screen.queryByText('Each question')).not.toBeInTheDocument()
      expect(screen.queryByText('Responses by branch')).not.toBeInTheDocument()
      expect(screen.queryByText(/Completion progress/)).not.toBeInTheDocument()
    })

    it('the header button reads Results (N)', () => {
      state.survey = survey({ status: 'ACTIVE', recipientCount: 20, responseCount: 9 })
      render(<SurveyBuilderPage />)
      expect(actions().getByRole('link', { name: /Results \(9\)/ })).toHaveAttribute('href', '/surveys/$surveyId/responses')
    })

    it('a public survey shows answered only (there is no list of people)', () => {
      state.survey = survey({ status: 'ACTIVE', targetKind: 'PUBLIC', responseCount: 4 })
      state.results = results({
        recipients: 0,
        responses: 4,
        participation: { ...results().participation, sentTo: null, answered: 4, responseRate: null },
      })
      render(<SurveyBuilderPage />)
      const strip = screen.getByTestId('survey-results-strip')
      expect(strip).toHaveTextContent(/Answered\s*4/)
      expect(strip).not.toHaveTextContent('Sent to')
      expect(strip).not.toHaveTextContent('Response rate')
    })

    it('a draft with nothing sent and no answers has no results area yet', () => {
      state.survey = survey({ status: 'DRAFT', recipientCount: 0, responseCount: 0 })
      render(<SurveyBuilderPage />)
      expect(screen.queryByTestId('survey-results-strip')).not.toBeInTheDocument()
    })

    it('an open survey with no answers yet says "No answers yet"', () => {
      state.survey = survey({ status: 'ACTIVE', recipientCount: 0, responseCount: 0 })
      render(<SurveyBuilderPage />)
      expect(screen.getByTestId('survey-results-strip')).toHaveTextContent('No answers yet')
    })

    it('groups the page: Questions, then Survey settings, each an h2 under the title', () => {
      state.survey = survey({ status: 'ACTIVE' })
      render(<SurveyBuilderPage />)
      const h2s = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
      expect(h2s.indexOf('Survey settings')).toBeGreaterThan(h2s.findIndex(t => t?.startsWith('Questions')))
    })

    it('a repeating survey counts every period', () => {
      state.survey = survey({ status: 'ACTIVE', recurrence: 'MONTHLY', periodCount: 3 })
      state.results = results({ includesPeriodRuns: true, periods: [{}, {}, {}] })
      render(<SurveyBuilderPage />)
      expect(screen.getByTestId('survey-results-strip')).toHaveTextContent('All 3 periods together.')
    })
  })

  it('a stopped repeating survey offers Restart repeating, not a Reopen that always fails', async () => {
    state.survey = survey({ status: 'CLOSED', periodCount: 4, recurrence: null })
    render(<SurveyBuilderPage />)
    expect(actions().queryByRole('button', { name: /Reopen survey/ })).not.toBeInTheDocument()
    await userEvent.click(actions().getByRole('button', { name: /Restart repeating/ }))
    expect(within(screen.getByRole('dialog')).getByText('Change repeating schedule')).toBeInTheDocument()
  })

  describe('end dates', () => {
    beforeEach(() => {
      openSurvey.mockReset().mockResolvedValue({})
      publishSurvey.mockReset().mockResolvedValue({})
    })

    it('an open survey with an end date says when it ends', () => {
      state.survey = survey({ status: 'ACTIVE', closesAt: '2026-11-30T17:00:00.000Z' })
      render(<SurveyBuilderPage />)
      expect(screen.getByTestId('survey-end-label')).toHaveTextContent('Ends 30 Nov 2026, 17:00')
    })

    it('a survey closed at its end date says so', () => {
      state.survey = survey({ status: 'CLOSED', closesAt: '2026-11-01T17:00:00.000Z', closedAtEndDate: true })
      render(<SurveyBuilderPage />)
      expect(screen.getByTestId('survey-end-label')).toHaveTextContent('Closed at its end date')
      expect(screen.getByText(/This survey closed at its end date \(1 Nov 2026, 17:00\) and no longer accepts responses/)).toBeInTheDocument()
    })

    it('Reopen asks for a new end date (or none) when the end date has passed', async () => {
      state.survey = survey({ status: 'CLOSED', closesAt: '2020-01-01T09:00:00.000Z', closedAtEndDate: true })
      render(<SurveyBuilderPage />)
      await userEvent.click(actions().getByRole('button', { name: /Reopen survey/ }))
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByTestId('reopen-end-date-passed')).toHaveTextContent(
        'Its end date (1 Jan 2020, 09:00) has passed, so it would close again straight away.',
      )
      expect(openSurvey).not.toHaveBeenCalled()
      expect(dialog.getByRole('button', { name: 'Reopen with this end date' })).toBeDisabled()
      await userEvent.click(dialog.getByRole('button', { name: 'Reopen with no end date' }))
      expect(openSurvey).toHaveBeenCalledWith({ closesAt: null })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('a public survey past its end date is published again with the choice', async () => {
      state.survey = survey({ status: 'CLOSED', targetKind: 'PUBLIC', shareToken: 'tok', closesAt: '2020-01-01T09:00:00.000Z' })
      render(<SurveyBuilderPage />)
      await userEvent.click(actions().getByRole('button', { name: /Reopen survey/ }))
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reopen with no end date' }))
      expect(publishSurvey).toHaveBeenCalledWith({ closesAt: null })
      expect(openSurvey).not.toHaveBeenCalled()
    })

    it('a closed survey whose end date is still ahead reopens straight away, keeping it', async () => {
      state.survey = survey({ status: 'CLOSED', closesAt: '2099-01-01T09:00:00.000Z' })
      render(<SurveyBuilderPage />)
      await userEvent.click(actions().getByRole('button', { name: /Reopen survey/ }))
      expect(openSurvey).toHaveBeenCalledWith({})
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('a closed one-off survey can still be reopened', () => {
    state.survey = survey({ status: 'CLOSED' })
    render(<SurveyBuilderPage />)
    expect(actions().getByRole('button', { name: /Reopen survey/ })).toBeInTheDocument()
  })

  it('a draft has no Close survey (an open survey does; a repeating one can stop repeating)', () => {
    const { unmount } = render(<SurveyBuilderPage />)
    expect(actions().queryByRole('button', { name: /Close survey/ })).not.toBeInTheDocument()
    unmount()

    state.survey = survey({ status: 'ACTIVE' })
    const active = render(<SurveyBuilderPage />)
    expect(actions().getByRole('button', { name: /Close survey/ })).toBeInTheDocument()
    active.unmount()

    state.survey = survey({ status: 'DRAFT', recurrence: 'MONTHLY', distributeAt: '2026-12-01T09:00:00.000Z' })
    render(<SurveyBuilderPage />)
    expect(actions().getByRole('button', { name: /Stop repeating/ })).toBeInTheDocument()
  })

  it('a survey started from a ready-made template shows its anonymity locked in Edit details', async () => {
    state.survey = survey({
      isAnonymous: true,
      libraryReference: 'SUR-STF-002',
      createdFromTemplateId: 't1',
      anonymityLocked: true,
    })
    render(<SurveyBuilderPage />)
    await userEvent.click(actions().getByRole('button', { name: /Edit details/ }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeDisabled()
    expect(dialog.getByRole('checkbox', { name: /Anonymous responses/ })).toBeChecked()
    expect(dialog.getByTestId('survey-details-anonymity-reason')).toHaveTextContent(
      'Set by the ready-made survey SUR-STF-002 — its introduction and privacy notice are written for anonymous answers.',
    )
  })

  it('a draft of the organisation’s own can still switch anonymity', async () => {
    render(<SurveyBuilderPage />)
    await userEvent.click(actions().getByRole('button', { name: /Edit details/ }))
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: /Anonymous responses/ })).toBeEnabled()
  })

  it('anonymity cannot be changed once the survey has been sent', async () => {
    state.survey = survey({ status: 'ACTIVE', isAnonymous: true, recipientCount: 5, settingsLocked: true })
    render(<SurveyBuilderPage />)
    await userEvent.click(actions().getByRole('button', { name: /Edit details/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('checkbox', { name: /Anonymous responses/ })).toBeDisabled()
  })

  it("Edit details can change who it's for (and the words for Other)", async () => {
    state.survey = survey({ audienceGroup: 'ALL_STAFF' })
    render(<SurveyBuilderPage />)
    await userEvent.click(actions().getByRole('button', { name: /Edit details/ }))
    const dialog = within(screen.getByRole('dialog'))
    const group = dialog.getByRole('combobox', { name: "Who it's for" })
    expect(group).toHaveValue('ALL_STAFF')
    await userEvent.selectOptions(group, 'OTHER')
    await userEvent.type(dialog.getByRole('textbox', { name: 'The group in your own words' }), 'Night carers')
    await userEvent.click(dialog.getByRole('button', { name: 'Save details' }))
    await waitFor(() => expect(updateSurvey).toHaveBeenCalled())
    expect(updateSurvey.mock.calls[0][0]).toMatchObject({ audienceGroup: 'OTHER', audienceGroupOther: 'Night carers' })
  })

  it('Edit details sets the message people see after submitting (empty clears it)', async () => {
    state.survey = survey({ closingMessage: 'Thank you. The right answers are in the handbook.' })
    render(<SurveyBuilderPage />)
    await userEvent.click(actions().getByRole('button', { name: /Edit details/ }))
    const dialog = within(screen.getByRole('dialog'))
    const box = dialog.getByRole('textbox', { name: 'Message after submitting' })
    expect(box).toHaveValue('Thank you. The right answers are in the handbook.')
    expect(box).toHaveAccessibleDescription(/Shown under the thank-you once someone submits/)
    await userEvent.clear(box)
    await userEvent.click(dialog.getByRole('button', { name: 'Save details' }))
    await waitFor(() => expect(updateSurvey).toHaveBeenCalled())
    expect(updateSurvey.mock.calls[0][0]).toMatchObject({ closingMessage: null })
  })

  describe('Edit details: let people choose to answer without their name', () => {
    const openDetails = async () => {
      render(<SurveyBuilderPage />)
      await userEvent.click(actions().getByRole('button', { name: /Edit details/ }))
      return within(screen.getByRole('dialog'))
    }
    const choice = (dialog: ReturnType<typeof within>) =>
      dialog.getByRole('checkbox', { name: 'Let people choose to answer without their name' })

    it('a named survey can turn it on, and it is saved', async () => {
      const dialog = await openDetails()
      expect(choice(dialog)).not.toBeChecked()
      expect(choice(dialog)).toBeEnabled()
      await userEvent.click(choice(dialog))
      await userEvent.click(dialog.getByRole('button', { name: 'Save details' }))
      await waitFor(() => expect(updateSurvey).toHaveBeenCalled())
      expect(updateSurvey.mock.calls[0][0]).toMatchObject({ isAnonymous: false, allowAnonymousResponses: true })
    })

    it('is not offered on an anonymous survey (every answer is anonymous already)', async () => {
      const dialog = await openDetails()
      await userEvent.click(dialog.getByRole('checkbox', { name: /Anonymous responses/ }))
      expect(dialog.queryByTestId('survey-details-allow-without-name')).not.toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Save details' }))
      await waitFor(() => expect(updateSurvey).toHaveBeenCalled())
      expect(updateSurvey.mock.calls[0][0]).not.toHaveProperty('allowAnonymousResponses')
    })

    it('cannot be turned off when the ready-made survey promises it', async () => {
      state.survey = survey({
        targetKind: 'SERVICE_USER',
        libraryReference: 'SUR-PWS-003',
        anonymityLocked: true,
        allowAnonymousResponses: true,
        anonymousChoiceFixed: 'library',
      })
      const dialog = await openDetails()
      expect(choice(dialog)).toBeChecked()
      expect(choice(dialog)).toBeDisabled()
      expect(dialog.getByTestId('survey-details-allow-without-name-help')).toHaveTextContent(
        'Set by the ready-made survey SUR-PWS-003 — its privacy notice tells people they can answer without their name.',
      )
      expect(screen.getByText(/Name optional/)).toBeInTheDocument()
    })

    it('cannot be turned off once people were offered it, but can still be turned on after sending', async () => {
      state.survey = survey({
        status: 'ACTIVE',
        recipientCount: 4,
        settingsLocked: true,
        allowAnonymousResponses: true,
        anonymousChoiceFixed: 'sent',
      })
      const fixed = await openDetails()
      expect(choice(fixed)).toBeDisabled()
      expect(fixed.getByTestId('survey-details-allow-without-name-help')).toHaveTextContent(/cannot be turned off/)
    })

    it('a sent named survey without it can still turn it on', async () => {
      state.survey = survey({ status: 'ACTIVE', recipientCount: 4, settingsLocked: true })
      const dialog = await openDetails()
      expect(choice(dialog)).toBeEnabled()
      await userEvent.click(choice(dialog))
      await userEvent.click(dialog.getByRole('button', { name: 'Save details' }))
      await waitFor(() => expect(updateSurvey).toHaveBeenCalled())
      expect(updateSurvey.mock.calls[0][0]).toMatchObject({ allowAnonymousResponses: true })
      expect(updateSurvey.mock.calls[0][0]).not.toHaveProperty('isAnonymous')
    })
  })

  describe('shared company template for a branch user (read only)', () => {
    beforeEach(() => {
      state.survey = survey({ isTemplate: true, locationIds: [], roleIds: [], readOnly: true })
    })

    it('can be viewed and used, but not edited', () => {
      render(<SurveyBuilderPage />)
      expect(screen.getByText('Shared company template — read only')).toBeInTheDocument()
      expect(actions().getByRole('button', { name: /Use this template/ })).toBeInTheDocument()
      expect(actions().queryByRole('button', { name: /Edit details/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Remove question 1' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Add question/ })).not.toBeInTheDocument()
      expect(screen.queryByText('Add question')).not.toBeInTheDocument()
      expect(screen.getByText('Do you feel supported?', { exact: false })).toBeInTheDocument()
    })

    it('an editable template keeps its edit controls', () => {
      state.survey = survey({ isTemplate: true, readOnly: false })
      render(<SurveyBuilderPage />)
      expect(actions().getByRole('button', { name: /Edit details/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add question/ })).toBeInTheDocument()
    })
  })

  describe('details dialog dates', () => {
    const openDetails = async () => {
      render(<SurveyBuilderPage />)
      await userEvent.click(actions().getByRole('button', { name: /Edit details/ }))
      return screen.getByRole('dialog')
    }

    it('a repeating survey has no Start / End of its own', async () => {
      state.survey = survey({ recurrence: 'MONTHLY', distributeAt: '2026-12-01T09:00:00.000Z' })
      const dialog = await openDetails()
      expect(within(dialog).queryByText('Start')).not.toBeInTheDocument()
      expect(within(dialog).queryByText('End')).not.toBeInTheDocument()
      expect(within(dialog).getByText('Keep each period open for (days)')).toBeInTheDocument()
      expect(within(dialog).getByText(/no start or end of its own/)).toBeInTheDocument()
    })

    it('a stopped repeating survey (periods, no repeat) has none either', async () => {
      state.survey = survey({ status: 'CLOSED', periodCount: 2 })
      const dialog = await openDetails()
      expect(within(dialog).queryByText('Start')).not.toBeInTheDocument()
    })

    it('a one-off survey and a single period keep Start / End', async () => {
      state.survey = survey()
      const dialog = await openDetails()
      expect(within(dialog).getByText('Start')).toBeInTheDocument()
      expect(within(dialog).getByText('End')).toBeInTheDocument()
    })

    it('a period of a repeating survey keeps Start / End', async () => {
      state.survey = survey({ clonedFromId: 'src', clonedFromTitle: 'Monthly check-in', status: 'ACTIVE' })
      const dialog = await openDetails()
      expect(within(dialog).getByText('Start')).toBeInTheDocument()
    })
  })

  describe('ready-made surveys', () => {
    const q = (id: string, text: string, sectionTitle: string | null, sortOrder: number) => ({
      id,
      questionText: text,
      helpText: null,
      questionType: 'YES_NO' as const,
      options: null,
      config: null,
      isRequired: true,
      sortOrder,
      sectionTitle,
      answerCount: 0,
    })

    it('shows each section heading once, before its first question', () => {
      state.survey = survey({
        questions: [
          q('q1', 'Do carers arrive on time?', 'Your visits', 0),
          q('q2', 'Do carers stay the full time?', 'Your visits', 1),
          q('q3', 'Do you feel listened to?', 'Your say', 2),
        ],
      })
      render(<SurveyBuilderPage />)
      expect(screen.getAllByTestId('survey-section-heading').map(h => h.textContent)).toEqual(['Your visits', 'Your say'])
    })

    it('section manager: introductions, "No section", a split warning, and "Add question here" at the end of the section', async () => {
      state.survey = survey({
        questions: [
          q('q1', 'Do carers arrive on time?', 'Your visits', 0),
          q('q2', 'Do carers stay the full time?', 'Your visits', 1),
          q('q3', 'Anything else?', null as unknown as string, 2),
        ],
        sectionIntros: { 'Your visits': 'About your care workers’ visits.' },
        splitSections: ['Your say'],
      })
      render(<SurveyBuilderPage />)
      expect(screen.getByTestId('survey-section-intro')).toHaveTextContent('About your care workers’ visits.')
      expect(screen.getByTestId('survey-no-section')).toBeInTheDocument()
      expect(screen.getByTestId('split-sections-warning')).toHaveTextContent('Your say')
      await userEvent.click(screen.getByRole('button', { name: 'Add question here: Your visits' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'Are they kind?')
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      await waitFor(() => expect(addQuestion).toHaveBeenCalledTimes(1))
      expect(addQuestion.mock.calls[0]![0]).toMatchObject({ afterQuestionId: 'q2', sectionTitle: 'Your visits' })
      expect(addQuestion.mock.calls[0]![0]).not.toHaveProperty('sortOrder')
    })

    it('an adopted template names its library reference and checks for updates', () => {
      state.survey = survey({
        isTemplate: true,
        locationIds: [],
        libraryReference: 'SUR-PWS-001',
        libraryRevision: 1,
        librarySourceId: 'lib-1',
      })
      render(<SurveyBuilderPage />)
      expect(screen.getByText(/Ready-made SUR-PWS-001/)).toBeInTheDocument()
      expect(screen.getByTestId('library-next-step')).toHaveTextContent(
        'From the ready-made library (SUR-PWS-001, revision 1). Next: check the wording, then use “Use this template” to start a survey.',
      )
      expect(screen.getByTestId('library-update-banner')).toHaveTextContent('s1:true')
    })

    it('other surveys and templates do not check for library updates', () => {
      state.survey = survey({ isTemplate: true })
      render(<SurveyBuilderPage />)
      expect(screen.queryByTestId('library-update-banner')).not.toBeInTheDocument()
      expect(screen.queryByTestId('library-next-step')).not.toBeInTheDocument()
    })

    it('a question keeps its section heading when edited', async () => {
      state.survey = survey({ questions: [q('q1', 'Do carers arrive on time?', 'Your visits', 0)] })
      render(<SurveyBuilderPage />)
      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      expect(within(screen.getByRole('dialog')).getByRole('combobox', { name: 'Section' })).toHaveTextContent('Your visits')
    })
  })
})
