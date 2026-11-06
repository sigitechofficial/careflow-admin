import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SurveyRecipientsPanel } from '@/features/surveys/components/SurveyRecipientsPanel'

const state = vi.hoisted(() => ({ recipients: null as unknown }))
const api = vi.hoisted(() => ({ fetchPersonalLinks: vi.fn(), renewPersonalLink: vi.fn(), remindOne: vi.fn() }))

vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurveyRecipients: () => ({ data: state.recipients, isLoading: false }),
}))
vi.mock('@/features/surveys/sharing/survey-sharing.api', () => ({
  absoluteSurveyUrl: (p: string) => `https://app.example${p}`,
  fetchPersonalLinks: api.fetchPersonalLinks,
  renewPersonalLink: api.renewPersonalLink,
  useLinksCopiedHistory: (_id: string, enabled: boolean) => ({
    data: enabled ? [{ at: '2026-11-06T10:00:00.000Z', by: 'Sam Lee', what: 'MAIL_MERGE', count: 12 }] : undefined,
    isLoading: false,
  }),
}))
vi.mock('@/features/surveys/reminders/survey-reminders', () => ({
  useRemindOne: () => ({ mutateAsync: api.remindOne, isPending: false }),
}))
vi.mock('@/store/company.store', () => ({ useCompanyStore: () => 'Sunrise Care' }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn(), toastWarning: vi.fn() }))

const ctx = { surveyId: 's1', title: 'Staff survey', targetKind: 'EMPLOYEE' as const, closesAt: null }
const named = {
  isAnonymous: false,
  byPeriod: false,
  counts: { total: 2, notStarted: 1, opened: 0, completed: 1 },
  recipients: [
    { id: 'r1', status: 'SENT', employeeId: 'e1', employeeName: 'Zara Ali', serviceUserId: null, serviceUserName: null, sentAt: null, submittedAt: null, respondentRelation: null, respondentName: null, createdAt: '' },
    { id: 'r2', status: 'COMPLETED', employeeId: 'e2', employeeName: 'Adam Brown', serviceUserId: null, serviceUserName: null, sentAt: null, submittedAt: null, respondentRelation: null, respondentName: null, createdAt: '' },
  ],
}

describe('people’s own links on the recipients list', () => {
  let writeText: ReturnType<typeof vi.fn>
  beforeEach(() => {
    api.fetchPersonalLinks.mockReset()
    api.renewPersonalLink.mockReset()
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
  })

  it('a named open survey: copy one person’s link (fetched only on the click), never for someone who answered', async () => {
    state.recipients = named
    api.fetchPersonalLinks.mockResolvedValue([{ recipientId: 'r1', name: 'Zara Ali', kind: 'EMPLOYEE', path: '/survey/tok-1', answered: false }])
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" personalLinks={ctx} />)
    expect(api.fetchPersonalLinks).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Copy the link for Adam Brown' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Copy the link for Zara Ali' }))
    // Asked first: holding the link means answering as them.
    expect(await screen.findByText(/Anyone holding a person’s link can answer as that person/)).toBeInTheDocument()
    expect(api.fetchPersonalLinks).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://app.example/survey/tok-1'))
    expect(api.fetchPersonalLinks).toHaveBeenCalledWith('s1', { purpose: 'ONE', recipientIds: ['r1'] })
  })

  it('copy all links asks only for people who have not answered by default', async () => {
    state.recipients = named
    api.fetchPersonalLinks.mockResolvedValue([{ recipientId: 'r1', name: 'Zara Ali', kind: 'EMPLOYEE', path: '/survey/tok-1', answered: false }])
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" personalLinks={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: /Copy all links/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Copy links' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Zara Ali: https://app.example/survey/tok-1'))
    expect(api.fetchPersonalLinks).toHaveBeenCalledWith('s1', { purpose: 'ALL', onlyNotAnswered: true })
  })

  it('shows who copied links and when, never the links', async () => {
    state.recipients = named
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" personalLinks={ctx} />)
    fireEvent.click(screen.getByRole('button', { name: 'Who copied links' }))
    expect(await screen.findByText(/downloaded 12 links for a mail merge/)).toBeInTheDocument()
    expect(screen.getByText('Sam Lee')).toBeInTheDocument()
  })

  it('an anonymous survey never shows link controls, even if asked to', () => {
    state.recipients = { ...named, isAnonymous: true, recipients: [] }
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" personalLinks={ctx} />)
    expect(screen.queryByTestId('personal-links-toolbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Copy all links/ })).not.toBeInTheDocument()
  })

  it('without the manager context (not open, or not a manager) nothing is offered', () => {
    state.recipients = named
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" />)
    expect(screen.queryByTestId('personal-links-toolbar')).not.toBeInTheDocument()
  })

  it('reminds one person who has not answered, after asking, and not someone reminded three times', async () => {
    state.recipients = {
      ...named,
      recipients: [
        named.recipients[0],
        named.recipients[1],
        { ...named.recipients[0], id: 'r3', employeeName: 'Ola Bee', reminderCount: 3, remindedAt: '2026-11-01T10:00:00.000Z' },
      ],
    }
    api.remindOne.mockResolvedValue({ message: 'Reminder sent by email.', data: { reminded: true, reason: null } })
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" personalLinks={ctx} />)
    expect(screen.queryByRole('button', { name: 'Remind Adam Brown' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Remind Ola Bee: .*3 reminders/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Remind Zara Ali' }))
    expect(api.remindOne).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Send reminder' }))
    await waitFor(() => expect(api.remindOne).toHaveBeenCalledWith('r1'))
  })

  it('never offers reminding one person without the manager context', () => {
    state.recipients = named
    render(<SurveyRecipientsPanel surveyId="s1" targetKind="EMPLOYEE" />)
    expect(screen.queryByRole('button', { name: /^Remind / })).not.toBeInTheDocument()
  })
})
