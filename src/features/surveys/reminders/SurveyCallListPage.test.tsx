import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SurveyCallListPayload } from './survey-reminders'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/shared/lib/use-document-title', () => ({ useDocumentTitle: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({ surveyId: 's1' }),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({ useSurvey: () => ({ data: undefined }) }))
vi.mock('@/features/surveys/components/RecordSurveyResponseDialog', () => ({ RecordSurveyResponseDialog: () => null }))

import SurveyCallListPage from './SurveyCallListPage'

const person = (over: Partial<SurveyCallListPayload['people'][number]> = {}) => ({
  recipientId: 'r1',
  employeeId: null,
  serviceUserId: 'su1',
  name: 'Mary Jones',
  phones: [{ label: 'Mobile', number: '07700 900123' }],
  died: false,
  sentAt: '2026-11-01T10:00:00.000Z',
  reminders: 2,
  lastReminderAt: '2026-11-08T10:00:00.000Z',
  due: true,
  optedOut: false,
  open: true,
  calls: [],
  ...over,
})

const payload: SurveyCallListPayload = {
  survey: { id: 's1', title: 'First week call', targetKind: 'SERVICE_USER', status: 'ACTIVE', closesAt: null },
  callStep: { afterDays: 10, roleId: null, ownerKey: 'CARE_COORDINATOR', withinDays: 5 },
  task: { id: 't1', status: 'OPEN', dueDate: '2026-11-16', roleName: 'Care Coordinator' },
  outcomes: ['NO_ANSWER', 'LEFT_MESSAGE', 'CALL_BACK', 'DECLINED', 'WRONG_NUMBER'],
  people: [
    person(),
    person({ recipientId: 'r2', serviceUserId: 'su2', name: 'Ann Lee', open: false, calls: [{ id: 'c1', outcome: 'DECLINED', notes: null, at: '2026-11-11T10:00:00.000Z', by: 'Sam Office' }] }),
  ],
}

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyCallListPage />
    </QueryClientProvider>,
  )

describe('SurveyCallListPage', () => {
  beforeEach(() => {
    apiJson.mockReset()
    apiJson.mockImplementation(async (url: string, init?: { method?: string }) =>
      init?.method === 'POST' ? { data: { id: 'call1' } } : { data: payload },
    )
  })

  it('lists people to phone with their numbers, and hides people off the list until asked', async () => {
    renderPage()
    const items = await screen.findAllByTestId('call-list-person')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByRole('link', { name: '07700 900123' })).toHaveAttribute('href', 'tel:07700900123')
    expect(screen.getByTestId('call-list-summary')).toHaveTextContent('1 to phone now · 1 off the list')
    fireEvent.click(screen.getByRole('button', { name: 'Show 1 off the list' }))
    expect(screen.getAllByTestId('call-list-person')).toHaveLength(2)
    expect(screen.getByText('Does not want to take part')).toBeInTheDocument()
  })

  it('records a call', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Record call/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Left a message' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save call' }))
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/surveys/s1/calls/r1', {
        method: 'POST',
        body: JSON.stringify({ outcome: 'LEFT_MESSAGE', notes: null }),
      }),
    )
  })
})
