import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SurveyPlatformPanel, type PlatformSettings } from './SurveyPlatformPanel'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const settings = (over: Partial<PlatformSettings> = {}): PlatformSettings => ({
  surveyId: 's1',
  editedOnSurveyId: null,
  repeating: true,
  recurrence: 'MONTHLY',
  skipMonths: [],
  librarySkipMonths: [4, 9, 10, 11],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  rotatingQuestionIds: [],
  retention: { months: null, libraryMonths: 36, effectiveMonths: 36, deletedAt: null, periodsDeleted: 0 },
  ...over,
})

const questions = [
  { id: 'q1', key: 'k1', questionText: 'I feel valued', questionType: 'LIKERT', options: null, sortOrder: 0, isRequired: false },
  { id: 'q2', key: 'k2', questionText: 'My manager listens', questionType: 'LIKERT', options: null, sortOrder: 1, isRequired: false },
  { id: 'q3', key: 'k3', questionText: 'Which equipment do you use?', questionType: 'MULTI_SELECT', options: ['Hoist', 'Stand aid', 'Shower', 'Bath'], sortOrder: 2, isRequired: false, answerGroups: [] },
] as never

beforeEach(() => apiJson.mockReset())

describe('repeats, answer keeping and checks', () => {
  it('offers the ready-made survey’s months to skip, and saves them', async () => {
    apiJson.mockImplementation(async (_url: string, init?: RequestInit) => ({ data: settings(init?.method === 'PUT' ? { skipMonths: [4, 9, 10, 11] } : {}) }))
    wrap(<SurveyPlatformPanel surveyId="s1" questions={questions} canEdit isTemplate={false} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Use those months' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/platform', { method: 'PUT', body: JSON.stringify({ skipMonths: [4, 9, 10, 11] }) }))
    expect(screen.getByTestId('retention-note')).toHaveTextContent(/deleted 36 months after .* privacy notice/)
  })

  it('a rotating question needs two; one tick saves nothing', async () => {
    apiJson.mockResolvedValue({ data: settings() })
    wrap(<SurveyPlatformPanel surveyId="s1" questions={questions} canEdit isTemplate={false} />)
    const boxes = await screen.findAllByRole('checkbox', { name: /I feel valued|My manager listens/ })
    fireEvent.click(boxes[0])
    expect(apiJson.mock.calls.filter(c => c[1]?.method === 'PUT')).toHaveLength(0)
  })

  it('the wording check lists what to fix with the question and how', async () => {
    apiJson.mockImplementation(async (url: string) =>
      String(url).includes('wording-check')
        ? { data: { surveyId: 's1', fromLibrary: false, estimatedMinutes: 3, problems: 1, suggestions: 0, findings: [{ rule: 'NEGATIVE', ruleLabel: 'Negative statements', severity: 'PROBLEM', questionId: 'q1', questionText: 'I do not feel valued', message: 'Word it positively.' }] } }
        : { data: settings() },
    )
    wrap(<SurveyPlatformPanel surveyId="s1" questions={questions} canEdit isTemplate={false} />)
    fireEvent.click(await screen.findByRole('button', { name: /Check the wording/ }))
    expect(await screen.findByText('Word it positively.')).toBeInTheDocument()
    expect(screen.getByText(/1 to fix, 0 to consider/)).toBeInTheDocument()
  })

  it('groups a choice question’s answers under headings', async () => {
    apiJson.mockImplementation(async (url: string) => (String(url).includes('option-groups') ? { message: 'ok' } : { data: settings() }))
    wrap(<SurveyPlatformPanel surveyId="s1" questions={questions} canEdit isTemplate={false} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Group answers' }))
    fireEvent.change(screen.getByLabelText('Heading 1'), { target: { value: 'Moving' } })
    fireEvent.change(screen.getByLabelText('Heading 2'), { target: { value: 'Washing' } })
    fireEvent.change(screen.getByLabelText('Group for Hoist'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Group for Shower'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save groups' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/questions/q3/option-groups', expect.objectContaining({ method: 'PUT' })))
    const body = JSON.parse(apiJson.mock.calls.find(c => String(c[0]).includes('option-groups'))![1].body)
    expect(body.groups).toEqual([{ heading: 'Moving', options: ['Hoist'] }, { heading: 'Washing', options: ['Shower'] }])
  })
})

describe('answers under headings on the answer page', () => {
  it('shows each heading as a named group, ungrouped answers after', () => {
    render(
      <QuestionField
        q={{ id: 'q', questionText: 'Which equipment?', questionType: 'MULTI_SELECT', options: ['Hoist', 'Shower', 'Other kit'], isRequired: false, answerGroups: [{ heading: 'Moving', options: ['Hoist'] }, { heading: 'Washing', options: ['Shower'] }] } as never}
        index={0}
        value={undefined}
        disabled={false}
        onChange={() => undefined}
      />,
    )
    expect(screen.getByRole('group', { name: 'Moving' })).toHaveTextContent('Hoist')
    expect(screen.getByRole('group', { name: 'Washing' })).toHaveTextContent('Shower')
    expect(screen.getByText('Other kit')).toBeInTheDocument()
  })
})
