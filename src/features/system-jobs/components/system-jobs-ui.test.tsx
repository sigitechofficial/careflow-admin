import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { useToastStore } from '@/store/toast.store'
import type { AuthUser, Permission } from '@/features/auth/types'
import type { JobRun, SystemJob, SystemJobsOverview } from '@/features/system-jobs/types'

/* ─── Mocks ─────────────────────────────────────────────────────────────── */

const navigate = vi.fn()
let currentSearch: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouterState: ({ select }: { select: (s: { location: { search: Record<string, unknown> } }) => unknown }) =>
    select({ location: { search: currentSearch } }),
}))

const api = vi.hoisted(() => ({
  fetchSystemJobs: vi.fn(),
  fetchJobRuns: vi.fn(),
  runJobNow: vi.fn(),
}))
vi.mock('@/features/system-jobs/api/system-jobs.api', () => api)

import SystemJobsPage from '@/features/system-jobs/pages/SystemJobsPage'

/* ─── Fixtures (test-only) ──────────────────────────────────────────────── */

const SERVER_TIME = '2026-10-02T12:00:00.000Z'

function run(partial: Partial<JobRun> = {}): JobRun {
  return {
    id: 'run-1',
    jobName: 'late-visit-alert',
    periodKey: '2026-10-02T11:55',
    source: 'function',
    status: 'success',
    startedAt: '2026-10-02T11:55:00.000Z',
    finishedAt: '2026-10-02T11:55:02.000Z',
    durationMs: 2000,
    summary: { alerts: 2 },
    error: null,
    triggeredBy: null,
    ...partial,
  }
}

function job(partial: Partial<SystemJob> & Pick<SystemJob, 'name' | 'label'>): SystemJob {
  return {
    description: `${partial.label} description`,
    trigger: 'function',
    schedule: { cron: '0 */5 * * * *', human: 'Every 5 minutes' },
    expectedIntervalMinutes: 5,
    lastRun: run({ jobName: partial.name }),
    lastSuccessAt: '2026-10-02T11:55:02.000Z',
    nextExpectedAt: '2026-10-02T12:00:00.000Z',
    health: 'ok',
    runs24h: 288,
    failures24h: 0,
    successRate24h: 100,
    ...partial,
  }
}

const OVERVIEW: SystemJobsOverview = {
  cronMode: 'external',
  serverTime: SERVER_TIME,
  items: [
    job({ name: 'late-visit-alert', label: 'Late visit alerts' }),
    job({
      name: 'rolling-rota',
      label: 'Rolling rota',
      trigger: 'container-job',
      schedule: { cron: '0 2 * * *', human: 'Daily at 02:00 UTC' },
      expectedIntervalMinutes: 1440,
      health: 'failing',
      lastRun: run({ id: 'run-2', jobName: 'rolling-rota', status: 'failed', error: 'DB timeout', source: 'container-job' }),
      runs24h: 1,
      failures24h: 1,
      successRate24h: 0,
    }),
    job({
      name: 'learning-maintenance',
      label: 'Learning maintenance',
      trigger: 'container-job',
      health: 'never-run',
      lastRun: null,
      lastSuccessAt: null,
      runs24h: 0,
      successRate24h: null,
    }),
  ],
}

function setUser(permissions: Permission[], role: AuthUser['role'] = 'admin') {
  useAuthStore.setState({
    user: { id: 'u1', email: 'admin@example.test', displayName: 'Test Admin', role, permissions },
  })
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SystemJobsPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  currentSearch = {}
  navigate.mockReset()
  api.fetchSystemJobs.mockResolvedValue(OVERVIEW)
  api.fetchJobRuns.mockResolvedValue({ items: [] })
  api.runJobNow.mockReset()
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  useAuthStore.setState({ user: null })
})

/* ─── Tests ─────────────────────────────────────────────────────────────── */

