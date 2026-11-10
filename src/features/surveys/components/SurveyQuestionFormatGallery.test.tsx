import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SurveyQuestionFormatDialog, SurveyQuestionFormatGallery } from '@/features/surveys/components/SurveyQuestionFormatGallery'
import { SurveyQuestionEditor } from '@/features/surveys/components/SurveyQuestionEditor'
import { answerRows, draftExclusive, draftNotCounted, draftOptions, emptyDraft } from '@/features/surveys/survey-question-draft'
import {
  CONTACT_ME_TEXT,
  QUESTION_FORMATS,
  applyFormat,
  formatAudienceOf,
  formatReplacesTyped,
} from '@/features/surveys/survey-question-formats'
import type { SurveyQuestion } from '@/features/surveys/types'

const format = (key: string) => QUESTION_FORMATS.find(f => f.key === key)!
const apply = (key: string, draft = emptyDraft(), earlier: SurveyQuestion[] = [], replaceTyped = true) =>
  applyFormat(draft, format(key), { audience: 'person', replaceTyped, earlier })

describe('question formats', () => {
  it('has every format the user asked for, grouped', () => {
    // 20 asked for, plus answers from a CareFlow list (ethnic group and other equality questions).
    expect(QUESTION_FORMATS.map(f => [f.group, f.name])).toHaveLength(21)
    expect(new Set(QUESTION_FORMATS.map(f => f.group))).toEqual(new Set(['Choices', 'Scales and scores', 'Written answers', 'Follow-ups']))
  })

  it.each([
    ['yes-no', 'YES_NO', {}],
    ['yes-no-comment', 'YES_NO', { commentEnabled: true, commentWhen: 'SOME', commentShowWhen: ['No'] }],
    ['one', 'SINGLE_SELECT', { otherEnabled: false, commentEnabled: false }],
    ['one-other', 'SINGLE_SELECT', { otherEnabled: true }],
    ['one-comment', 'SINGLE_SELECT', { commentEnabled: true, commentWhen: 'SOME', commentShowWhen: ['Poor', 'Very poor'] }],
    ['several', 'MULTI_SELECT', { otherEnabled: false }],
    ['several-other', 'MULTI_SELECT', { otherEnabled: true }],
    ['several-none', 'MULTI_SELECT', { otherEnabled: true }],
    ['careflow-list', 'SINGLE_SELECT', { optionsFrom: 'ETHNICITY', otherEnabled: false }],
    ['agree', 'LIKERT', {}],
    ['often', 'LIKERT', {}],
    ['overall', 'SINGLE_SELECT', {}],
    ['satisfaction', 'LIKERT', {}],
    ['scale-comment', 'LIKERT', { commentEnabled: true, commentShowWhen: ['Rarely', 'Never'] }],
    ['score-5', 'RATING', { ratingMin: '1', ratingMax: '5' }],
    ['score-10', 'RATING', { ratingMin: '0', ratingMax: '10' }],
    ['number', 'NUMBER', {}],
    ['short-text', 'TEXT', {}],
    ['long-text', 'TEXTAREA', {}],
    ['contact-me', 'YES_NO', { questionText: CONTACT_ME_TEXT }],
  ])('%s applies its type and settings', (key, type, settings) => {
    const { draft } = apply(key)
    expect(draft.questionType).toBe(type)
    expect(draft).toMatchObject(settings)
  })

  it('applies example answers with their marks: “None of these” clears the others, “Don’t know” not counted', () => {
    expect(draftExclusive(apply('several-none').draft)).toEqual(['None of these'])
    expect(draftNotCounted(apply('overall').draft)).toEqual(["Don't know"])
    expect(apply('satisfaction').draft.scale.map(r => r.text)).toEqual([
      'Very satisfied',
      'Satisfied',
      'Neither satisfied nor dissatisfied',
      'Dissatisfied',
      'Very dissatisfied',
    ])
  })

  it('keeps the question and help text typed; contact me sets its own text only when there is none (or on replace)', () => {
    const typed = { ...emptyDraft(), questionText: 'How do you travel?', helpText: 'Think about this week' }
    expect(apply('one-other', typed).draft).toMatchObject({ questionText: 'How do you travel?', helpText: 'Think about this week' })
    expect(formatReplacesTyped(typed, format('contact-me'), 'person')).toBe(true)
    expect(apply('contact-me', typed, [], false).draft.questionText).toBe('How do you travel?')
    expect(apply('contact-me', typed, [], true).draft.questionText).toBe(CONTACT_ME_TEXT)
  })

  it('asks before replacing typed answers; keeping them only adds what the format needs', () => {
    const typed = { ...emptyDraft(), questionType: 'MULTI_SELECT' as const, options: answerRows(['Car', 'Bus']) }
    expect(formatReplacesTyped(typed, format('several-none'), 'person')).toBe(true)
    // An example's own answers are not "typed": switching between formats asks nothing.
    expect(formatReplacesTyped(apply('several').draft, format('several-none'), 'person')).toBe(false)
    const kept = apply('several-none', typed, [], false).draft
    expect(draftOptions(kept)).toEqual(['Car', 'Bus', 'None of these'])
    expect(draftExclusive(kept)).toEqual(['None of these'])
    expect(draftOptions(apply('several-none', typed, [], true).draft)).not.toContain('Car')
  })

  it('a follow-up is asked after the last earlier yes / no question, after Yes', () => {
    const earlier = [
      { id: 'a', key: 'q-a', questionText: 'How often?', questionType: 'LIKERT', options: null, config: null, isRequired: true, sortOrder: 0 },
      { id: 'b', key: 'q-late', questionText: 'Has a care worker been late?', questionType: 'YES_NO', options: null, config: null, isRequired: true, sortOrder: 1 },
    ] as SurveyQuestion[]
    const { draft, followUpOn } = apply('follow-up', emptyDraft(), earlier)
    expect(followUpOn?.id).toBe('b')
    expect(draft).toMatchObject({ questionType: 'SINGLE_SELECT', showIfKey: 'q-late', showIfAnswers: ['Yes'] })
    expect(apply('follow-up').followUpOn).toBeNull()
  })

  it('a format other than follow-up keeps the question’s “When it is asked” rule', () => {
    const draft = { ...emptyDraft(), questionText: 'Why not?', questionType: 'TEXT' as const, showIfKey: 'q-late', showIfAnswers: ['Yes'] }
    expect(apply('several', draft).draft).toMatchObject({ questionType: 'MULTI_SELECT', showIfKey: 'q-late', showIfAnswers: ['Yes'] })
  })

  it('examples suit the survey’s audience', () => {
    expect(formatAudienceOf('EMPLOYEE')).toBe('staff')
    expect(formatAudienceOf('SERVICE_USER')).toBe('person')
    expect(format('yes-no').example('person').questionText).toBe('Did your care worker wear gloves and an apron?')
    expect(format('yes-no').example('staff').questionText).toMatch(/gloves and aprons you needed/)
  })
})

