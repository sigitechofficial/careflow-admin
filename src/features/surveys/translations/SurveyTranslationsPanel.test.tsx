import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SurveyTranslationsPanel, type TranslationDetail, type TranslationList } from './SurveyTranslationsPanel'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const languages = [
  { code: 'en-x-easyread', name: 'Easy read', nativeName: 'Easy read', dir: 'ltr' as const },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' as const },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' as const },
]
const list = (over: Partial<TranslationList> = {}): TranslationList => ({
  surveyId: 's1',
  editedOnSurveyId: null,
  languages,
  translations: [
    {
      ...languages[1]!,
      language: 'pl',
      status: 'DRAFT',
      publishedAt: null,
      updatedAt: '2026-11-07T10:00:00Z',
      progress: { total: 70, done: 60, outOfDate: 2, missing: 8 },
    },
  ],
  ...over,
})
const detail = (code: string): TranslationDetail => ({
  surveyId: 's1',
  language: languages.find(l => l.code === code)!,
  status: code === 'pl' ? 'DRAFT' : null,
  publishedAt: null,
  progress: { total: 3, done: 1, outOfDate: 1, missing: 1 },
  strings: [
    { key: 'title', where: 'Title', english: 'Your care', translation: 'Twoja opieka', outOfDate: false, translatedFrom: null },
    { key: 'q:q1:text', where: 'Question 1', english: 'Are carers on time?', translation: 'Stare', outOfDate: true, translatedFrom: 'Are carers late?' },
    { key: 'ui:submit', where: 'The page’s own wording', english: 'Submit response', translation: '', outOfDate: false, translatedFrom: null },
  ],
})

/** A fake API: the list, each language's texts, the pack; anything else answers with the language's texts. */
function routes(fail: { publish?: string } = {}) {
  apiJson.mockImplementation(async (...args: unknown[]) => {
    const url = String(args[0] ?? '')
    const init = (args[1] ?? {}) as RequestInit
    const method = init.method ?? 'GET'
    if (url.endsWith('/publish') && fail.publish) throw new Error(fail.publish)
    if (method === 'GET' && url.endsWith('/translations')) return { data: list() }
    const m = /\/translations\/([^/]+)(\/\w+)?$/.exec(url)
    const code = m ? decodeURIComponent(m[1]!) : 'pl'
    if (method === 'GET' && m?.[2] === '/pack') return { data: { filename: 'your-care-pl.csv', csv: 'key,where,english,translation' } }
    return { data: detail(code) }
  })
}

beforeEach(() => apiJson.mockReset())

describe('Other languages and easy read', () => {
  it('lists each language with how much is done, and offers to publish a draft', async () => {
    routes()
    wrap(<SurveyTranslationsPanel surveyId="s1" canEdit />)
    expect(await screen.findByText('Polish')).toBeInTheDocument()
    expect(screen.getByText('60 of 70 translated · 2 out of date')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Offer to people' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/translations/pl/publish', { method: 'POST' }))
  })

  it('adds a language: only ones not yet started are offered', async () => {
    routes()
    wrap(<SurveyTranslationsPanel surveyId="s1" canEdit />)
    const select = await screen.findByLabelText('Add a language')
    expect(within(select).queryByRole('option', { name: 'Polish' })).not.toBeInTheDocument()
    await userEvent.selectOptions(select, 'ur')
    await userEvent.click(screen.getByRole('button', { name: 'Start translating' }))
    expect(await screen.findByRole('dialog', { name: 'Urdu translation' })).toBeInTheDocument()
    // Right-to-left text boxes for a right-to-left language.
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('dir', 'rtl')
  })

  it('the editor: English beside the translation, out-of-date marked, saves only what changed', async () => {
    routes()
    wrap(<SurveyTranslationsPanel surveyId="s1" canEdit />)
    await userEvent.click(await screen.findByRole('button', { name: 'Translate' }))
    const editor = await screen.findByTestId('translation-editor')
    expect(within(editor).getByText(/Out of date: translated from “Are carers late\?”/)).toBeInTheDocument()
    expect(within(editor).getByText(/falls back to English if left blank/)).toBeInTheDocument()
    const box = within(editor).getByRole('textbox', { name: /Polish for: Are carers on time\?/ })
    await userEvent.clear(box)
    await userEvent.type(box, 'Czy są na czas?')
    await userEvent.click(screen.getByRole('button', { name: 'Save (1)' }))
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/surveys/s1/translations/pl', {
        method: 'PUT',
        body: JSON.stringify({ edits: [{ key: 'q:q1:text', text: 'Czy są na czas?' }] }),
      }),
    )
  })

  it('shows why it cannot be offered yet', async () => {
    routes({ publish: '2 of the survey’s texts still need translating.' })
    wrap(<SurveyTranslationsPanel surveyId="s1" canEdit />)
    await userEvent.click(await screen.findByRole('button', { name: 'Translate' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save and offer to people' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('2 of the survey’s texts still need translating.')
  })

  it('without permission it can be viewed but not changed', async () => {
    routes()
    wrap(<SurveyTranslationsPanel surveyId="s1" canEdit={false} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View' }))
    expect(screen.queryByRole('button', { name: 'Offer to people' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Add a language')).not.toBeInTheDocument()
    const editor = await screen.findByTestId('translation-editor')
    expect(within(editor).getAllByRole('textbox')[0]).toHaveAttribute('readonly')
  })
})
