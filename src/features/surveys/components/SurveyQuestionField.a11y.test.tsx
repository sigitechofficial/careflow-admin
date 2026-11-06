import { describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'
import type { PublicSurveyForm, PublicSurveyQuestion, SurveyAnswerInput } from '@/features/surveys/types'

/** WCAG 2.2 AA: what a screen reader and a keyboard user get from each kind of question. */

const q = (over: Partial<PublicSurveyQuestion>): PublicSurveyQuestion => ({
  id: 'q1',
  questionText: 'How do you feel about your care?',
  helpText: null,
  questionType: 'SINGLE_SELECT',
  options: ['Good', 'Poor'],
  config: null,
  isRequired: false,
  sortOrder: 0,
  ...over,
})

function Controlled({ question, ...rest }: { question: PublicSurveyQuestion } & Partial<React.ComponentProps<typeof QuestionField>>) {
  const [value, setValue] = React.useState<SurveyAnswerInput | undefined>(undefined)
  return <QuestionField q={question} index={0} value={value} disabled={false} onChange={setValue} {...rest} />
}

describe('QuestionField accessibility', () => {
  it('a one-answer question is a group of radio buttons named by the question, with its help text', async () => {
    render(<Controlled question={q({ isRequired: true, helpText: 'Think about the last month.' })} />)
    const group = screen.getByRole('group', { name: 'How do you feel about your care? (required)' })
    expect(group.tagName).toBe('FIELDSET')
    expect(group).toHaveAccessibleDescription('Think about the last month.')
    const radios = within(group).getAllByRole('radio')
    expect(radios.map(r => r.getAttribute('name'))).toEqual([radios[0]!.getAttribute('name'), radios[0]!.getAttribute('name')])
    // Keyboard: Tab reaches the group, arrow keys choose.
    await userEvent.tab()
    expect(radios[0]).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(radios[1]).toHaveFocus()
    expect(radios[1]).toBeChecked()
    // The question is also a heading, for moving question by question.
    expect(screen.getByRole('heading', { level: 2, name: /How do you feel about your care\?/ })).toBeInTheDocument()
  })

  it('several answers are check boxes; Yes/No and scales are radio buttons', () => {
    render(
      <>
        <Controlled question={q({ id: 'm', questionText: 'Which help?', questionType: 'MULTI_SELECT', options: ['Washing', 'Meals'] })} />
        <Controlled question={q({ id: 'y', questionText: 'Were you asked?', questionType: 'YES_NO', options: null })} />
        <Controlled question={q({ id: 'l', questionText: 'Do carers listen?', questionType: 'LIKERT', options: null })} />
      </>,
    )
    expect(within(screen.getByRole('group', { name: 'Which help?' })).getAllByRole('checkbox')).toHaveLength(2)
    expect(within(screen.getByRole('group', { name: 'Were you asked?' })).getAllByRole('radio').map(r => r.closest('label')?.textContent)).toEqual(['Yes', 'No'])
    expect(within(screen.getByRole('group', { name: 'Do carers listen?' })).getAllByRole('radio').length).toBeGreaterThan(2)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('rating numbers are radio buttons named by their number, in a group named by the question', async () => {
    render(<Controlled question={q({ questionType: 'RATING', options: null, config: { min: 1, max: 5 } })} />)
    const group = screen.getByRole('group', { name: 'How do you feel about your care?' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map(r => r.getAttribute('value'))).toEqual(['1', '2', '3', '4', '5'])
    await userEvent.click(within(group).getByRole('radio', { name: '4' }))
    expect(within(group).getByRole('radio', { name: '4' })).toBeChecked()
  })

  it('text and number boxes are labelled by the question and described by the help text', () => {
    render(
      <>
        <Controlled question={q({ id: 't', questionText: 'Anything else?', questionType: 'TEXTAREA', options: null, helpText: 'Optional.' })} />
        <Controlled question={q({ id: 'n', questionText: 'How many visits?', questionType: 'NUMBER', options: null })} />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Anything else?' })).toHaveAccessibleDescription('Optional.')
    expect(screen.getByRole('spinbutton', { name: 'How many visits?' })).toBeInTheDocument()
  })

  it('an error is announced with the answers: aria-invalid and described by "Error: …"', () => {
    render(<Controlled question={q({ isRequired: true })} error="Answer this question" />)
    const group = screen.getByRole('group', { name: /How do you feel/ })
    expect(group).toHaveAccessibleDescription('Error: Answer this question')
    for (const radio of within(group).getAllByRole('radio')) expect(radio).toHaveAttribute('aria-invalid', 'true')
  })

  it('the Other text box is labelled, and its own error is tied to it', async () => {
    render(
      <Controlled
        question={q({ otherOption: { label: 'Other', textPrompt: 'Please tell us', textRequired: true } })}
        otherTextError="Tell us your “Other” answer"
      />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Other' }))
    const box = screen.getByRole('textbox', { name: 'Please tell us (required)' })
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveAccessibleDescription('Error: Tell us your “Other” answer')
  })

  it('anonymous: the "do not include names" reminder is read with the box', async () => {
    render(<Controlled question={q({ commentConfig: { prompt: 'Why?', showWhen: null } })} anonymous />)
    await userEvent.click(screen.getByRole('radio', { name: 'Good' }))
    expect(screen.getByRole('textbox', { name: 'Why? (optional)' })).toHaveAccessibleDescription('Please do not include names.')
  })
})

describe('SurveyRespondentForm accessibility', () => {
  const form = (over: Partial<PublicSurveyForm> = {}): PublicSurveyForm =>
    ({
      title: 'Your care',
      description: null,
      isAnonymous: false,
      canSubmit: true,
      askRespondent: true,
      questions: [
        q({ id: 'a', questionText: 'First', isRequired: true, sectionTitle: 'Your visits' }),
        q({ id: 'b', questionText: 'Second', sortOrder: 1, sectionTitle: 'Your visits' }),
      ],
      ...over,
    }) as PublicSurveyForm

  it('keeps a heading outline: title h1, sections h2, questions h3', () => {
    render(<SurveyRespondentForm data={form()} submitting={false} onSubmit={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Your care' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Your visits' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /^First/ })).toBeInTheDocument()
    expect(screen.getByTestId('required-note')).toHaveTextContent('Questions marked * with a star need an answer.')
  })

  it('"Who is answering" is a radio group, and the name box is labelled for autofill', async () => {
    render(<SurveyRespondentForm data={form()} submitting={false} onSubmit={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'Who is answering this survey? (required)' })
    await userEvent.click(within(group).getByRole('radio', { name: 'I am a family member answering for them' }))
    expect(screen.getByRole('textbox', { name: 'Your name (optional)' })).toHaveAttribute('autocomplete', 'name')
  })

  it('submits nothing while there are problems; sends the answers once they are put right', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SurveyRespondentForm data={form()} submitting={false} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(screen.getByRole('group', { name: /^First/ })).toHaveAccessibleDescription('Error: Answer this question')
    await userEvent.click(screen.getByRole('radio', { name: 'I am the service user' }))
    await userEvent.click(within(screen.getByRole('group', { name: /^First/ })).getByRole('radio', { name: 'Good' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(onSubmit).toHaveBeenCalledWith(
      {
        answers: [{ questionId: 'a', selectedOptions: ['Good'] }],
        respondentRelation: 'SELF',
        secondsTaken: expect.any(Number),
      },
      { language: null },
    )
  })
})
