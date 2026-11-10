import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SurveyQuestionEditor } from '@/features/surveys/components/SurveyQuestionEditor'
import {
  answerRows,
  draftToInput,
  emptyDraft,
  questionDraftError,
  lockedDraftToInput,
  questionToDraft,
  rowProblems,
  type QuestionDraft,
} from '@/features/surveys/survey-question-draft'
import type { SurveyQuestion } from '@/features/surveys/types'

// Radix Select needs these in jsdom.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
})

const earlier: SurveyQuestion[] = [
  {
    id: 'q1',
    key: 'q-safe',
    questionText: 'Do you feel safe with your care workers?',
    helpText: null,
    questionType: 'YES_NO',
    options: null,
    config: null,
    isRequired: true,
    sortOrder: 0,
  },
]

function renderEditor(initial: QuestionDraft = emptyDraft(), props: Partial<React.ComponentProps<typeof SurveyQuestionEditor>> = {}) {
  const onSave = vi.fn()
  render(
    <SurveyQuestionEditor
      open
      onOpenChange={() => undefined}
      initial={initial}
      newNumber={2}
      earlier={earlier}
      dependents={[]}
      sections={['Your visits']}
      onSave={onSave}
      {...props}
    />,
  )
  return { dialog: within(screen.getByRole('dialog')), onSave }
}

const rowValues = (dialog: ReturnType<typeof within>, name = 'Answer') =>
  dialog.getAllByRole('textbox', { name: new RegExp(`^${name} \\d+$`) }).map(i => (i as HTMLInputElement).value)

