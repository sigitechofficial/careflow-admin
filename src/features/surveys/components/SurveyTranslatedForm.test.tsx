import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PublicSurveyForm } from '@/features/surveys/types'
import { SurveyRespondentForm } from '@/features/surveys/components/SurveyRespondentForm'
import { translateSurveyForm } from '@/features/surveys/survey-translate'

const form = (over: Partial<PublicSurveyForm> = {}): PublicSurveyForm =>
  ({
    title: 'Your care',
    description: 'Tell us how it is going.',
    isAnonymous: false,
    status: 'ACTIVE',
    opensAt: null,
    closesAt: null,
    alreadyCompleted: false,
    canSubmit: true,
    unavailableReason: null,
    sectionIntros: { 'Your visits': 'About your visits.' },
    questions: [
      {
        id: 'q1',
        questionText: 'Are your carers on time?',
        helpText: null,
        questionType: 'SINGLE_SELECT',
        options: ['Always', 'Never'],
        config: null,
        isRequired: true,
        sortOrder: 0,
        sectionTitle: 'Your visits',
        otherOption: { label: 'Other', textPrompt: 'Please tell us', textRequired: false },
      },
      { id: 'q2', questionText: 'Do you feel safe?', helpText: null, questionType: 'YES_NO', options: null, config: null, isRequired: false, sortOrder: 1 },
    ],
    languages: [
      { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
    ],
    translations: {
      pl: {
        title: 'Twoja opieka',
        'section:Your visits:title': 'Twoje wizyty',
        'section:Your visits:intro': 'O twoich wizytach.',
        'q:q1:text': 'Czy opiekunowie są na czas?',
        'q:q1:option:Always': 'Zawsze',
        'q:q1:option:Never': 'Nigdy',
        'q:q1:otherLabel': 'Inne',
        'ui:submit': 'Wyślij odpowiedź',
        'ui:yes': 'Tak',
        'ui:no': 'Nie',
      },
      ur: { title: 'آپ کی دیکھ بھال' },
    },
    ...over,
  }) as PublicSurveyForm

beforeEach(() => {
  window.localStorage.clear()
})

describe('a survey in another language', () => {
  it('translates what people read and leaves anything untranslated in English', () => {
    const shown = translateSurveyForm(form(), 'pl')
    expect(shown.title).toBe('Twoja opieka')
    expect(shown.description).toBe('Tell us how it is going.')
    expect(shown.sectionIntros).toEqual({ 'Twoje wizyty': 'O twoich wizytach.' })
    expect(shown.questions[0]).toMatchObject({
      questionText: 'Czy opiekunowie są na czas?',
      sectionTitle: 'Twoje wizyty',
      options: ['Always', 'Never'],
      optionLabels: { Always: 'Zawsze', Never: 'Nigdy', Other: 'Inne' },
    })
    expect(shown.questions[1]!.questionText).toBe('Do you feel safe?')
    expect(translateSurveyForm(form(), null)).toEqual(form())
  })

  it('people choose a language; labels change but the English answer is what is sent', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SurveyRespondentForm data={form()} submitting={false} onSubmit={onSubmit} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Your care' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByTestId('survey-language'), 'pl')
    expect(screen.getByRole('heading', { level: 1, name: 'Twoja opieka' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Twoje wizyty' })).toBeInTheDocument()
    const q1 = screen.getByRole('group', { name: /^Czy opiekunowie/ })
    await userEvent.click(within(q1).getByRole('radio', { name: 'Zawsze' }))
    expect(within(screen.getByRole('group', { name: /^Do you feel safe/ })).getByRole('radio', { name: 'Tak' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Wyślij odpowiedź' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ answers: [{ questionId: 'q1', selectedOptions: ['Always'] }] }),
      { language: 'pl' },
    )
    expect(window.localStorage.getItem('careflow-survey-language')).toBe('pl')
  })

  it('a right-to-left language turns the page', async () => {
    render(<SurveyRespondentForm data={form()} submitting={false} onSubmit={vi.fn()} />)
    await userEvent.selectOptions(screen.getByTestId('survey-language'), 'ur')
    const page = screen.getByTestId('survey-page')
    expect(page).toHaveAttribute('dir', 'rtl')
    expect(page).toHaveAttribute('lang', 'ur')
  })

  it('no published language: no language choice', () => {
    render(<SurveyRespondentForm data={form({ languages: [], translations: {} })} submitting={false} onSubmit={vi.fn()} />)
    expect(screen.queryByTestId('survey-language')).not.toBeInTheDocument()
  })

  it('starts in the language chosen before on this device', () => {
    window.localStorage.setItem('careflow-survey-language', 'pl')
    render(<SurveyRespondentForm data={form()} submitting={false} onSubmit={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Twoja opieka' })).toBeInTheDocument()
  })
})

describe('display options', () => {
  it('bigger text, high contrast, an easier font and more spacing, kept on this device', async () => {
    render(<SurveyRespondentForm data={form({ languages: [] })} submitting={false} onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Display options' }))
    await userEvent.click(screen.getByRole('button', { name: '150%' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'High contrast' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'More space between lines' }))
    const page = screen.getByTestId('survey-page')
    expect(page.style.zoom).toBe('1.5')
    expect(page).toHaveClass('survey-high-contrast', 'survey-more-spacing')
    expect(screen.getByRole('button', { name: '150%' })).toHaveAttribute('aria-pressed', 'true')
    expect(JSON.parse(window.localStorage.getItem('careflow-survey-display')!)).toMatchObject({ size: 1.5, contrast: true, spacing: true })
  })
})
