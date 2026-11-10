import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useSearch: () => ({ templateId: 't1' }),
}))

import { SurveyHeatmapPanel, SurveyQualityPanel, SurveyScoresPanel, SurveyThemesPanel, SurveyTrendsPanel } from './SurveyInsightPanels'
import SurveyInsightPage, { Survey360Page } from './SurveyInsightPages'
import { SurveyScoringPanel } from './SurveyScoringPanel'
import { SafeguardingWordsToggle } from '@/features/surveys/alerts/SafeguardingWordsToggle'
import { describePoint, formatPoint } from './survey-insight'

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeEach(() => apiJson.mockReset())

describe('trends', () => {
  it('shows each period, says why a period is hidden, and pools only shown periods', async () => {
    apiJson.mockResolvedValue({
      data: {
        surveyId: 's1',
        title: 'Pulse',
        isAnonymous: true,
        threshold: 5,
        units: [
          { id: 'p1', title: 'Pulse — Jan', label: 'Jan', periodKey: '2026-01', opensAt: null, closesAt: null, status: 'CLOSED', year: 2026, shown: true, hiddenNote: null, responses: 10 },
          { id: 'p2', title: 'Pulse — Feb', label: 'Feb', periodKey: '2026-02', opensAt: null, closesAt: null, status: 'CLOSED', year: 2026, shown: false, hiddenNote: 'Too few answers to show', responses: null },
        ],
        questions: [
          {
            key: 'LIKERT|I feel valued',
            questionText: 'I feel valued',
            questionType: 'LIKERT',
            sectionTitle: null,
            points: [
              { unitId: 'p1', point: { kind: 'TOP_TWO', percent: 80, positive: 8, base: 10 } },
              { unitId: 'p2', point: null },
            ],
            years: [{ year: 2026, point: { kind: 'TOP_TWO', percent: 80, positive: 8, base: 10 } }],
            pooled: { kind: 'TOP_TWO', percent: 80, positive: 8, base: 10 },
          },
        ],
        responsesInFigures: 10,
        note: 'Periods with too few answers are left out.',
        pool: { templateId: 't1' },
      },
    })
    wrap(<SurveyTrendsPanel surveyId="s1" />)
    expect(await screen.findByText('Too few answers to show')).toBeInTheDocument()
    expect(screen.getAllByText('80%')).toHaveLength(2)
    expect(screen.getByText('Pool every copy of this survey')).toBeInTheDocument()
    expect(apiJson).toHaveBeenCalledWith('/surveys/s1/trends', { method: 'GET' })
  })

  it('formats points in words for screen readers', () => {
    expect(formatPoint(null)).toBe('—')
    expect(formatPoint({ kind: 'AVERAGE', average: 4.2, count: 9 })).toBe('4.2')
    expect(describePoint({ kind: 'YES', percent: 75, positive: 3, base: 4 })).toBe('75% said Yes (3 of 4)')
  })
})

describe('branch heatmap', () => {
  it('shows combined and blank cells, and the reason', async () => {
    apiJson.mockResolvedValue({
      data: {
        surveyId: 's1',
        title: 'Pulse',
        minimum: 5,
        columns: [
          { key: 'L1', label: 'North', responses: 8 },
          { key: 'other', label: 'Other branches (combined)', responses: 7 },
        ],
        rows: [{ key: 'q', questionText: 'I feel valued', kind: 'TOP_TWO', overall: { percent: 53, base: 15 }, cells: [{ key: 'L1', percent: 100, base: 8 }, { key: 'other', percent: null, base: null }] }],
        note: 'Each branch shows only with at least 5 answers.',
      },
    })
    wrap(<SurveyHeatmapPanel surveyId="s1" />)
    expect(await screen.findByText('Other branches (combined)')).toBeInTheDocument()
    expect(screen.getByText('Too few answers to show')).toHaveClass('sr-only')
    expect(screen.getByText(/at least 5 answers/)).toBeInTheDocument()
  })
})