describe('SurveyQuestionFormatGallery', () => {
  it('is one radio group: arrow keys move, Enter uses the chosen format; examples are inert until “Try it”', async () => {
    const onUse = vi.fn()
    render(<SurveyQuestionFormatGallery audience="person" onUse={onUse} />)
    const group = screen.getByRole('radiogroup', { name: 'Choose a format' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.filter(r => r.getAttribute('tabindex') === '0')).toHaveLength(1)
    radios[0]!.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Yes or no, with a comment if no' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Yes or no, with a comment if no' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{Enter}')
    expect(onUse).toHaveBeenCalledWith(expect.objectContaining({ key: 'yes-no-comment' }))

    const example = screen.getByTestId('format-one-other-example')
    expect(example).toHaveAttribute('inert')
    await userEvent.click(screen.getByRole('button', { name: /Try it \(One answer, with “Other/ }))
    expect(example).not.toHaveAttribute('inert')
    await userEvent.click(within(example).getByRole('radio', { name: 'Other (please tell us)' }))
    expect(within(example).getByText('Please tell us')).toBeInTheDocument()
  })

  it('anonymous survey: Contact me cannot be chosen, with the reason', () => {
    render(<SurveyQuestionFormatGallery audience="person" anonymous onUse={vi.fn()} />)
    const contact = screen.getByRole('radio', { name: 'Contact me' })
    expect(contact).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByTestId('format-contact-me')).toHaveTextContent(/This survey is anonymous, so nobody could be contacted/)
  })

  it('a follow-up shows the pair: the follow-up appears after Yes', async () => {
    render(<SurveyQuestionFormatGallery audience="person" onUse={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Try it \(Follow-up/ }))
    const example = screen.getByTestId('format-follow-up-example')
    expect(within(example).queryByText('How often has this happened?')).not.toBeInTheDocument()
    await userEvent.click(within(example).getByRole('radio', { name: 'Yes' }))
    expect(within(example).getByText('How often has this happened?')).toBeInTheDocument()
  })
})

describe('the question editor: See example questions', () => {
  const editor = (initial = emptyDraft()) => {
    const onSave = vi.fn()
    render(
      <SurveyQuestionEditor
        open
        onOpenChange={() => undefined}
        initial={initial}
        earlier={[]}
        dependents={[]}
        sections={[]}
        targetKind="EMPLOYEE"
        onSave={onSave}
      />,
    )
    return onSave
  }

  it('opens the examples in their own dialog; a format fills the draft and the editor is as before', async () => {
    editor()
    // The editor opens on its usual steps (the gallery is never shown first).
    expect(screen.queryByTestId('format-gallery')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Yes / No' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'See example questions' }))
    const dialog = within(screen.getByTestId('format-dialog'))
    // Staff survey: staff examples.
    expect(dialog.getByTestId('format-yes-no')).toHaveTextContent(/gloves and aprons you needed/)
    await userEvent.click(dialog.getByRole('radio', { name: 'Several answers, with “None of these”' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Use this format' }))
    expect(screen.queryByTestId('format-dialog')).not.toBeInTheDocument()
    const editorDialog = within(screen.getByTestId('question-editor'))
    expect(editorDialog.getByRole('radio', { name: 'Several answers' })).toHaveAttribute('aria-checked', 'true')
    expect(editorDialog.getByRole('switch', { name: 'None of these: clears the others' })).toHaveAttribute('aria-checked', 'true')
    expect(editorDialog.getByTestId('other-label')).toBeInTheDocument()
  })

  it('asks before replacing answers the person typed', async () => {
    editor({ ...emptyDraft(), questionText: 'How do you travel?', questionType: 'SINGLE_SELECT', options: answerRows(['Car', 'Bus']) })
    await userEvent.click(screen.getByRole('button', { name: 'See example questions' }))
    const dialog = within(screen.getByTestId('format-dialog'))
    await userEvent.click(dialog.getByRole('radio', { name: 'One answer, with “Other (please tell us)”' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Use this format' }))
    expect(dialog.getByTestId('format-replace-confirm')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Keep mine' }))
    const editorDialog = within(screen.getByTestId('question-editor'))
    expect(editorDialog.getByRole('textbox', { name: 'Answer 1' })).toHaveValue('Car')
    expect(editorDialog.getByTestId('other-label')).toBeInTheDocument()
    expect(editorDialog.getByPlaceholderText(/How supported do you feel/)).toHaveValue('How do you travel?')
  })

  it('a question others depend on stays always asked when a follow-up format is chosen, and says why', async () => {
    const onSave = vi.fn()
    const lead = { id: 'q1', key: 'q-late', questionText: 'Has a care worker been late?', questionType: 'YES_NO', options: null, config: null, isRequired: true, sortOrder: 0 } as SurveyQuestion
    const dependent = { id: 'q3', key: 'q-why', questionText: 'Why?', questionType: 'TEXT', options: null, config: null, isRequired: false, sortOrder: 2, showIf: { questionKey: 'q-2', answers: ['Yes'] } } as SurveyQuestion
    render(
      <SurveyQuestionEditor
        open
        onOpenChange={() => undefined}
        initial={{ ...emptyDraft(), questionText: 'Did you need help?' }}
        editing={{ number: 2, total: 3 }}
        earlier={[lead]}
        dependents={[dependent]}
        sections={[]}
        onSave={onSave}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'See example questions' }))
    const dialog = within(screen.getByTestId('format-dialog'))
    await userEvent.click(dialog.getByRole('radio', { name: 'Follow-up after a certain answer' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Use this format' }))
    const editorDialog = within(screen.getByTestId('question-editor'))
    expect(editorDialog.getByTestId('format-note')).toHaveTextContent(/stays always asked/)
    expect(editorDialog.queryByTestId('show-if-question')).not.toBeInTheDocument()
  })

  it('is not offered on an answered (locked) question', () => {
    render(
      <SurveyQuestionEditor
        open
        onOpenChange={() => undefined}
        initial={{ ...emptyDraft(), questionText: 'Q' }}
        editing={{ number: 1, total: 1 }}
        locked
        earlier={[]}
        dependents={[]}
        sections={[]}
        onSave={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: 'See example questions' })).not.toBeInTheDocument()
  })
})

describe('SurveyQuestionFormatDialog', () => {
  it('a follow-up says which question it follows', async () => {
    const onApply = vi.fn()
    render(
      <SurveyQuestionFormatDialog
        open
        onOpenChange={() => undefined}
        draft={emptyDraft()}
        earlier={[{ id: 'b', key: 'q-late', questionText: 'Has a care worker been late?', questionType: 'YES_NO', options: null, config: null, isRequired: true, sortOrder: 0 }]}
        onApply={onApply}
      />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Follow-up after a certain answer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use this format' }))
    expect(onApply.mock.calls[0]![1]).toMatch(/asked only if “Has a care worker been late\?” is answered Yes/)
  })
})
