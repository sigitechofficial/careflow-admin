import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BankQuestion, QuestionBankQuery } from '@/features/surveys/api/survey-library.api'

const { bank } = vi.hoisted(() => ({
  bank: { queries: [] as QuestionBankQuery[], items: [] as BankQuestion[] },
}))

vi.mock('@/features/surveys/api/survey-library.api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/surveys/api/survey-library.api')>()),
  useQuestionBank: (query: QuestionBankQuery) => {
    bank.queries.push(query)
    return {
      data: { items: bank.items, total: bank.items.length, page: 1, pageSize: 25, topics: ['Your visits', 'Anything else'] },
      isLoading: false,
      isError: false,
    }
  },
}))

import { SurveyQuestionBankDialog, bankAudienceForSurvey } from '@/features/surveys/components/SurveyQuestionBankDialog'
import { SurveyQuestionEditor } from '@/features/surveys/components/SurveyQuestionEditor'
import { emptyDraft } from '@/features/surveys/survey-question-draft'

// Radix Select needs these in jsdom.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
})

const bankQ = (over: Partial<BankQuestion> = {}): BankQuestion => ({
  id: 'b1',
  questionText: 'Do your care workers arrive on time?',
  helpText: 'On time means within half an hour.',
  questionType: 'SINGLE_SELECT',
  options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never', 'Does not apply to me'],
  config: { notCountedOptions: ['Does not apply to me'] },
  notCountedOptions: ['Does not apply to me'],
  isRequired: true,
  otherOption: null,
  exclusiveOptions: [],
  commentConfig: { prompt: 'Please tell us why', showWhen: ['Rarely', 'Never'] },
  topic: 'Your visits',
  contactRequest: false,
  askedOnlyIf: null,
  audiences: ['PWS', 'FAM'],
  sources: [
    { surveyId: 'lib-1', reference: 'SUR-PWS-003', title: 'Annual survey', group: 'People we support' },
    { surveyId: 'lib-2', reference: 'SUR-FAM-001', title: 'Family survey', group: 'Families' },
  ],
  ...over,
})

const contact = bankQ({
  id: 'b2',
  questionText: 'Would you like someone to contact you about your answers?',
  questionType: 'YES_NO',
  options: null,
  config: null,
  notCountedOptions: [],
  commentConfig: null,
  topic: 'Anything else',
  contactRequest: true,
  sources: [{ surveyId: 'lib-1', reference: 'SUR-PWS-003', title: 'Annual survey', group: 'People we support' }],
})
const callBack = bankQ({
  id: 'b3',
  questionText: 'What number should we call?',
  questionType: 'TEXT',
  options: null,
  config: null,
  notCountedOptions: [],
  commentConfig: null,
  topic: 'Anything else',
  askedOnlyIf: { questionText: 'Would you like someone to contact you about your answers?', answers: ['Yes'] },
  sources: [{ surveyId: 'lib-1', reference: 'SUR-PWS-003', title: 'Annual survey', group: 'People we support' }],
})

beforeEach(() => {
  bank.queries = []
  bank.items = [bankQ(), contact, callBack]
})

const last = () => bank.queries[bank.queries.length - 1]!

