import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SurveyLookupChoice } from '@/features/surveys/components/SurveyLookupChoice'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'
import { draftToInput, emptyDraft, questionDraftError } from '@/features/surveys/survey-question-draft'
import type { PublicSurveyQuestion } from '@/features/surveys/types'

const groups = [
  { group: 'Arab', options: [{ code: 'ARAB', label: 'Arab' }] },
  {
    group: 'Asian',
    options: [
      { code: 'ASIAN_GUJARATI', label: 'Asian - Gujarati' },
      { code: 'ASIAN_PUNJABI', label: 'Asian - Punjabi' },
    ],
  },
]

describe('SurveyLookupChoice (a CareFlow list such as ethnicity)', () => {
  it('shows entries under their group headings and narrows them by search', () => {
    render(<SurveyLookupChoice questionId="q" questionText="What is your ethnic group?" groups={groups} multiple={false} selected={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Arab' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Asian' })).getAllByRole('radio')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Search the list'), { target: { value: 'punj' } })
    expect(screen.getByText('1 answer matches')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Arab' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Asian - Punjabi' })).toBeInTheDocument()
  })

  it('chooses one entry (or several on a multiple-choice question)', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <SurveyLookupChoice questionId="q" questionText="Q" groups={groups} multiple={false} selected={[]} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Asian - Gujarati' }))
    expect(onChange).toHaveBeenLastCalledWith(['Asian - Gujarati'])
    rerender(<SurveyLookupChoice questionId="q" questionText="Q" groups={groups} multiple selected={['Arab']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Asian - Punjabi' }))
    expect(onChange).toHaveBeenLastCalledWith(['Arab', 'Asian - Punjabi'])
  })

  it('is used by the answer form for a question with a CareFlow list', () => {
    const q = {
      id: 'q-eth',
      questionText: 'What is your ethnic group?',
      helpText: null,
      questionType: 'SINGLE_SELECT',
      options: ['Arab', 'Asian - Gujarati', 'Asian - Punjabi'],
      config: null,
      isRequired: false,
      sortOrder: 0,
      optionsFrom: 'ETHNICITY',
      optionGroups: groups,
    } as unknown as PublicSurveyQuestion
    render(<QuestionField q={q} index={0} value={undefined} disabled={false} onChange={vi.fn()} />)
    expect(screen.getByTestId('lookup-choice-q-eth')).toBeInTheDocument()
  })

  it('a question taking its answers from a list sends the list, not answers of its own', () => {
    const draft = { ...emptyDraft(''), questionText: 'What is your ethnic group?', questionType: 'SINGLE_SELECT' as const, optionsFrom: 'ETHNICITY', otherEnabled: true }
    expect(questionDraftError(draft)).toBeNull()
    expect(draftToInput(draft)).toMatchObject({ optionsFrom: 'ETHNICITY', options: null, otherOption: null, exclusiveOptions: null })
  })
})