describe('SurveyQuestionEditor', () => {
  it('has the five steps and a live preview, numbered as the new question', () => {
    const { dialog } = renderEditor()
    for (const id of ['step-question', 'step-type', 'step-words', 'step-when', 'step-section']) {
      expect(dialog.getByTestId(id)).toBeInTheDocument()
    }
    expect(dialog.getAllByRole('radio', { name: /.+/ }).filter(r => r.closest('[aria-label="How they answer"]')).map(r => r.textContent)).toEqual([
      'Yes / No',
      'One answer',
      'Several answers',
      'Scale',
      'Score',
      'Number',
      'Short text',
      'Long text',
    ])
    const preview = within(dialog.getByTestId('question-preview'))
    expect(preview.getByText('Your question')).toBeInTheDocument()
    expect(preview.getByText('2')).toBeInTheDocument()
  })

  it('the preview follows the draft as it is typed and answered', async () => {
    const { dialog } = renderEditor()
    await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'Which help do you get?')
    await userEvent.click(dialog.getByRole('radio', { name: 'One answer' }))
    await userEvent.type(dialog.getByRole('textbox', { name: 'Answer 1' }), 'Washing')
    await userEvent.type(dialog.getByRole('textbox', { name: 'Answer 2' }), 'Meals')
    await userEvent.click(dialog.getByTestId('other-enabled'))
    await userEvent.click(dialog.getByTestId('comment-enabled'))
    const preview = within(dialog.getByTestId('question-preview'))
    expect(preview.getByText('Which help do you get?')).toBeInTheDocument()
    await userEvent.click(preview.getByRole('radio', { name: 'Other (please tell us)' }))
    // Choosing Other shows its text box, and answering shows the comment box.
    expect(preview.getByText('Please tell us')).toBeInTheDocument()
    expect(preview.getByText('Please tell us why (optional)')).toBeInTheDocument()
  })

  describe('answer rows', () => {
    const choiceDraft = (options: string[]) => ({ ...emptyDraft(), questionText: 'Q', questionType: 'SINGLE_SELECT' as const, options: answerRows(options) })

    it('pasting several lines splits them into rows', () => {
      const { dialog } = renderEditor(choiceDraft(['', '']))
      fireEvent.paste(dialog.getByRole('textbox', { name: 'Answer 1' }), {
        clipboardData: { getData: () => 'Always\nUsually\n\nNever\n' },
      })
      expect(rowValues(dialog)).toEqual(['Always', 'Usually', 'Never', ''])
    })

    it('moves a row with the arrow keys on its handle, and removes one', async () => {
      const { dialog } = renderEditor(choiceDraft(['A', 'B', 'C']))
      dialog.getByRole('button', { name: /^Move Answer 3 \(C\)/ }).focus()
      await userEvent.keyboard('{ArrowUp}')
      expect(rowValues(dialog)).toEqual(['A', 'C', 'B'])
      // Focus stays on the moved row's handle.
      await userEvent.keyboard('{ArrowUp}')
      expect(rowValues(dialog)).toEqual(['C', 'A', 'B'])
      await userEvent.click(dialog.getByRole('button', { name: 'Remove Answer 2' }))
      expect(rowValues(dialog)).toEqual(['C', 'B'])
    })

    it('says where a moved row went, and keeps focus in the list when a row is removed', async () => {
      const { dialog } = renderEditor(choiceDraft(['A', 'B', 'C']))
      dialog.getByRole('button', { name: /^Move Answer 1 \(A\)/ }).focus()
      await userEvent.keyboard('{ArrowDown}')
      expect(dialog.getByText('“A” moved to position 2 of 3.')).toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Remove Answer 1' }))
      // The row that took its place has focus (not the page).
      expect(dialog.getByRole('textbox', { name: 'Answer 1' })).toHaveFocus()
      expect(rowValues(dialog)).toEqual(['A', 'C'])
    })

    it('a flagged row is described by its problem', () => {
      const { dialog } = renderEditor(choiceDraft(['Yes', 'yes']))
      const second = dialog.getByRole('textbox', { name: 'Answer 2' })
      expect(second).toHaveAccessibleDescription('Listed twice — each answer must be different.')
    })

    it('flags duplicates and gaps under the row, and blocks saving duplicates', () => {
      const { dialog } = renderEditor(choiceDraft(['Yes', '', 'yes']))
      const alerts = dialog.getAllByRole('alert').map(a => a.textContent)
      expect(alerts).toContain('Empty — type an answer or remove it.')
      expect(alerts).toContain('Listed twice — each answer must be different.')
      expect(dialog.getByTestId('question-error')).toHaveTextContent('“yes” is listed more than once.')
      expect(dialog.getByRole('button', { name: 'Add question' })).toBeDisabled()
    })

    it('"Use a standard set" fills the rows and marks Don’t know as not counted', async () => {
      const { dialog, onSave } = renderEditor(choiceDraft(['', '']))
      await userEvent.click(dialog.getByRole('combobox', { name: 'Use a standard set' }))
      await userEvent.click(await screen.findByRole('option', { name: /^Overall experience/ }))
      expect(rowValues(dialog)).toEqual(['Very good', 'Good', 'Neither good nor poor', 'Poor', 'Very poor', "Don't know"])
      expect(dialog.getByRole('switch', { name: "Don't know: not counted in percentages" })).toHaveAttribute('aria-checked', 'true')
      expect(dialog.getByRole('switch', { name: 'Good: not counted in percentages' })).toHaveAttribute('aria-checked', 'false')
      await userEvent.click(dialog.getByRole('button', { name: 'Add question' }))
      expect(draftToInput(onSave.mock.calls[0]![0]).config).toEqual({ notCountedOptions: ["Don't know"] })
    })
  })

  it('locked: shows why, and controls look read-only', () => {
    const q: SurveyQuestion = { ...earlier[0]!, id: 'q2', key: 'q-2', questionType: 'SINGLE_SELECT', options: ['Yes', 'No'] }
    const { dialog } = renderEditor(questionToDraft(q), { locked: true, editing: { number: 2, total: 2 } })
    expect(dialog.getByText('Edit question 2 of 2')).toBeInTheDocument()
    expect(dialog.getByTestId('question-locked')).toBeInTheDocument()
    expect(dialog.getByRole('textbox', { name: 'Answer 1' })).toHaveAttribute('readonly')
    expect(dialog.queryByRole('button', { name: 'Add answer' })).not.toBeInTheDocument()
    expect(dialog.getByTestId('other-enabled')).toBeDisabled()
    // The comment box can still change, and which answers are not counted.
    expect(dialog.getByTestId('comment-enabled')).toBeEnabled()
    expect(dialog.getByRole('switch', { name: 'No: not counted in percentages' })).toBeEnabled()
  })

  it('locked: changing the answers not counted is saved (it changes only the percentages)', async () => {
    const q: SurveyQuestion = { ...earlier[0]!, id: 'q2', key: 'q-2', questionType: 'SINGLE_SELECT', options: ['Yes', 'No', "Don't know"] }
    const { dialog, onSave } = renderEditor(questionToDraft(q), { locked: true, editing: { number: 2, total: 2 } })
    await userEvent.click(dialog.getByRole('switch', { name: "Don't know: not counted in percentages" }))
    await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
    expect(lockedDraftToInput(onSave.mock.calls[0]![0], q)).toEqual({
      helpText: null,
      sectionTitle: null,
      config: { notCountedOptions: ["Don't know"] },
    })
    // Unchanged: nothing about it is sent.
    expect(lockedDraftToInput(questionToDraft(q), q)).not.toHaveProperty('config')
  })

  it('locked: a comment box without a prompt is flagged and cannot be saved', async () => {
    const q: SurveyQuestion = { ...earlier[0]!, id: 'q2', key: 'q-2' }
    const { dialog, onSave } = renderEditor(questionToDraft(q), { locked: true, editing: { number: 2, total: 2 } })
    await userEvent.click(dialog.getByTestId('comment-enabled'))
    await userEvent.clear(dialog.getByTestId('comment-prompt'))
    expect(dialog.getByTestId('question-error')).toHaveTextContent('Give the comment box a prompt')
    expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('an anonymous survey cannot ask the contact-me question (nobody could be contacted)', async () => {
    const { dialog } = renderEditor(emptyDraft(), { anonymous: true })
    await userEvent.type(dialog.getByPlaceholderText(/How supported do you feel/), 'Would you like someone to contact you about your answers?')
    expect(dialog.getByTestId('question-error')).toHaveTextContent('This survey is anonymous, so nobody could be contacted')
    expect(dialog.getByRole('button', { name: 'Add question' })).toBeDisabled()
  })

  it('the question types work as a radio group: arrow keys pick the next one, one Tab stop', async () => {
    const { dialog } = renderEditor()
    const yesNo = dialog.getByRole('radio', { name: 'Yes / No' })
    expect(yesNo).toHaveAttribute('tabindex', '0')
    expect(dialog.getByRole('radio', { name: 'One answer' })).toHaveAttribute('tabindex', '-1')
    yesNo.focus()
    await userEvent.keyboard('{ArrowRight}')
    const one = dialog.getByRole('radio', { name: 'One answer' })
    expect(one).toHaveFocus()
    expect(one).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(dialog.getByRole('radio', { name: 'Long text' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('question drafts', () => {
  const base: SurveyQuestion = {
    id: 'q',
    key: 'q-x',
    questionText: 'Overall?',
    helpText: null,
    questionType: 'SINGLE_SELECT',
    options: ['Good', 'Poor', "Don't know"],
    config: { notCountedOptions: ["Don't know"] },
    isRequired: true,
    sortOrder: 0,
  }

  it('editing leaves an unchanged not-counted list out, sends a changed one, and null when cleared', () => {
    const draft = questionToDraft(base)
    expect(draftToInput(draft, base)).not.toHaveProperty('config')
    const marked = { ...draft, options: draft.options.map(r => ({ ...r, notCounted: r.text !== 'Good' })) }
    expect(draftToInput(marked, base).config).toEqual({ notCountedOptions: ['Poor', "Don't know"] })
    const cleared = { ...draft, options: draft.options.map(r => ({ ...r, notCounted: false })) }
    expect(draftToInput(cleared, base).config).toBeNull()
  })

  it('at least one answer must stay counted', () => {
    const draft = questionToDraft(base)
    const all = { ...draft, options: draft.options.map(r => ({ ...r, notCounted: true })) }
    expect(questionDraftError(all)).toBe('At least one answer must be counted in the percentages.')
  })

  it('empty rows at the end are not flagged (the next answer is typed there)', () => {
    expect(rowProblems(answerRows(['A', 'B', '', ''])).size).toBe(0)
  })
})
