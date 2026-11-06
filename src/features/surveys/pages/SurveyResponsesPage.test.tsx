import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyDetail, SurveyResults } from '@/features/surveys/types'

const { state, download, recordExport } = vi.hoisted(() => ({
  state: {
    survey: undefined as unknown,
    results: {} as Record<string, unknown>,
  },
  download: vi.fn(),
  recordExport: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params: _params, ...rest }: { children: React.ReactNode; to: string; params?: unknown }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useParams: () => ({ surveyId: 's1' }),
}))
vi.mock('@/features/surveys/insight/SurveyInsightPanels', () => ({
  SurveyTrendsPanel: () => <div data-testid="survey-trends" />,
  SurveyHeatmapPanel: () => <div data-testid="survey-heatmap" />,
  SurveyThemesPanel: () => null,
  SurveyQualityPanel: () => null,
  SurveyScoresPanel: () => null,
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurvey: () => ({ data: state.survey, isLoading: false, isError: false }),
  useSurveyResults: (id: string, enabled = true) => ({ data: enabled ? state.results[id] : undefined }),
}))
vi.mock('@/features/surveys/components/SurveyResponsesPanel', () => ({
  SurveyResponsesPanel: ({ surveyId }: { surveyId: string }) => <div data-testid="responses-panel">responses of {surveyId}</div>,
}))
vi.mock('@/features/surveys/components/SurveyRecipientsPanel', () => ({
  SurveyRecipientsPanel: ({ surveyId }: { surveyId: string }) => <div data-testid="recipients-panel">recipients of {surveyId}</div>,
}))
vi.mock('@/features/surveys/sharing/survey-sharing.api', () => ({ recordResultsExport: recordExport }))
vi.mock('@/shared/lib/toast', () => ({ toastApiError: vi.fn(), toastSuccess: vi.fn() }))
vi.mock('@/shared/lib/csv', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/lib/csv')>()),
  downloadCsv: download,
}))

import SurveyResponsesPage from '@/features/surveys/pages/SurveyResponsesPage'

const survey = (over: Partial<SurveyDetail> = {}) =>
  ({
    id: 's1',
    title: 'Staff survey',
    status: 'ACTIVE',
    targetKind: 'EMPLOYEE',
    isAnonymous: false,
    responseCount: 9,
    recipientCount: 20,
    createdByName: null,
    ...over,
  }) as unknown as SurveyDetail

const results = (over: Partial<SurveyResults> = {}): SurveyResults => ({
  isAnonymous: false,
  recipients: 20,
  completed: 8,
  responses: 9,
  responseRate: 40,
  participation: {
    sentTo: 20,
    answered: 9,
    answeredFromSent: 8,
    responseRate: 40,
    openedNotFinished: 2,
    notOpened: 10,
    answeredThroughLink: null,
    recordedByStaff: null,
    answeredEveryQuestion: 6,
    skippedSomeQuestions: 2,
    responsesInFigures: 8,
  },
  headline: null,
  howPeopleAnswered: [
    {
      dimension: 'channel',
      groups: [
        { key: 'ONLINE', label: 'Survey link or carer app', responses: 7 },
        { key: 'TELEPHONE', label: 'Phone', responses: 2 },
      ],
      suppressed: false,
      note: null,
    },
  ],
  questionSummaries: [
    {
      questionId: 'q1',
      questionText: 'Do your care workers arrive on time?',
      questionType: 'LIKERT',
      sortOrder: 0,
      answerCount: 6,
      countedAnswers: 4,
      options: [
        { label: 'Always', count: 2, percent: 50, notCounted: false },
        { label: 'Usually', count: 1, percent: 25, notCounted: false },
        { label: 'Never', count: 1, percent: 25, notCounted: false },
        { label: "Don't know", count: 2, percent: null, notCounted: true },
      ],
      topTwo: { labels: ['Always', 'Usually'], positive: 3, base: 4, percent: 75 },
      writtenAnswers: [{ answer: 'Never', otherText: null, comment: 'Late every day', respondentName: 'Ada Lovelace' }],
      writtenAnswerCount: 1,
      status: 'current',
    },
    {
      questionId: 'q2',
      questionText: 'Which help do you get?',
      questionType: 'MULTI_SELECT',
      sortOrder: 1,
      answerCount: 5,
      countedAnswers: 5,
      options: [
        { label: 'Washing', count: 4, percent: 80, notCounted: false },
        { label: 'Meals', count: 3, percent: 60, notCounted: false },
      ],
      topTwo: null,
      status: 'current',
    },
    {
      questionId: 'q3',
      questionText: 'Hours a week',
      questionType: 'NUMBER',
      sortOrder: 2,
      answerCount: 8,
      numeric: { average: 12.5, min: 2, max: 30 },
      topTwo: null,
      status: 'current',
    },
  ],
  breakdowns: [{ dimension: 'branch', groups: [{ key: 'l', label: 'Leeds', responses: 9 }], suppressed: false, note: null }],
  ...over,
})

