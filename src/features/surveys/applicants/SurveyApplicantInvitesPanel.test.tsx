import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SurveyApplicantInvitesPanel, type ApplicantInvites } from './SurveyApplicantInvitesPanel'

const status = (over: Partial<ApplicantInvites> = {}): ApplicantInvites => ({
  on: false,
  from: null,
  canTurnOn: true,
  blockedBy: null,
  otherSurvey: null,
  invited: 0,
  waiting: 0,
  minBatch: 3,
  linkDays: 30,
  canSend: true,
  ...over,
})

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyApplicantInvitesPanel surveyId="s1" />
    </QueryClientProvider>,
  )

beforeEach(() => apiJson.mockReset())

describe('Invite job applicants', () => {
  it('turns invitations on, saying another survey will stop inviting', async () => {
    apiJson.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? { data: status({ on: true, from: '2026-11-07T10:00:00Z', waiting: 2 }) } : { data: status({ otherSurvey: { id: 's0', title: 'Last quarter' } }) },
    )
    wrap()
    expect(await screen.findByText(/Applicants are invited to “Last quarter” now/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Invite job applicants' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/applicant-invites', { method: 'PUT', body: JSON.stringify({ on: true }) }))
    expect(await screen.findByText('On since 7 November 2026')).toBeInTheDocument()
    expect(screen.getByTestId('applicant-invites-counts')).toHaveTextContent('0 invited so far · 2 waiting (they go once 3 are waiting)')
    expect(screen.getByRole('button', { name: 'Stop inviting' })).toBeInTheDocument()
  })

  it('says why a survey cannot invite applicants', async () => {
    apiJson.mockResolvedValue({ data: status({ canTurnOn: false, blockedBy: 'A repeating survey cannot invite applicants.' }) })
    wrap()
    expect(await screen.findByText('A repeating survey cannot invite applicants.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invite job applicants' })).not.toBeInTheDocument()
  })
})