describe('themes, quality and scores', () => {
  it('themes are counts only, small ones as "fewer than 3"', async () => {
    apiJson.mockResolvedValue({
      data: { surveyId: 's1', minimum: 5, writtenAnswers: 12, themes: [{ code: 'TIMEKEEPING', label: 'Time keeping', count: 6 }, { code: 'PAY', label: 'Pay', count: null }], questions: [], note: 'Counted inside CareFlow.' },
    })
    wrap(<SurveyThemesPanel surveyId="s1" />)
    expect(await screen.findByText('12 written answers')).toBeInTheDocument()
    expect(screen.getByText('fewer than 3')).toBeInTheDocument()
  })

  it('quality shows flagged counts and never offers to delete', async () => {
    apiJson.mockResolvedValue({ data: { surveyId: 's1', responses: 20, flagged: 2, flags: [{ flag: 'FAST', label: 'Answered very quickly', count: 2 }, { flag: 'DUPLICATE', label: 'Same answers as another response', count: 0 }], note: 'Never removed.' } })
    wrap(<SurveyQualityPanel surveyId="s1" />)
    expect(await screen.findByText('2 of 20 responses flagged for a look.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete|remove/i })).toBeNull()
  })

  it('scores: bands hidden when one would single someone out', async () => {
    apiJson.mockResolvedValue({
      data: {
        surveyId: 's1',
        scoring: { scales: [{ key: 'd', label: 'Demands', questionKeys: ['a'], reversed: [], method: 'MEAN', bands: [] }] },
        scales: [{ key: 'd', label: 'Demands', method: 'MEAN', people: 9, average: 3.4, band: 'Act now', bands: null }],
        units: [],
        note: null,
      },
    })
    wrap(<SurveyScoresPanel surveyId="s1" />)
    expect(await screen.findByText('3.40')).toBeInTheDocument()
    expect(screen.getByText(/Bands not listed/)).toBeInTheDocument()
  })
})

describe('scoring settings', () => {
  it('adds a scale with questions and a reversed one, then saves', async () => {
    apiJson.mockResolvedValue({ message: 'ok', data: {} })
    const questions = [
      { id: 'q1', key: 'k1', questionText: 'I have unrealistic time pressures', questionType: 'LIKERT', sortOrder: 0 },
      { id: 'q2', key: 'k2', questionText: 'I can decide when to take a break', questionType: 'LIKERT', sortOrder: 1 },
      { id: 'q3', key: 'k3', questionText: 'Anything else?', questionType: 'TEXTAREA', sortOrder: 2 },
    ] as never
    wrap(<SurveyScoringPanel surveyId="s1" questions={questions} scoring={null} canEdit />)
    fireEvent.click(screen.getByRole('button', { name: 'Add scores' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add a scale' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Demands' } })
    expect(screen.queryByText('Anything else?')).toBeNull()
    fireEvent.click(screen.getByLabelText('I have unrealistic time pressures'))
    fireEvent.click(screen.getByLabelText('Scored the other way'))
    fireEvent.click(screen.getByRole('button', { name: 'Save scores' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalled())
    const [url, init] = apiJson.mock.calls[0]
    expect(url).toBe('/surveys/s1/scoring')
    expect(JSON.parse(init.body).scoring.scales[0]).toMatchObject({ label: 'Demands', questionKeys: ['k1'], reversed: ['k1'], method: 'MEAN' })
  })
})

describe('safeguarding-words alert', () => {
  it('switching off needs a reason', async () => {
    apiJson.mockResolvedValue({ message: 'ok' })
    wrap(<SafeguardingWordsToggle surveyId="s1" isActive />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch off' }))
    const confirm = screen.getAllByRole('button', { name: 'Switch off' }).at(-1)!
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Read daily by the lead' } })
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/surveys/s1/alert-rules/safeguarding-words', { method: 'PUT', body: JSON.stringify({ isActive: false, reason: 'Read daily by the lead' }) }),
    )
  })
})

describe('dashboard and 360', () => {
  it('the dashboard switches role views and shows limited counts as limited', async () => {
    apiJson.mockImplementation(async (url: string) => {
      if (String(url).startsWith('/survey-insight/pools')) return { data: [{ templateId: 't1', libraryReference: null, copies: 3, title: 'Training feedback' }] }
      return {
        data: {
          view: String(url).includes('NOMINATED') ? 'NOMINATED_INDIVIDUAL' : 'REGISTERED_MANAGER',
          locationId: null,
          openSurveys: [{ id: 's1', title: 'Manager feedback', targetKind: 'EMPLOYEE', isAnonymous: true, closesAt: null, sentTo: 8, responseRate: null, countsRestricted: true }],
          alerts: { open: 2, overdue: 1, urgent: 0 },
          work: String(url).includes('NOMINATED') ? null : { eventsWaiting: 1, heldBack: 0, callLists: 0 },
          trends: [],
          totals: { surveys: 4, open: 1, closedThisYear: 2 },
        },
      }
    })
    wrap(<SurveyInsightPage />)
    expect(await screen.findByText('Limited')).toBeInTheDocument()
    expect(screen.getByText(/Event sends to check or offer: 1/)).toBeInTheDocument()
    expect(await screen.findByText(/All copies of “Training feedback” together/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Nominated individual' }))
    await waitFor(() => expect(screen.queryByText(/Event sends to check/)).toBeNull())
  })

  it('the 360 report shows each audience by key question, and why one is missing', async () => {
    apiJson.mockResolvedValue({
      data: {
        year: 2026,
        keyQuestions: [{ code: 'SAFE', label: 'Safe' }],
        audiences: [
          { code: 'PEOPLE', label: 'People we support', candidates: [], survey: { id: 's', title: 'Annual' }, unit: { id: 'u', title: 'Annual 2026', status: 'CLOSED' }, responses: 40, hiddenNote: null, headline: { percent: 88, base: 40 }, keyQuestions: [{ code: 'SAFE', label: 'Safe', percent: 91, answers: 120, questions: 3 }] },
          { code: 'STAFF', label: 'Staff', candidates: [], survey: null, unit: null, responses: null, hiddenNote: 'No survey for this audience found.', headline: null, keyQuestions: [] },
        ],
        note: 'No written answers.',
      },
    })
    wrap(<Survey360Page />)
    expect(await screen.findByText('91%')).toBeInTheDocument()
    expect(screen.getByText(/No survey for this audience found/)).toBeInTheDocument()
  })
})

describe('insight pages: errors and the view switcher', () => {
  it('the 360 report says it failed and offers Try again (never stuck on Loading)', async () => {
    apiJson.mockRejectedValueOnce(new Error('down')).mockResolvedValue({
      data: { year: 2026, keyQuestions: [{ code: 'SAFE', label: 'Safe' }], audiences: [], note: 'ok' },
    })
    wrap(<Survey360Page />)
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('the view switcher is a set of pressed buttons', async () => {
    apiJson.mockImplementation(async (url: string) =>
      String(url).includes('pools')
        ? { data: [] }
        : { data: { view: 'REGISTERED_MANAGER', locationId: null, openSurveys: [], alerts: { open: 0, overdue: 0, urgent: 0 }, work: null, trends: [], totals: { surveys: 0, open: 0, closedThisYear: 0 } } },
    )
    wrap(<SurveyInsightPage />)
    expect(await screen.findByRole('button', { name: 'Registered manager' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('scores are locked once answered: a manager cannot change them, an admin must give a reason', async () => {
    apiJson.mockResolvedValue({ message: 'ok', data: {} })
    const questions = [{ id: 'q1', key: 'k1', questionText: 'Time pressures', questionType: 'LIKERT', sortOrder: 0 }] as never
    const scoring = { scales: [{ key: 'd', label: 'Demands', questionKeys: ['k1'], reversed: [], method: 'MEAN' as const, bands: [] }] }
    const { unmount } = wrap(<SurveyScoringPanel surveyId="s1" questions={questions} scoring={scoring} canEdit answered />)
    expect(screen.getByTestId('scoring-locked')).toHaveTextContent(/next copy/)
    expect(screen.queryByRole('button', { name: 'Change scores' })).toBeNull()
    unmount()
    wrap(<SurveyScoringPanel surveyId="s1" questions={questions} scoring={scoring} canEdit answered isAdmin />)
    fireEvent.click(screen.getByRole('button', { name: 'Change scores' }))
    const save = screen.getByRole('button', { name: 'Save scores' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Why change scores/), { target: { value: 'Wrong band in the tool' } })
    fireEvent.click(save)
    await waitFor(() => expect(JSON.parse(apiJson.mock.calls[0][1].body)).toMatchObject({ unlockReason: 'Wrong band in the tool' }))
  })
})
