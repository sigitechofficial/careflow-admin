import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/store/company.store', () => ({ useCompanyStore: () => 'Allfor Care' }))
vi.mock('@/components/company/CompanyBrandingBootstrap', () => ({ CompanyBrandingBootstrap: () => null }))
vi.mock('@/features/surveys/sharing/survey-sharing.api', () => ({ notePaperCopyPrinted: vi.fn(async () => undefined) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  useParams: () => ({ surveyId: 's1' }),
}))
const survey = {
  id: 's1',
  title: 'Your care',
  description: 'Tell us.',
  isAnonymous: false,
  targetKind: 'SERVICE_USER',
  sectionIntros: {},
  questions: [
    { id: 'q1', questionText: 'Are carers on time?', helpText: null, questionType: 'SINGLE_SELECT', options: ['Always', 'Never'], config: null, isRequired: true, sortOrder: 0 },
    { id: 'q2', questionText: 'Do you feel safe?', helpText: null, questionType: 'YES_NO', options: null, config: null, isRequired: false, sortOrder: 1 },
  ],
}
vi.mock('@/features/surveys/hooks/useSurveys', () => ({ useSurvey: () => ({ data: survey, isLoading: false, isError: false }) }))

import SurveyPaperCopyPage from '@/features/surveys/sharing/SurveyPaperCopyPage'

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyPaperCopyPage />
    </QueryClientProvider>,
  )

beforeEach(() => {
  apiJson.mockReset()
  apiJson.mockImplementation(async (url: string) => {
    if (url.endsWith('/translations'))
      return {
        data: {
          surveyId: 's1',
          editedOnSurveyId: null,
          languages: [],
          translations: [
            // As the API sends them: the code is in `language` (no `code` field on a list row).
            { language: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr', status: 'PUBLISHED', progress: {} },
            { language: 'ro', name: 'Romanian', nativeName: 'Română', dir: 'ltr', status: 'DRAFT', progress: {} },
          ],
        },
      }
    return {
      data: {
        strings: [
          { key: 'title', translation: 'Twoja opieka', outOfDate: false },
          { key: 'q:q1:text', translation: 'Czy są na czas?', outOfDate: false },
          { key: 'q:q1:option:Always', translation: 'Zawsze', outOfDate: false },
          { key: 'q:q1:option:Never', translation: 'Stare', outOfDate: true },
          { key: 'ui:yes', translation: 'Tak', outOfDate: false },
          { key: 'ui:paperTickOne', translation: 'Zaznacz jedno pole.', outOfDate: false },
          { key: 'ui:paperThankYou', translation: 'Dziękujemy.', outOfDate: false },
        ],
      },
    }
  })
})

describe('paper copy: large print and other languages', () => {
  it('large print makes the whole page bigger', async () => {
    wrap()
    const page = screen.getByTestId('paper-copy')
    expect(page.style.zoom || '').toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Large print' }))
    expect(screen.getByRole('button', { name: 'Large print' })).toHaveAttribute('aria-pressed', 'true')
    expect(page.style.zoom).toBe('1.75')
  })

  it('offers published languages only, and prints the translation (out-of-date texts in English)', async () => {
    wrap()
    const select = await screen.findByTestId('paper-language')
    expect(within(select).queryByRole('option', { name: 'Romanian' })).not.toBeInTheDocument()
    await userEvent.selectOptions(select, 'pl')
    expect(await screen.findByRole('heading', { level: 1, name: 'Twoja opieka' })).toBeInTheDocument()
    const page = screen.getByTestId('paper-copy')
    expect(page).toHaveAttribute('lang', 'pl')
    expect(within(page).getByText('Zawsze')).toBeInTheDocument()
    expect(within(page).getByText('Never')).toBeInTheDocument()
    expect(within(page).getByText('Tak')).toBeInTheDocument()
    expect(within(page).getAllByText('Zaznacz jedno pole.').length).toBeGreaterThan(0)
    expect(within(page).getByText('Dziękujemy.')).toBeInTheDocument()
  })
})
