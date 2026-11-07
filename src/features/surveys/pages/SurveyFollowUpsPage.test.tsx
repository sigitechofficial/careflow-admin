import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { SurveyFollowUp, SurveyFollowUpsPayload } from '@/features/surveys/alerts/survey-alerts'

const navigate = vi.fn()
let search: Record<string, string> = {}
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => navigate,
  useSearch: () => search,
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/shared/context/organisation-display-format.context', () => ({
  useOrganisationDisplayFormat: () => ({ formatDate: (d: string) => d, formatTime: (d: string) => d }),
}))

const update = vi.fn().mockResolvedValue({})
let payload: SurveyFollowUpsPayload
vi.mock('@/features/surveys/alerts/survey-alerts', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/surveys/alerts/survey-alerts')>()),
  useFollowUps: () => ({ data: payload, isLoading: false, isError: false }),
  useFollowUpOwners: () => ({ data: [{ id: 'u1', name: 'Asha Patel' }] }),
  useUpdateFollowUp: () => ({ mutateAsync: update, isPending: false }),
}))

import SurveyFollowUpsPage from '@/features/surveys/pages/SurveyFollowUpsPage'

const item = (over: Partial<SurveyFollowUp> = {}): SurveyFollowUp => ({
  id: 'a1',
  survey: { id: 's1', title: 'Quality check', periodKey: null, recurringSurveyId: null },
  title: 'Asked to be contacted: Mary Smith',
  details: 'Mary Smith answered "Quality check" by phone.',
  unlinked: false,
  matchCount: 1,
  contactRequest: true,
  urgent: false,
  person: { kind: 'SERVICE_USER', id: 'su1', name: 'Mary Smith' },
  responseId: 'r1',
  role: { id: 'cc', name: 'Care Coordinator' },
  status: 'OPEN',
  dueDate: '2026-11-04',
  dueState: 'overdue',
  owner: null,
  outcomeKind: null,
  outcome: null,
  recordKind: null,
  linkedRecord: null,
  taskNote: null,
  completedAt: null,
  completedByName: null,
  raisedOn: '2026-10-28',
  canAct: true,
  ...over,
})

describe('SurveyFollowUpsPage', () => {
  beforeEach(() => {
    search = {}
    update.mockClear()
    payload = {
      today: '2026-11-06',
      counts: { open: 2, overdue: 1, contact: 1 },
      items: [
        item(),
        item({
          id: 'a2',
          title: 'Feels unsafe',
          details: '3 answers to this anonymous survey matched this alert',
          unlinked: true,
          matchCount: 3,
          contactRequest: false,
          urgent: true,
          person: null,
          responseId: null,
          dueState: 'today',
          dueDate: '2026-11-06',
        }),
      ],
    }
  })

  it('lists follow-ups with counts, due state and grouped answers without names', () => {
    render(<SurveyFollowUpsPage />)
    expect(screen.getByRole('button', { name: 'Overdue (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Asked to be contacted (1)' })).toBeInTheDocument()
    const list = screen.getByTestId('follow-up-list')
    expect(within(list).getByText('Overdue · was due 2026-11-04')).toBeInTheDocument()
    expect(within(list).getByText('3 answers, no names')).toBeInTheDocument()
  })

  it('records an owner and outcome and closes it', async () => {
    render(<SurveyFollowUpsPage />)
    fireEvent.click(screen.getAllByRole('button', { name: /^Open ?: / })[0])
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'u1' } })
    fireEvent.change(screen.getByLabelText('What happened'), { target: { value: 'CONTACTED' } })
    fireEvent.change(screen.getByLabelText('Outcome notes'), { target: { value: 'Spoke to Mary' } })
    fireEvent.change(screen.getByLabelText('Linked record (reference)'), { target: { value: 'CMP-2026-0004' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }))
    await vi.waitFor(() => expect(update).toHaveBeenCalled())
    expect(update.mock.calls[0][0]).toEqual({
      id: 'a1',
      input: { status: 'DONE', ownerUserId: 'u1', outcomeKind: 'CONTACTED', outcome: 'Spoke to Mary', linkedReference: 'CMP-2026-0004' },
    })
  })

  it('warns not to trace answers given without a name', () => {
    search = { alert: 'a2' }
    render(<SurveyFollowUpsPage />)
    expect(screen.getByText(/These answers are not linked to anyone\. Do not try to find out who gave them/)).toBeInTheDocument()
  })

  it('is read-only for someone who cannot act on it', () => {
    payload.items = [item({ canAct: false, outcomeKind: 'CONTACTED' })]
    render(<SurveyFollowUpsPage />)
    fireEvent.click(screen.getByRole('button', { name: /^View ?: / }))
    expect(screen.queryByRole('button', { name: 'Mark done' })).not.toBeInTheDocument()
    expect(screen.getByText('What happened: Contacted')).toBeInTheDocument()
  })
})
