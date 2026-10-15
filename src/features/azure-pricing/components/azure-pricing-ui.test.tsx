import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CostOverview, PlatformCostSettings } from '@/features/azure-pricing/types'

const overviewState: { data: CostOverview | undefined; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
}

vi.mock('@/features/azure-pricing/hooks/useAzurePricing', () => ({
  useCostOverview: () => ({ ...overviewState, error: null, refetch: vi.fn(), isFetching: false }),
}))

import { CostSettingsForm } from '@/features/azure-pricing/components/CostSettingsForm'
import { BudgetCard } from '@/features/azure-pricing/components/BudgetCard'
import { OverviewTab } from '@/features/azure-pricing/components/OverviewTab'

const SETTINGS: PlatformCostSettings = {
  anomalyThresholdPercent: 50,
  anomalyMinDailyIncrease: 1,
  monthlyReportEnabled: true,
  monthlyReportRecipients: ['ops@careflow.co.uk'],
  updatedAt: null,
  updatedBy: null,
}

function overview(partial: Partial<CostOverview> = {}): CostOverview {
  return {
    enabled: true,
    currency: 'GBP',
    lastSyncedAt: '2026-09-30T06:00:00Z',
    dataThrough: '2026-09-29',
    monthToDate: 23.4,
    forecastMonthEnd: 61.2,
    lastMonthTotal: 40,
    lastMonthSamePeriod: 20,
    changeVsLastMonthPercent: 17,
    budget: null,
    dailyTrend: [{ date: '2026-09-01', cost: 1.23 }],
    byService: [{ key: 'pg', label: 'Azure Database for PostgreSQL', cost: 10.1, share: 43.2 }],
    topResources: [
      {
        key: '/subscriptions/x/psql-allforcare-prod',
        label: 'psql-allforcare-prod',
        resourceGroup: 'rg-careflow-prod',
        service: 'Azure Database for PostgreSQL',
        cost: 10.1,
        share: 43.2,
      },
    ],
    openAnomalies: 0,
    ...partial,
  }
}

describe('CostSettingsForm', () => {
  it('adds a recipient, rejects an invalid address and saves a clean payload', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<CostSettingsForm settings={SETTINGS} canManage onSave={onSave} />)

    const recipientInput = screen.getByLabelText('Recipients')
    await userEvent.type(recipientInput, 'not-an-email{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address')

    await userEvent.clear(recipientInput)
    await userEvent.type(recipientInput, 'Finance@Careflow.co.uk')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    const list = screen.getByRole('list', { name: 'Report recipients' })
    expect(within(list).getByText('finance@careflow.co.uk')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove ops@careflow.co.uk' }))

    const threshold = screen.getByLabelText('Threshold above 7-day average (%)')
    await userEvent.clear(threshold)
    await userEvent.type(threshold, '80')

    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(onSave).toHaveBeenCalledWith({
      anomalyThresholdPercent: 80,
      anomalyMinDailyIncrease: 1,
      monthlyReportEnabled: true,
      monthlyReportRecipients: ['finance@careflow.co.uk'],
    })
  })

  it('blocks saving with no recipients while the report is on', async () => {
    const onSave = vi.fn()
    render(<CostSettingsForm settings={SETTINGS} canManage onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove ops@careflow.co.uk' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/at least one recipient/i)
  })

  it('is read-only without the manage permission', () => {
    render(<CostSettingsForm settings={SETTINGS} canManage={false} onSave={vi.fn()} />)
    expect(screen.getByLabelText('Threshold above 7-day average (%)')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Manage platform costs/)).toBeInTheDocument()
  })
})

describe('BudgetCard', () => {
  it('colours the bar by threshold band and marks reached thresholds', () => {
    render(
      <BudgetCard
        currency="GBP"
        budget={{
          name: 'budget-careflow-prod',
          amount: 100,
          timeGrain: 'Monthly',
          currentSpend: 72,
          percentUsed: 72,
          forecastPercent: 104,
          thresholds: [
            { percent: 50, type: 'Actual', reached: true },
            { percent: 70, type: 'Actual', reached: true },
            { percent: 85, type: 'Actual', reached: false },
            { percent: 95, type: 'Actual', reached: false },
          ],
        }}
      />,
    )
    const bar = screen.getByRole('progressbar', { name: 'Budget used' })
    expect(bar).toHaveAttribute('data-tone', 'warning')
    expect(bar).toHaveAttribute('aria-valuenow', '72')
    const thresholds = within(screen.getByRole('list', { name: 'Budget alert thresholds' })).getAllByRole('listitem')
    expect(thresholds.map(li => li.textContent)).toEqual([
      '50% reached',
      '70% reached',
      '85% not reached',
      '95% not reached',
    ])
    expect(screen.getByText(/£72\.00 of £100\.00/)).toBeInTheDocument()
  })

  it('explains when no budget exists', () => {
    render(<BudgetCard currency="GBP" budget={null} />)
    expect(screen.getByText('No budget found')).toBeInTheDocument()
  })
})

describe('OverviewTab', () => {
  it('shows the switched-off empty state before the first sync', () => {
    overviewState.data = overview({ enabled: false, lastSyncedAt: null })
    render(<OverviewTab onNavigateTab={vi.fn()} />)
    expect(screen.getByText('Azure cost tracking is switched off')).toBeInTheDocument()
  })

  it('renders KPIs and links open anomalies to the Alerts tab', async () => {
    const onNavigateTab = vi.fn()
    overviewState.data = overview({ openAnomalies: 2 })
    render(<OverviewTab onNavigateTab={onNavigateTab} />)
    expect(screen.getByTestId('azure-kpi-mtd')).toHaveTextContent('£23.40')
    expect(screen.getByTestId('azure-kpi-forecast')).toHaveTextContent('£61.20')
    expect(screen.getByTestId('azure-kpi-change')).toHaveTextContent('+17.0%')
    expect(screen.getByText('psql-allforcare-prod')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /View alerts/ }))
    expect(onNavigateTab).toHaveBeenCalledWith('alerts')
  })
})