describe('SystemJobsPage', () => {
  it('renders a row per job from the API response with health, trigger and schedule', async () => {
    setUser(['system_jobs.read', 'system_jobs.manage'])
    renderPage()

    const table = await screen.findByRole('table', { name: 'System jobs' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)

    const rota = within(table).getByTestId('system-job-row-rolling-rota')
    expect(within(rota).getByText('Rolling rota')).toBeInTheDocument()
    expect(within(rota).getByText('Container Job')).toBeInTheDocument()
    expect(within(rota).getByText('Daily at 02:00 UTC')).toBeInTheDocument()
    expect(within(rota).getByTestId('job-health-failing')).toHaveTextContent('Failing')
    expect(within(rota).getByText('0%')).toBeInTheDocument()

    const late = within(table).getByTestId('system-job-row-late-visit-alert')
    expect(within(late).getByTestId('job-health-ok')).toHaveTextContent('Healthy')
    expect(within(late).getByText('100%')).toBeInTheDocument()
    expect(within(late).getByText('5 minutes ago')).toBeInTheDocument()

    const learning = within(table).getByTestId('system-job-row-learning-maintenance')
    expect(within(learning).getByTestId('job-health-never-run')).toBeInTheDocument()
    expect(within(learning).getByText('Never')).toBeInTheDocument()

    // Summary cards and external-mode banner.
    expect(screen.getByTestId('system-jobs-card-all')).toHaveTextContent('3')
    expect(screen.getByTestId('system-jobs-card-failing')).toHaveTextContent('1')
    expect(screen.getByTestId('system-jobs-mode-external')).toHaveTextContent('Jobs are triggered by Azure')
  })

  it('shows the fallback banner in internal mode', async () => {
    setUser(['system_jobs.read'])
    api.fetchSystemJobs.mockResolvedValue({ ...OVERVIEW, cronMode: 'internal' })
    renderPage()
    expect(await screen.findByTestId('system-jobs-mode-internal')).toHaveTextContent(
      'Fallback mode: jobs run inside the API',
    )
  })

  it('read-only users see history but no Run now, with an explanatory note', async () => {
    setUser(['system_jobs.read'])
    renderPage()
    const table = await screen.findByRole('table', { name: 'System jobs' })
    expect(within(table).queryByRole('button', { name: /^Run .* now$/ })).not.toBeInTheDocument()
    expect(within(table).getAllByRole('button', { name: /View history for/ })).toHaveLength(3)
    expect(screen.getByTestId('system-jobs-read-only')).toHaveTextContent('read-only access')
  })

  it('managers can run a job: rolling rota warns, confirms and posts', async () => {
    setUser(['system_jobs.read', 'system_jobs.manage'])
    api.runJobNow.mockResolvedValue(run({ jobName: 'rolling-rota', status: 'success', durationMs: 65_000 }))
    renderPage()
    const table = await screen.findByRole('table', { name: 'System jobs' })
    expect(screen.queryByTestId('system-jobs-read-only')).not.toBeInTheDocument()

    await userEvent.click(within(table).getByRole('button', { name: 'Run Rolling rota now' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByTestId('system-jobs-run-warning')).toHaveTextContent(
      'Generates rota for the whole rolling window; existing visits are skipped.',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Run now' }))

    await waitFor(() => expect(api.runJobNow).toHaveBeenCalledWith('rolling-rota'))
    await waitFor(() =>
      expect(useToastStore.getState().toasts.map(t => t.title)).toContain('Rolling rota finished'),
    )
  })

  it('does not warn for light jobs and reports a 429 with the server message', async () => {
    setUser(['system_jobs.read', 'system_jobs.manage'])
    api.runJobNow.mockRejectedValue(
      new ApiError('Late visit alerts was run less than a minute ago', 429, {
        message: 'Late visit alerts was run less than a minute ago',
      }),
    )
    renderPage()
    const table = await screen.findByRole('table', { name: 'System jobs' })
    await userEvent.click(within(table).getByRole('button', { name: 'Run Late visit alerts now' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByTestId('system-jobs-run-warning')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Run now' }))

    await waitFor(() => {
      const warning = useToastStore.getState().toasts.find(t => t.variant === 'warning')
      expect(warning?.description).toBe('Late visit alerts was run less than a minute ago')
    })
  })

  it('summary cards filter via the URL and history opens the drawer link', async () => {
    setUser(['system_jobs.read'])
    renderPage()
    const table = await screen.findByRole('table', { name: 'System jobs' })

    await userEvent.click(screen.getByTestId('system-jobs-card-failing'))
    expect(navigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/system-jobs', search: { health: 'failing' } }),
    )

    await userEvent.click(within(table).getByRole('button', { name: 'View history for Rolling rota' }))
    expect(navigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/system-jobs', search: { job: 'rolling-rota' } }),
    )
  })

  it('filters rows by ?health= and opens run history from ?job=', async () => {
    setUser(['system_jobs.read'])
    currentSearch = { health: 'failing', job: 'rolling-rota' }
    api.fetchJobRuns.mockResolvedValue({
      items: [run({ id: 'run-2', jobName: 'rolling-rota', status: 'failed', error: 'DB timeout', summary: null })],
    })
    renderPage()
    // The open drawer marks the page behind it aria-hidden, so query by test id.
    const table = await screen.findByTestId('system-jobs-table')
    expect(within(table).getAllByRole('row', { hidden: true }).slice(1)).toHaveLength(1)

    const drawer = await screen.findByTestId('system-jobs-detail')
    expect(within(drawer).getByRole('heading', { name: 'Rolling rota' })).toBeInTheDocument()
    await waitFor(() => expect(api.fetchJobRuns).toHaveBeenCalledWith('rolling-rota', { status: 'all', limit: 50 }))
    const runButton = await within(drawer).findByRole('button', { name: /Failed run started/ })
    await userEvent.click(runButton)
    expect(within(drawer).getByText('DB timeout')).toBeInTheDocument()
    expect(within(drawer).getByRole('button', { name: 'Copy error' })).toBeInTheDocument()
  })
})
