import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
const perms = new Set<string>()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (pick: (s: { can: (p: string) => boolean }) => unknown) => pick({ can: (p: string) => perms.has(p) }),
}))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }))

import SurveyBenchmarksPage, { type BenchmarkComparison, type BenchmarkStatus } from './SurveyBenchmarksPage'

const status = (over: Partial<BenchmarkStatus> = {}): BenchmarkStatus => ({
  sharing: false,
  agreement: { version: 'CF-SBDSA-1', text: ['We agree to share anonymised survey figures.', 'Our name is never shown to other agencies.'] },
  agreed: null,
  agreementOutdated: false,
  serviceConnected: true,
  lastSyncedAt: null,
  lastSyncError: null,
  canChange: true,
  minAnswers: 10,
  minOrganisations: 5,
  wouldShare: [{ reference: 'SUR-PWS-001', questionKey: 'q1', percent: 90, band: '10-29', surveyTitle: 'Your care', questionText: 'Do you feel safe?' }],
  ...over,
})

const compared: BenchmarkComparison = {
  sharing: true,
  surveys: [
    {
      reference: 'SUR-PWS-001',
      title: 'Your care',
      questions: [
        { key: 'q1', questionText: 'Do you feel safe?', ours: { percent: 62, band: '10-29' }, sector: { organisations: 7, median: 85, lowerQuartile: 78, upperQuartile: 91 } },
        { key: 'q2', questionText: 'Are you listened to?', ours: { percent: 80, band: '10-29' }, sector: null },
      ],
    },
  ],
}

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyBenchmarksPage />
    </QueryClientProvider>,
  )

beforeEach(() => {
  apiJson.mockReset()
  perms.clear()
})

describe('Compared with other agencies', () => {
  it('shows the agreement and exactly what is shared, and agrees only once ticked', async () => {
    perms.add('surveys.manage')
    apiJson.mockImplementation(async (url: string, init: RequestInit) => {
      if (url === '/surveys-benchmarks/compare') return { data: { sharing: false, surveys: [] } }
      if (init.method === 'PUT') return { data: status({ sharing: true, agreed: { version: 'CF-SBDSA-1', at: '2026-11-07T10:00:00Z', by: 'Sam Lee' } }) }
      return { data: status() }
    })
    wrap()
    expect(await screen.findByText('Our name is never shown to other agencies.')).toBeInTheDocument()
    expect(screen.getByTestId('benchmark-would-share')).toHaveTextContent('Shared now: 1 figure from 1 ready-made survey.')
    expect(screen.getByText('Do you feel safe?')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Agree and share' })
    expect(button).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/I have read the agreement/))
    fireEvent.click(button)
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys-benchmarks', { method: 'PUT', body: JSON.stringify({ sharing: true, agreementVersion: 'CF-SBDSA-1' }) }))
    expect(await screen.findByText(/Agreed on 7 Nov 2026 by Sam Lee/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument()
  })

  it('without the company-settings permission, says who must agree', async () => {
    perms.add('surveys.manage')
    apiJson.mockImplementation(async (url: string) => (url === '/surveys-benchmarks/compare' ? { data: { sharing: false, surveys: [] } } : { data: status({ canChange: false }) }))
    wrap()
    expect(await screen.findByText(/Someone who can change the company settings must agree/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agree and share' })).toBeNull()
  })

  it('compares our figures with the middle agency and the middle half', async () => {
    perms.add('surveys.read')
    apiJson.mockResolvedValue({ data: compared })
    wrap()
    const table = await screen.findByRole('table', { name: 'Your care: our figures beside other agencies' })
    const safe = within(table).getByRole('row', { name: /Do you feel safe/ })
    expect(safe).toHaveTextContent('62%')
    expect(safe).toHaveTextContent('85%7 agencies')
    expect(safe).toHaveTextContent('78% to 91%')
    expect(safe).toHaveTextContent('Below most agencies')
    expect(within(table).getByRole('row', { name: /Are you listened to/ })).toHaveTextContent('Not enough agencies yet')
    expect(screen.queryByTestId('benchmark-sharing')).toBeNull()
  })
})