describe('SurveyQuestionBankDialog', () => {
  it('lists each question with its answers in short, where it comes from, and a preview', async () => {
    render(<SurveyQuestionBankDialog open onOpenChange={() => undefined} mode="multi" onUse={vi.fn()} />)
    const items = screen.getAllByTestId('bank-question')
    expect(items[0]).toHaveTextContent('Choose one: Always / Usually / Sometimes / Rarely / Never / Does not apply to me')
    expect(items[0]).toHaveTextContent('Used in 2 ready-made surveys · Your visits')
    expect(items[1]).toHaveTextContent('From SUR-PWS-003 Annual survey')
    expect(within(items[2]!).getByTestId('bank-asked-only-if')).toHaveTextContent(/That rule is not copied/)
    await userEvent.click(within(items[0]!).getByRole('button', { name: 'Preview' }))
    const preview = within(items[0]!).getByTestId('bank-preview')
    await userEvent.click(within(preview).getByRole('radio', { name: 'Never' }))
    expect(within(preview).getByText('Please tell us why (optional)')).toBeInTheDocument()
  })

  it('searches (after typing stops) and filters by who it is for, topic and answer type', async () => {
    render(<SurveyQuestionBankDialog open onOpenChange={() => undefined} mode="multi" onUse={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Search questions' }), 'late')
    await waitFor(() => expect(last().search).toBe('late'))
    await userEvent.click(within(screen.getByRole('group', { name: 'Who it is for' })).getByRole('button', { name: 'Families' }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Topic' })).getByRole('button', { name: 'Your visits' }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Answer type' })).getByRole('button', { name: 'Scale' }))
    expect(last()).toMatchObject({ search: 'late', audience: 'FAM', topic: 'Your visits', type: 'LIKERT', page: 1 })
    // Pressed again: the filter is off.
    await userEvent.click(within(screen.getByRole('group', { name: 'Answer type' })).getByRole('button', { name: 'Scale' }))
    expect(last().type).toBeUndefined()
  })

  it('adds several in the order chosen, into a chosen section', async () => {
    const onUse = vi.fn()
    render(<SurveyQuestionBankDialog open onOpenChange={() => undefined} mode="multi" sections={['Your say']} onUse={onUse} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /What number should we call/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /arrive on time/ }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Put them in' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Your say' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add 2 questions' }))
    expect(onUse.mock.calls[0]![0].map((q: BankQuestion) => q.id)).toEqual(['b3', 'b1'])
    expect(onUse.mock.calls[0]![1]).toBe('Your say')
  })

  it('starts filtered to the survey’s own audience, which can be removed', async () => {
    render(<SurveyQuestionBankDialog open onOpenChange={() => undefined} mode="multi" defaultAudience="STF" onUse={vi.fn()} />)
    expect(last().audience).toBe('STF')
    expect(within(screen.getByRole('group', { name: 'Who it is for' })).getByRole('button', { name: 'Staff' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('bank-audience-filter')).toHaveTextContent('Showing questions for Staff, like this survey.')
    await userEvent.click(screen.getByRole('button', { name: 'Show questions for everyone' }))
    expect(last().audience).toBeUndefined()
    expect(screen.queryByTestId('bank-audience-filter')).not.toBeInTheDocument()
  })

  it('maps a survey’s audience to its starting filter (public surveys start with everyone)', () => {
    expect([bankAudienceForSurvey('EMPLOYEE'), bankAudienceForSurvey('SERVICE_USER'), bankAudienceForSurvey('PUBLIC')]).toEqual([
      'STF',
      'PWS',
      null,
    ])
  })

  it('anonymous survey: the contact-me question cannot be chosen, and says why', () => {
    render(<SurveyQuestionBankDialog open onOpenChange={() => undefined} mode="multi" anonymous onUse={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: /contact you about your answers/ })).toBeDisabled()
    expect(screen.getByTestId('bank-contact-blocked')).toHaveTextContent(/Not for an anonymous survey/)
    expect(screen.getByRole('checkbox', { name: /arrive on time/ })).toBeEnabled()
  })
})

describe('the question editor: Choose from question bank', () => {
  const editor = (props: Partial<React.ComponentProps<typeof SurveyQuestionEditor>> = {}) => {
    const onSave = vi.fn()
    render(
      <SurveyQuestionEditor
        open
        onOpenChange={() => undefined}
        initial={emptyDraft()}
        earlier={[]}
        dependents={[]}
        sections={['Your visits']}
        onSave={onSave}
        {...props}
      />,
    )
    return onSave
  }

  it('fills the draft with the chosen question, which stays editable before saving', async () => {
    const onSave = editor()
    await userEvent.click(screen.getByRole('button', { name: 'Choose from question bank' }))
    const bankDialog = screen.getByTestId('question-bank')
    // One question: radio buttons, not tick boxes.
    expect(within(bankDialog).queryByRole('checkbox')).not.toBeInTheDocument()
    await userEvent.click(within(bankDialog).getByRole('radio', { name: /arrive on time/ }))
    await userEvent.click(within(bankDialog).getByRole('button', { name: 'Use this question' }))
    const dialog = within(screen.getByTestId('question-editor'))
    expect(dialog.getByPlaceholderText(/How supported do you feel/)).toHaveValue('Do your care workers arrive on time?')
    expect(dialog.getByRole('radio', { name: 'One answer' })).toHaveAttribute('aria-checked', 'true')
    expect(dialog.getByRole('switch', { name: 'Does not apply to me: not counted in percentages' })).toHaveAttribute('aria-checked', 'true')
    expect(dialog.getByRole('combobox', { name: 'Section' })).toHaveTextContent('Your visits')
    await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), ' (last month)')
    await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      questionText: 'Do your care workers arrive on time? (last month)',
      helpText: 'On time means within half an hour.',
      questionType: 'SINGLE_SELECT',
      commentEnabled: true,
      commentWhen: 'SOME',
      commentShowWhen: ['Rarely', 'Never'],
      showIfKey: '',
    })
  })

  it('never copies "Show only if", and says so', async () => {
    editor()
    await userEvent.click(screen.getByRole('button', { name: 'Choose from question bank' }))
    const bankDialog = screen.getByTestId('question-bank')
    await userEvent.click(within(bankDialog).getByRole('radio', { name: /What number should we call/ }))
    await userEvent.click(within(bankDialog).getByRole('button', { name: 'Use this question' }))
    expect(screen.getByTestId('bank-show-if-dropped')).toHaveTextContent(
      'asked only after an answer to “Would you like someone to contact you about your answers?”. That rule was not copied',
    )
  })

  it('is offered when adding only', () => {
    editor({ editing: { number: 1, total: 1 } })
    expect(screen.queryByRole('button', { name: 'Choose from question bank' })).not.toBeInTheDocument()
  })
})
