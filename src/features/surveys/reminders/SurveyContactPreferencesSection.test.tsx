import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
const perms = new Set<string>()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: (p: string) => boolean }) => unknown) => pick({ can: (p: string) => perms.has(p) }),
}))

import { SurveyContactPreferencesSection } from './SurveyContactPreferencesSection'

const renderSection = (subjectKind: 'EMPLOYEE' | 'SERVICE_USER' | 'CANDIDATE' = 'EMPLOYEE') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyContactPreferencesSection subjectKind={subjectKind} subjectId="p1" />
    </QueryClientProvider>,
  )

beforeEach(() => {
  apiJson.mockReset()
  perms.clear()
})

describe('SurveyContactPreferencesSection', () => {
  it('is hidden without survey access', () => {
    renderSection()
    expect(screen.queryByTestId('survey-contact-preferences')).toBeNull()
    expect(apiJson).not.toHaveBeenCalled()
  })

  it('saves the ways a person does not want to be contacted', async () => {
    perms.add('surveys.manage')
    apiJson.mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === 'GET' ? { data: { channels: [], reason: null, since: null } } : { data: {} },
    )
    renderSection()
    fireEvent.click(await screen.findByLabelText('Text messages'))
    fireEvent.change(screen.getByPlaceholderText(/asked at their review/), { target: { value: 'Asked at review' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save survey contact preferences' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys-contact-preferences', expect.objectContaining({ method: 'PUT' })))
    const put = apiJson.mock.calls.find((c) => c[1].method === 'PUT')!
    expect(JSON.parse(put[1].body)).toEqual({ subjectKind: 'EMPLOYEE', subjectId: 'p1', channels: ['TEXT'], reason: 'Asked at review' })
  })

  it('offers portal emails for people we support, says when they replied STOP, and is read-only without surveys.manage', async () => {
    perms.add('surveys.read')
    apiJson.mockResolvedValue({ data: { channels: ['TEXT'], reason: null, since: '2026-11-02T10:00:00.000Z', stoppedByText: { since: '2026-11-02T10:00:00.000Z' } } })
    renderSection('SERVICE_USER')
    expect(await screen.findByLabelText('Portal emails')).toBeDisabled()
    expect(screen.getByLabelText('Text messages')).toBeChecked()
    expect(screen.getByText(/They replied STOP to a survey text/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save survey contact preferences' })).toBeNull()
  })

  it('keeps a job applicant out of survey invitations altogether (they are only ever emailed)', async () => {
    perms.add('surveys.manage')
    apiJson.mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === 'GET' ? { data: { channels: [], reason: null, since: null } } : { data: {} },
    )
    renderSection('CANDIDATE')
    fireEvent.click(await screen.findByLabelText('Do not contact them about surveys at all'))
    expect(screen.getByText(/Disclosure and Barring Service/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save survey contact preferences' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys-contact-preferences', expect.objectContaining({ method: 'PUT' })))
    const put = apiJson.mock.calls.find((c) => c[1].method === 'PUT')!
    expect(JSON.parse(put[1].body)).toEqual({ subjectKind: 'CANDIDATE', subjectId: 'p1', channels: ['ALL'], reason: null })
  })
})
