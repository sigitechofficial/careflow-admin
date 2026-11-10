import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({ apiJson: (...a: unknown[]) => apiJson(...a) }))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))
vi.mock('@/features/surveys/api/surveys.api', () => ({ buildSurveyShareUrl: (t: string) => `https://app/survey/${t}` }))

import { SurveyBranchLinksPanel } from '@/features/surveys/components/SurveyBranchLinksPanel'
import { ALL_AUDIENCE_GROUPS, SURVEY_AUDIENCE_GROUPS } from '@/features/surveys/survey-audience-groups'

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SurveyBranchLinksPanel surveyId="s1" />
    </QueryClientProvider>,
  )

describe('SurveyBranchLinksPanel', () => {
  beforeEach(() => {
    apiJson.mockReset()
    apiJson.mockImplementation(async (_url: string, init?: { method?: string }) =>
      init?.method === 'GET'
        ? {
            data: {
              main: { token: 'main' },
              branches: [{ id: 'l1', token: 'leeds-token', locationId: 'loc-leeds', locationName: 'Leeds', createdAt: '2026-11-06' }],
              availableBranches: [{ id: 'loc-york', name: 'York' }],
            },
          }
        : { data: {} },
    )
  })

  it('lists branch links and makes one for another branch', async () => {
    renderPanel()
    expect(await screen.findByText('https://app/survey/leeds-token')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Branch'), { target: { value: 'loc-york' } })
    fireEvent.click(screen.getByRole('button', { name: 'Make a link' }))
    await waitFor(() =>
      expect(apiJson).toHaveBeenCalledWith('/surveys/s1/share-links', { method: 'POST', body: JSON.stringify({ locationId: 'loc-york' }) }),
    )
  })

  it('replaces a leaked link (the old one stops working) or turns it off', async () => {
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /New link/ }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/share-links/l1?replace=true', { method: 'DELETE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Turn off the link for Leeds' }))
    await waitFor(() => expect(apiJson).toHaveBeenCalledWith('/surveys/s1/share-links/l1', { method: 'DELETE' }))
  })
})

describe("who it's for groups", () => {
  it('match the API, with Several groups for each audience and no duplicates in the filter', () => {
    for (const kind of ['PUBLIC', 'EMPLOYEE', 'SERVICE_USER'] as const) {
      expect(SURVEY_AUDIENCE_GROUPS[kind].map(g => g.code)).toContain('SEVERAL')
      expect(SURVEY_AUDIENCE_GROUPS[kind].map(g => g.code)).toContain('OTHER')
    }
    expect(SURVEY_AUDIENCE_GROUPS.PUBLIC.map(g => g.code)).toEqual(expect.arrayContaining(['PEOPLE_WE_SUPPORT', 'ADVOCATES']))
    const codes = ALL_AUDIENCE_GROUPS.map(g => g.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
