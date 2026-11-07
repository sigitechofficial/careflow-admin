import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PersonSurveyHistory } from './survey-reminders'

const apiJson = vi.fn()
const perms = new Set<string>()

vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: (p: string) => boolean }) => unknown) => pick({ can: (p: string) => perms.has(p) }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a data-to={to}>{children}</a>,
}))
vi.mock('./SurveysToCollectList', () => ({
  SurveysToCollectList: ({ items }: { items: Array<{ survey: { title: string } }> }) => (
    <div data-testid="to-collect-list">{items.map(i => i.survey.title).join(', ')}</div>
  ),
}))

import { PersonSurveysSection, answeredByWords } from './PersonSurveysSection'

const person = { recipientId: 'r1', employeeId: 'e1', serviceUserId: null, name: 'Ezra Testcarer', phones: [], died: false, sentAt: null, reminders: 0, lastReminderAt: null, due: false, optedOut: false, open: true, calls: [] }

const history = (over: Partial<PersonSurveyHistory> = {}): PersonSurveyHistory => ({
  comingUp: [{ id: 'o1', surveyId: 's1', title: 'Return to work', event: 'RETURN_FROM_LONG_ABSENCE', eventLabel: 'Back from a long absence', eventOn: '2026-11-07', dueOn: '2026-12-05', status: 'WAITING' }],
  notAnswered: [
    { recipientId: 'r1', surveyId: 's2', title: 'Your working hours', sentAt: '2026-11-06T10:00:00Z', closesAt: null, surveyStatus: 'ACTIVE', recipientStatus: 'SENT', open: true, reminders: 0, lastReminderAt: null, person, canRecord: true },
    { recipientId: 'r2', surveyId: 's3', title: 'Staff survey 2025', sentAt: '2025-11-01T10:00:00Z', closesAt: '2025-12-01T00:00:00Z', surveyStatus: 'CLOSED', recipientStatus: 'SENT', open: false, reminders: 2, lastReminderAt: null, person: null, canRecord: false },
  ],
  answered: [
    { recipientId: 'r3', surveyId: 's4', title: 'Induction check-in', sentAt: '2026-10-01T10:00:00Z', answeredAt: '2026-10-03T10:00:00Z', channel: 'TELEPHONE', respondentRelation: 'STAFF', respondentName: null, recordedBy: 'Sam Lee', canViewAnswers: true },
    { recipientId: 'r4', surveyId: 's5', title: 'Training feedback', sentAt: '2026-10-05T10:00:00Z', answeredAt: '2026-10-06T10:00:00Z', channel: 'ONLINE', respondentRelation: 'SELF', respondentName: null, recordedBy: null, canViewAnswers: false },
  ],
  anonymous: [{ recipientId: 'r5', surveyId: 's6', title: 'Annual staff survey', sentAt: '2026-09-01' }],
  ...over,
})

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeEach(() => {
  apiJson.mockReset()
  perms.clear()
})

describe('Surveys on a person’s record', () => {
  it('shows coming up, not answered (open ones to record, closed ones as history), answered and anonymous', async () => {
    perms.add('surveys.read')
    apiJson.mockResolvedValue({ data: history() })
    wrap(<PersonSurveysSection employeeId="e1" />)
    const coming = await screen.findByTestId('person-surveys-coming-up')
    expect(coming).toHaveTextContent('Return to work')
    expect(coming).toHaveTextContent('After: Back from a long absence on 7 Nov 2026')
    expect(coming).toHaveTextContent('Due 5 Dec 2026')
    expect(apiJson).toHaveBeenCalledWith('/surveys-person-history?employeeId=e1', { method: 'GET' })

    const notAnswered = screen.getByTestId('person-surveys-not-answered')
    expect(within(notAnswered).getByTestId('to-collect-list')).toHaveTextContent('Your working hours')
    expect(notAnswered).toHaveTextContent('Staff survey 2025')
    expect(notAnswered).toHaveTextContent('2 reminders · survey closed')

    const answered = screen.getByTestId('person-surveys-answered')
    expect(answered).toHaveTextContent('3 Oct 2026 · Telephone · Staff on their behalf · recorded by Sam Lee')
    expect(answered).toHaveTextContent('6 Oct 2026 · Online · Themselves')
    // Answers linked only where the user may see that survey's individual responses.
    expect(within(answered).getAllByText('View answers')).toHaveLength(1)

    const anon = screen.getByTestId('person-surveys-anonymous')
    expect(anon).toHaveTextContent('Annual staff survey')
    expect(anon).toHaveTextContent('whether they answered is never shown')
  })

  it('shows the first five answered, with Show all', async () => {
    perms.add('surveys.read')
    const many = Array.from({ length: 7 }, (_, i) => ({ ...history().answered[1]!, recipientId: `a${i}`, title: `Survey ${i + 1}` }))
    apiJson.mockResolvedValue({ data: history({ answered: many }) })
    wrap(<PersonSurveysSection serviceUserId="su1" />)
    const answered = await screen.findByTestId('person-surveys-answered')
    expect(within(answered).queryByText('Survey 6')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Show all 7' }))
    expect(within(answered).getByText('Survey 7')).toBeInTheDocument()
  })

  it('says so when there is nothing yet, and is hidden from staff who cannot see surveys', async () => {
    perms.add('surveys.responses.record')
    apiJson.mockResolvedValue({ data: history({ comingUp: [], notAnswered: [], answered: [], anonymous: [] }) })
    const { unmount } = wrap(<PersonSurveysSection serviceUserId="su1" />)
    expect(await screen.findByText(/No surveys sent to this person yet/)).toBeInTheDocument()
    unmount()
    perms.clear()
    apiJson.mockClear()
    wrap(<PersonSurveysSection serviceUserId="su1" />)
    expect(screen.queryByTestId('person-surveys')).toBeNull()
    expect(apiJson).not.toHaveBeenCalled()
  })

  it('who answered, in plain words for each kind of record', () => {
    expect(answeredByWords('SELF', null, false)).toBe('The person themselves')
    expect(answeredByWords('SELF', null, true)).toBe('Themselves')
    expect(answeredByWords('FAMILY_MEMBER', 'Ann Jones', false)).toBe('Family member (Ann Jones)')
    expect(answeredByWords('REPRESENTATIVE', null, false)).toBe('A representative')
  })
})
