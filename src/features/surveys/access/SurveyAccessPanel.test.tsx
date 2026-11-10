import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SurveyAccessPayload } from '@/features/surveys/access/SurveyAccessPanel'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SurveyAccessPanel } from '@/features/surveys/access/SurveyAccessPanel'

const level = (over = {}) => ({ restricted: false, ownerKeys: [], roleIds: [], userIds: [], roles: [], people: [], ...over })
const payload = (over: Partial<SurveyAccessPayload> = {}): SurveyAccessPayload => ({
  surveyId: 's1',
  editedOnSurveyId: null,
  source: 'ready-made',
  canConfigure: true,
  you: { results: true, responses: true },
  responses: level({ restricted: true, ownerKeys: [{ key: 'HR_MANAGER', label: 'HR manager' }] }),
  results: level({ restricted: true, ownerKeys: [{ key: 'HR_MANAGER', label: 'HR manager' }, { key: 'REGISTERED_MANAGER', label: 'Registered Manager' }] }),
  reportingThreshold: { inForce: 5, own: null, readyMade: 5, minimum: 5, maximum: 50 },
  readyMadeDefault: { responses: ['HR manager'], results: ['HR manager', 'Registered Manager'] },
  owners: [
    { key: 'HR_MANAGER', label: 'HR manager' },
    { key: 'REGISTERED_MANAGER', label: 'Registered Manager' },
  ],
  roles: [{ id: 'r1', name: 'HR' }],
  alwaysIncluded: 'Super Admin, Admin and the person who made the survey',
  ...over,
})

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyAccessPanel surveyId="s1" />
    </QueryClientProvider>,
  )

describe('SurveyAccessPanel', () => {
  beforeEach(() => apiJson.mockReset())

  it('shows three tiles: who sees individual answers, who sees results (as chips), and from how many answers', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    renderPanel()
    expect(await screen.findByRole('heading', { level: 3, name: 'Who can see the answers' })).toBeInTheDocument()
    const tile = (label: string) => screen.getByText(label).closest('div')!
    expect(within(tile('Individual answers')).getByText('Restricted')).toBeInTheDocument()
    expect(within(tile('Individual answers')).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['HR manager'])
    expect(within(tile('Results')).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['HR manager', 'Registered Manager'])
    expect(within(tile('Results show from')).getByText('5 answers')).toBeInTheDocument()
    expect(screen.getByText(/ready-made survey’s settings/)).toBeInTheDocument()
    expect(screen.getByText(/can always see them/)).toBeInTheDocument()
  })

  it('an open survey says so plainly, with no lock', async () => {
    apiJson.mockResolvedValue({ data: payload({ source: 'open', responses: level(), results: level(), reportingThreshold: { inForce: 0, own: null, readyMade: null, minimum: 1, maximum: 50 } }) })
    renderPanel()
    expect(await screen.findAllByText('Everyone who can see surveys')).toHaveLength(2)
    expect(screen.queryByText('Restricted')).not.toBeInTheDocument()
    expect(screen.getByText('The first answer')).toBeInTheDocument()
  })

  it('refuses a threshold below 5 on a survey answered without names, and saves a valid one', async () => {
    apiJson.mockResolvedValue({ data: payload() })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    const input = screen.getByLabelText('Answers needed before results show')
    fireEvent.change(input, { target: { value: '3' } })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(apiJson.mock.calls.filter((c) => c[1]?.method === 'PUT' && !JSON.parse(c[1].body).dryRun)).toHaveLength(1))
    const body = JSON.parse(apiJson.mock.calls.find((c) => c[1]?.method === 'PUT' && !JSON.parse(c[1].body).dryRun)![1].body)
    expect(body).toMatchObject({ reportingThreshold: 10, responses: { restricted: true, ownerKeys: ['HR_MANAGER'] } })
  })

  it('warns about alerts whose role could no longer see the results before saving', async () => {
    apiJson.mockImplementation(async (_url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT' && JSON.parse(init.body ?? '{}').dryRun) {
        return { data: { affectedRules: [{ id: 'r1', title: 'Feels unsafe', role: 'Care Coordinator' }] } }
      }
      return { data: payload() }
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByTestId('access-affected-rules')).toHaveTextContent('Feels unsafe (Care Coordinator)')
    expect(apiJson.mock.calls.filter((c) => c[1]?.method === 'PUT')).toHaveLength(1) // nothing saved yet
    fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }))
    await waitFor(() => expect(apiJson.mock.calls.filter((c) => c[1]?.method === 'PUT')).toHaveLength(2))
  })

  it('offers no change to someone who cannot set it', async () => {
    apiJson.mockResolvedValue({ data: payload({ canConfigure: false }) })
    renderPanel()
    await screen.findByText('5 answers')
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
  })
})