// Radix Select needs these in jsdom.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
})

beforeEach(() => {
  download.mockReset()
  state.survey = survey()
  state.results = { s1: results() }
})

const tile = (key: string) => screen.getByTestId(`participation-${key}`)

describe('SurveyResponsesPage (Results)', () => {
  it('is titled Results, with Summary first and Individual responses as the second tab', async () => {
    render(<SurveyResponsesPage />)
    expect(screen.getByText('Results')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByTestId('responses-panel')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Individual responses' }))
    expect(screen.getByTestId('responses-panel')).toHaveTextContent('responses of s1')
    expect(screen.getByTestId('recipients-panel')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Download summary/ })).not.toBeInTheDocument()
  })

  describe('participation', () => {
    it('shows sent to, answered, rate, opened but not finished, not opened yet and completeness', () => {
      render(<SurveyResponsesPage />)
      expect(tile('sent')).toHaveTextContent('Sent to20')
      expect(tile('answered')).toHaveTextContent('Answered (all channels)9')
      expect(tile('answered')).toHaveTextContent('Includes 1 recorded without a named person.')
      expect(tile('rate')).toHaveTextContent('Response rate40%8 of the 20 it was sent to answered.')
      expect(tile('opened')).toHaveTextContent('Opened but not finished2Opened the survey but have not sent their answers yet.')
      expect(tile('not-opened')).toHaveTextContent('Not opened yet10')
      expect(tile('every')).toHaveTextContent('Answered every question6')
      expect(tile('skipped')).toHaveTextContent('Skipped some optional questions2')
      // 8 judged of 9 answered: says why the two do not add up.
      expect(screen.getByTestId('participation-judged-note')).toHaveTextContent(/cover the 8 responses/)
    })

    it('public survey: answered through the link and recorded by staff instead of sent to, rate and not opened', () => {
      state.survey = survey({ targetKind: 'PUBLIC' })
      state.results = {
        s1: results({
          participation: {
            ...results().participation!,
            sentTo: null,
            answeredFromSent: null,
            responseRate: null,
            openedNotFinished: null,
            notOpened: null,
            answered: 9,
            answeredThroughLink: 6,
            recordedByStaff: 3,
            responsesInFigures: 9,
            answeredEveryQuestion: 7,
          },
        }),
      }
      render(<SurveyResponsesPage />)
      expect(tile('link')).toHaveTextContent('Answered through the link6')
      expect(tile('staff')).toHaveTextContent('Recorded by staff3')
      for (const key of ['sent', 'rate', 'opened', 'not-opened']) {
        expect(screen.queryByTestId(`participation-${key}`)).not.toBeInTheDocument()
      }
      expect(screen.queryByTestId('participation-judged-note')).not.toBeInTheDocument()
    })
  })

  describe('how people answered', () => {
    it('shows each channel with its count', () => {
      render(<SurveyResponsesPage />)
      expect(screen.getByText('How people answered')).toBeInTheDocument()
      expect(screen.getByText('How they answered')).toBeInTheDocument()
      expect(screen.getByText('Phone')).toBeInTheDocument()
    })

    it('anonymous survey: says why groups are withheld, and shows the reason instead of numbers', () => {
      state.survey = survey({ isAnonymous: true, targetKind: 'SERVICE_USER' })
      state.results = {
        s1: results({
          isAnonymous: true,
          howPeopleAnswered: [
            { dimension: 'channel', groups: [], suppressed: true, note: 'Shown once the survey is closed, so answers still coming in cannot be matched to people.' },
            { dimension: 'respondent', groups: [], suppressed: true, note: 'Shown once the survey is closed, so answers still coming in cannot be matched to people.' },
          ],
        }),
      }
      render(<SurveyResponsesPage />)
      expect(screen.getByText(/groups of fewer than 5 are combined or not shown/)).toBeInTheDocument()
      expect(screen.getByTestId('breakdown-channel-withheld')).toHaveTextContent(/once the survey is closed/)
      expect(screen.getByTestId('breakdown-respondent-withheld')).toHaveTextContent(/once the survey is closed/)
    })
  })

  describe('headline and each question', () => {
    it('shows the overall headline with the number who answered it', () => {
      state.results = {
        s1: results({
          headline: { questionId: 'q0', questionText: 'Overall, how was your experience of our service?', labels: ['Very good', 'Good'], positive: 31, base: 40, percent: 78 },
        }),
      }
      render(<SurveyResponsesPage />)
      const headline = screen.getByTestId('survey-headline')
      expect(headline).toHaveTextContent('78% said Very good or Good')
      expect(headline).toHaveTextContent('31 of the 40 people who chose an answer on the scale')
    })

    it('each question: answered and not asked or skipped, top two, not-counted answers, the multi-select note and numbers', () => {
      render(<SurveyResponsesPage />)
      const likert = screen.getByTestId('question-summary-q1')
      expect(likert).toHaveTextContent('6 answered · 2 not asked or skipped')
      expect(within(likert).getByTestId('question-top-two')).toHaveTextContent('75% said Always or Usually3 of 4 on the scale')
      expect(within(likert).getByTestId('not-counted-answers')).toHaveTextContent("2 said Don't know (not counted in the percentages)")
      // Not-counted answers get no bar of their own.
      expect(within(likert).queryByLabelText(/Don't know/)).not.toBeInTheDocument()
      expect(within(likert).getByLabelText('Always 50%')).toBeInTheDocument()

      const multi = screen.getByTestId('question-summary-q2')
      expect(within(multi).getByTestId('multi-select-note')).toHaveTextContent(/more than one answer, so the percentages add up to more than 100%/)
      expect(screen.getByTestId('question-summary-q1')).not.toHaveTextContent(/more than one answer/)

      const numbers = screen.getByTestId('question-summary-q3')
      expect(numbers).toHaveTextContent('Average12.5')
      expect(numbers).toHaveTextContent('Lowest2')
      expect(numbers).toHaveTextContent('Highest30')
      expect(screen.getByText('By branch and job title')).toBeInTheDocument()
    })
  })

  describe('repeating survey', () => {
    it('the period picker applies to the summary and to the individual responses', async () => {
      state.survey = survey({ recurrence: 'MONTHLY' } as Partial<SurveyDetail>)
      state.results = {
        s1: results({
          includesPeriodRuns: true,
          periods: [
            { id: 'p2', title: 'Staff survey — Nov 2026', periodKey: '2026-11', opensAt: null, closesAt: null, status: 'ACTIVE', recipients: 10, completed: 3, responses: 3 },
          ],
        }),
        p2: results({ participation: { ...results().participation!, sentTo: 10, answered: 3 } }),
      }
      render(<SurveyResponsesPage />)
      expect(screen.getByText(/All 1 periods together/)).toBeInTheDocument()
      expect(tile('sent')).toHaveTextContent('Sent to20')
      await userEvent.click(screen.getByRole('combobox', { name: 'Period' }))
      await userEvent.click(await screen.findByRole('option', { name: /Nov 2026/ }))
      expect(tile('sent')).toHaveTextContent('Sent to10')
      await userEvent.click(screen.getByRole('tab', { name: 'Individual responses' }))
      expect(screen.getByTestId('responses-panel')).toHaveTextContent('responses of p2')
    })
  })

  describe('Download summary (CSV)', () => {
    beforeEach(() => {
      recordExport.mockReset().mockResolvedValue(undefined)
    })

    it('is recorded first; when that is refused nothing is downloaded', async () => {
      recordExport.mockRejectedValueOnce(new Error('limited'))
      render(<SurveyResponsesPage />)
      await userEvent.click(screen.getByRole('button', { name: /Download summary \(CSV\)/ }))
      expect(recordExport).toHaveBeenCalledWith('s1', { kind: 'RESULTS_CSV', period: 'Whole survey' })
      expect(download).not.toHaveBeenCalled()
    })

    it('downloads totals only: no names and no written answers', async () => {
      render(<SurveyResponsesPage />)
      await userEvent.click(screen.getByRole('button', { name: /Download summary \(CSV\)/ }))
      expect(recordExport).toHaveBeenCalledTimes(1)
      expect(download).toHaveBeenCalledTimes(1)
      const [filename, csv] = download.mock.calls[0] as [string, string]
      expect(filename).toMatch(/^staff-survey-results-\d{4}-\d{2}-\d{2}\.csv$/)
      expect(csv).toContain('Period,Whole survey')
      expect(csv).toContain('Participation,,Sent to,20,')
      expect(csv).toContain('Participation,,"Answered, of those it was sent to",8,40')
      expect(csv).toContain('Participation,,Skipped some optional questions,2,')
      expect(csv).toContain('How they answered,,Phone,2,22')
      expect(csv).toContain('Question,Do your care workers arrive on time?,Always,2,50')
      expect(csv).toContain("Question,Do your care workers arrive on time?,Don't know (not counted in percentages),2,")
      expect(csv).toContain('Question,Do your care workers arrive on time?,Top two: Always or Usually,3,75')
      expect(csv).toContain('Question,Hours a week,Average,12.5,')
      expect(csv).toContain('By branch,,Leeds,9,100')
      expect(csv).not.toContain('Ada Lovelace')
      expect(csv).not.toContain('Late every day')
    })

    it('a withheld group is written as its reason, never as numbers', async () => {
      state.results = {
        s1: results({
          isAnonymous: true,
          breakdowns: [{ dimension: 'branch', groups: [], suppressed: true, note: 'Shown once there are at least 5 responses, so nobody can be identified.' }],
        }),
      }
      render(<SurveyResponsesPage />)
      await userEvent.click(screen.getByRole('button', { name: /Download summary \(CSV\)/ }))
      const csv = download.mock.calls[0]![1] as string
      expect(csv).toContain('By branch,,"Shown once there are at least 5 responses, so nobody can be identified.",,')
      expect(csv).toContain('Anonymous,Yes')
    })
  })
})

describe('SurveyResponsesPage — per-survey access and the reporting threshold', () => {
  beforeEach(() => {
    state.results = {}
  })

  it('says the results are limited, and shows nothing else, to someone outside them', () => {
    state.survey = survey({ viewerAccess: { results: false, responses: false, configure: false, restricted: true, reportingThreshold: 5 } })
    state.results = { s1: results() }
    render(<SurveyResponsesPage />)
    expect(screen.getByTestId('results-restricted')).toHaveTextContent('limited to particular people')
    expect(screen.queryByText('Do your care workers arrive on time?')).not.toBeInTheDocument()
  })

  it('shows how many more answers are needed below the threshold, with no CSV', () => {
    state.survey = survey()
    state.results = {
      s1: results({
        questionSummaries: [],
        reporting: { threshold: 5, counted: 3, belowThreshold: true, note: '2 more answers are needed before results show.' },
      }),
    }
    render(<SurveyResponsesPage />)
    expect(screen.getByTestId('survey-reporting-threshold')).toHaveTextContent('2 more answers are needed before results show.')
    expect(screen.queryByRole('button', { name: /Download summary/ })).not.toBeInTheDocument()
  })

  it('keeps individual responses from someone who may only see the figures', async () => {
    state.survey = survey({ viewerAccess: { results: true, responses: false, configure: false, restricted: true, reportingThreshold: 0 } })
    state.results = { s1: results({ writtenAnswersRestrictedNote: 'Individual responses to this survey are limited to particular people.' }) }
    render(<SurveyResponsesPage />)
    expect(screen.getByTestId('survey-written-restricted')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Individual responses' }))
    expect(screen.getByTestId('responses-restricted')).toBeInTheDocument()
  })

  describe('answers deleted under the retention period', () => {
    it('an open survey counted from each answer says which answers are gone, in the Summary and Individual responses', async () => {
      state.survey = survey()
      state.results = { s1: results({ retention: { deletedAt: null, deletedBefore: '2026-02-01T00:00:00.000Z', periodsDeleted: 0 } }) }
      render(<SurveyResponsesPage />)
      expect(screen.getByTestId('answers-deleted-before')).toHaveTextContent('Answers given before 1 Feb 2026 have been deleted under the retention period.')
      expect(screen.queryByTestId('answers-deleted')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('tab', { name: 'Individual responses' }))
      expect(screen.getByTestId('answers-deleted-before')).toHaveTextContent('Answers given before 1 Feb 2026')
    })

    it('all answers deleted, and periods whose answers were deleted', () => {
      state.survey = survey()
      state.results = { s1: results({ retention: { deletedAt: '2026-03-01T00:00:00.000Z', deletedBefore: null, periodsDeleted: 0 } }) }
      const { unmount } = render(<SurveyResponsesPage />)
      expect(screen.getByTestId('answers-deleted')).toHaveTextContent('were deleted on 1 Mar 2026')
      unmount()
      state.results = { s1: results({ retention: { deletedAt: null, deletedBefore: null, periodsDeleted: 2 } }) }
      render(<SurveyResponsesPage />)
      expect(screen.getByTestId('answers-deleted-periods')).toHaveTextContent('The answers to 2 periods have been deleted')
    })

    it('nothing deleted: nothing said', () => {
      state.survey = survey()
      state.results = { s1: results({ retention: { deletedAt: null, deletedBefore: null, periodsDeleted: 0 } }) }
      render(<SurveyResponsesPage />)
      expect(screen.queryByTestId('answers-deleted-before')).not.toBeInTheDocument()
      expect(screen.queryByTestId('answers-deleted')).not.toBeInTheDocument()
    })
  })
})
