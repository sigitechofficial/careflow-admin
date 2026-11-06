import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { SurveyRecipientsPayload, SurveyResponsesPayload } from '@/features/surveys/types'

const { state } = vi.hoisted(() => ({
  state: {
    recipients: undefined as SurveyRecipientsPayload | undefined,
    responses: undefined as SurveyResponsesPayload | undefined,
  },
}))

vi.mock('@/features/surveys/insight/survey-insight', () => ({ useResponseFlags: () => ({ data: [] }) }))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurveyRecipients: () => ({ data: state.recipients, isLoading: false }),
  useSurveyResponses: () => ({
    data: state.responses,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useSurvey: () => ({ data: undefined }),
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: () => boolean }) => unknown) => pick({ can: () => true }),
}))
vi.mock('@/features/surveys/components/RecordSurveyResponseDialog', () => ({
  RecordSurveyResponseDialog: () => null,
}))

import { SurveyRecipientsPanel } from '@/features/surveys/components/SurveyRecipientsPanel'
import { SurveyResponsesPanel } from '@/features/surveys/components/SurveyResponsesPanel'
import { SurveyBreakdownPanel } from '@/features/surveys/components/SurveyBreakdownPanel'

describe('anonymous survey display', () => {
  beforeEach(() => {
    state.recipients = undefined
    state.responses = undefined
  })

  it('recipients: counts only — no names, no completion times', () => {
    state.recipients = {
      isAnonymous: true,
      byPeriod: false,
      counts: { total: 8, notStarted: 4, opened: 1, completed: 3 },
      recipients: [],
    }
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" />)
    expect(screen.getByText('3 of 8 completed')).toBeInTheDocument()
    expect(screen.getByText(/only totals are shown/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Completed', { selector: 'th' })).not.toBeInTheDocument()
  })

  it('recipients: named surveys list people with sent / completed times', () => {
    state.recipients = {
      isAnonymous: false,
      byPeriod: false,
      counts: { total: 1, notStarted: 0, opened: 0, completed: 1 },
      recipients: [
        {
          id: 'r1',
          status: 'COMPLETED',
          employeeId: 'e1',
          employeeName: 'Jo Bloggs',
          serviceUserId: null,
          serviceUserName: null,
          sentAt: '2026-11-04T09:00:00.000Z',
          submittedAt: '2026-11-04T10:15:00.000Z',
          respondentRelation: null,
          respondentName: null,
          createdAt: '2026-11-04T09:00:00.000Z',
        },
      ],
    }
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" />)
    expect(screen.getByText('Jo Bloggs')).toBeInTheDocument()
    expect(screen.getByText('4 Nov 2026, 10:15')).toBeInTheDocument()
  })

  it('responses: anonymous answers show the date only and no one’s name', () => {
    state.responses = {
      isAnonymous: true,
      total: 1,
      responses: [
        {
          id: 'resp-1',
          submittedAt: '2026-11-04T00:00:00.000Z',
          submittedDateOnly: true,
          respondentLabel: 'Anonymous respondent #1',
          employeeId: null,
          serviceUserId: null,
          respondentName: null,
          channel: 'ONLINE',
          isAnonymous: true,
          answerCount: 2,
          answers: [],
        },
      ],
    }
    render(<SurveyResponsesPanel surveyId="s1" />)
    expect(screen.getByText('Anonymous respondent #1')).toBeInTheDocument()
    expect(screen.getByText('4 Nov 2026')).toBeInTheDocument()
    expect(screen.queryByText(/00:00/)).not.toBeInTheDocument()
    expect(screen.getByText(/answers are not linked to anyone/)).toBeInTheDocument()
  })

  it('breakdowns: withheld under 5 anonymous responses, with the reason', () => {
    render(
      <SurveyBreakdownPanel
        breakdowns={[
          {
            dimension: 'branch',
            groups: [],
            suppressed: true,
            note: 'Shown once there are at least 5 responses, so nobody can be identified.',
          },
          {
            dimension: 'jobTitle',
            groups: [],
            suppressed: true,
            note: 'Shown once there are at least 5 responses, so nobody can be identified.',
          },
        ]}
      />,
    )
    expect(screen.getByTestId('breakdown-branch-withheld')).toHaveTextContent('at least 5 responses')
    expect(screen.getByTestId('breakdown-jobTitle-withheld')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('breakdowns: groups are shown once allowed', () => {
    render(
      <SurveyBreakdownPanel
        breakdowns={[
          {
            dimension: 'branch',
            groups: [
              { key: 'a', label: 'Leeds', responses: 6 },
              { key: 'other', label: 'Other groups (combined)', responses: 5 },
            ],
            suppressed: false,
            note: 'Groups with fewer than 5 responses are combined.',
          },
        ]}
      />,
    )
    expect(screen.getByText('Leeds')).toBeInTheDocument()
    expect(screen.getByText('Other groups (combined)')).toBeInTheDocument()
  })
})
