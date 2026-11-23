import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const apiJson = vi.fn()
vi.mock('@/shared/api/api-client', () => ({
  apiJson: (...a: unknown[]) => apiJson(...a),
  apiBlob: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
const can = vi.fn((_perm?: string) => true)
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (sel: (s: { can: (p: string) => boolean }) => unknown) => sel({ can }),
}))

import MockInspectionSettingsPage, { settingsProblem } from './pages/MockInspectionSettingsPage'

const DEFAULTS = { metPoints: 2, partlyMetPoints: 1, notMetPoints: 0, score4Percent: 100, score3Percent: 75, score2Percent: 50 }

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MockInspectionSettingsPage />
    </QueryClientProvider>,
  )

beforeEach(() => {
  apiJson.mockReset()
  can.mockReturnValue(true)
  apiJson.mockImplementation(async (_url: string, init?: { method?: string; body?: string }) =>
    init?.method === 'PUT'
      ? { data: { ...JSON.parse(init.body ?? '{}'), defaults: DEFAULTS } }
      : { data: { ...DEFAULTS, defaults: DEFAULTS } },
  )
})

describe('mock inspection settings', () => {
  it('shows the % for each score and a worked example', async () => {
    wrap()
    expect(await screen.findByTestId('mock-settings-score4Percent')).toHaveValue(100)
    expect(screen.getByTestId('mock-settings-score3Percent')).toHaveValue(75)
    expect(screen.getByTestId('mock-settings-score2Percent')).toHaveValue(50)
    expect(screen.getByTestId('mock-settings-level-3')).toHaveTextContent('Score 3 Good standard')
    expect(screen.getByTestId('mock-settings-level-1')).toHaveTextContent('Score 1 Significant shortfallsif less than 50%')
    // Met, Partially met, Not met: 3 of 6 = 50% → 2.
    const example = screen.getByTestId('mock-settings-example')
    expect(example).toHaveTextContent('Check 1Met2 points')
    expect(example).toHaveTextContent('Check 3Not met0 points')
expect(example).not.toHaveTextContent('Check 4')
    expect(example).toHaveTextContent('3 of 6 points is 50%, so this statement scores 2 (Some shortfalls).')
    expect(screen.getByTestId('mock-settings-how')).toHaveTextContent('Met 2, Partially met 1, Not met 0')
  })

  it('saves new points and levels', async () => {
    wrap()
    fireEvent.click(await screen.findByTestId('mock-settings-tab-points'))
    fireEvent.change(screen.getByTestId('mock-settings-metPoints'), { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('mock-settings-tab-levels'))
    fireEvent.change(screen.getByTestId('mock-settings-score3Percent'), { target: { value: '60' } })
    fireEvent.click(screen.getByTestId('mock-settings-save'))
    await waitFor(() => expect(screen.getByTestId('mock-settings-saved')).toBeInTheDocument())
    const put = apiJson.mock.calls.find(c => (c[1] as { method?: string } | undefined)?.method === 'PUT')
    expect(put?.[0]).toBe('/cqc-mock-inspections/settings')
    expect(JSON.parse((put?.[1] as { body: string }).body)).toEqual({ ...DEFAULTS, metPoints: 3, score3Percent: 60 })
  })

  it('will not save settings that are out of order', async () => {
    wrap()
    fireEvent.change(await screen.findByTestId('mock-settings-score3Percent'), { target: { value: '40' } })
    expect(screen.getByTestId('mock-settings-problem')).toHaveTextContent('Each score must need a higher %')
    expect(screen.getByTestId('mock-settings-save')).toBeDisabled()
  })

  it('is read-only for people who cannot manage mock inspections', async () => {
    can.mockReturnValue(false)
    wrap()
    expect(await screen.findByTestId('mock-settings-score3Percent')).toBeDisabled()
    expect(screen.queryByTestId('mock-settings-save')).not.toBeInTheDocument()
  })

  it('checks the same rules as the server', () => {
    expect(settingsProblem(DEFAULTS)).toBeNull()
    expect(settingsProblem({ ...DEFAULTS, partlyMetPoints: 2 })).toMatch(/Met must score more/)
  })
})
