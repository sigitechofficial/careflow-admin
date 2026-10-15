import { Eye, Mail, RefreshCw } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ApiError } from '@/shared/api/api-client'
import { extractApiErrorMessage, toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import {
  usePlatformCostSettings,
  usePreviewMonthlyReport,
  useSendMonthlyReportTest,
  useSyncRuns,
  useTriggerCostSync,
  useUpdatePlatformCostSettings,
} from '@/features/azure-pricing/hooks/useAzurePricing'
import type { PlatformCostSettingsInput, SyncRun } from '@/features/azure-pricing/types'
import { formatCount, formatDateTimeGb, formatDuration } from '@/features/azure-pricing/lib/azure-pricing-format'
import {
  LoadingRegion,
  PanelCard,
  TabErrorState,
  TableSkeleton,
} from '@/features/azure-pricing/components/AzurePricingShared'
import { CostSettingsForm } from '@/features/azure-pricing/components/CostSettingsForm'

const KIND_LABELS: Record<string, string> = {
  costs: 'Costs',
  prices: 'Prices',
  budgets: 'Budgets',
  forecast: 'Forecast',
  advisor: 'Advisor',
}

function SyncStatusBadge({ status }: { status: SyncRun['status'] }) {
  if (status === 'success') return <Badge variant="success">Success</Badge>
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>
  return (
    <Badge variant="info" dot>
      Running
    </Badge>
  )
}

function SettingsPanel({ canManage }: { canManage: boolean }) {
  const query = usePlatformCostSettings()
  const saveMut = useUpdatePlatformCostSettings()

  const onSave = async (payload: PlatformCostSettingsInput) => {
    try {
      await saveMut.mutateAsync(payload)
      toastSuccess('Settings saved')
    } catch (e) {
      toastApiError(e, 'Could not save settings')
    }
  }

  return (
    <PanelCard title="Alerts & report settings" data-testid="azure-settings">
      {query.isLoading ? (
        <LoadingRegion label="Loading settings">
          <TableSkeleton rows={4} />
        </LoadingRegion>
      ) : query.isError || !query.data ? (
        <TabErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : (
        <CostSettingsForm settings={query.data} canManage={canManage} saving={saveMut.isPending} onSave={onSave} />
      )}
    </PanelCard>
  )
}

function SyncRunsPanel({ canManage }: { canManage: boolean }) {
  const query = useSyncRuns(20)
  const syncMut = useTriggerCostSync()
  const items = query.data?.items ?? []

  const onSync = async () => {
    try {
      await syncMut.mutateAsync()
      toastSuccess('Sync started', 'New costs usually appear within a few minutes of the run finishing.')
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        toastWarning('Sync already requested recently', extractApiErrorMessage(e))
      } else {
        toastApiError(e, 'Could not start a sync')
      }
    }
  }

  return (
    <PanelCard
      title="Sync runs"
      description="Background jobs that pull costs, prices, budgets, forecasts and Advisor data from Azure"
      bodyClassName="p-0"
      data-testid="azure-sync-runs"
      action={
        canManage ? (
          <Button
            size="sm"
            onClick={() => void onSync()}
            loading={syncMut.isPending}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
          >
            Sync now
          </Button>
        ) : null
      }
    >
      {query.isLoading ? (
        <div className="p-4">
          <LoadingRegion label="Loading sync runs">
            <TableSkeleton rows={5} />
          </LoadingRegion>
        </div>
      ) : query.isError ? (
        <div className="p-4">
          <TabErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        </div>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No sync runs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Kind</th>
                <th scope="col" className="px-4 py-2 font-medium">Trigger</th>
                <th scope="col" className="px-4 py-2 font-medium">Status</th>
                <th scope="col" className="px-4 py-2 font-medium">Started</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Duration</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Rows</th>
                <th scope="col" className="px-4 py-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(run => (
                <tr key={run.id}>
                  <td className="whitespace-nowrap px-4 py-2 font-medium">{KIND_LABELS[run.kind] ?? run.kind}</td>
                  <td className="whitespace-nowrap px-4 py-2 capitalize text-muted-foreground">{run.trigger}</td>
                  <td className="px-4 py-2">
                    <SyncStatusBadge status={run.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatDateTimeGb(run.startedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCount(run.rowsUpserted)}</td>
                  <td className="max-w-[20rem] px-4 py-2 text-xs text-destructive">
                    {run.error ? (
                      <span className="line-clamp-2" title={run.error}>
                        {run.error}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  )
}

function MonthlyReportPanel() {
  const previewMut = usePreviewMonthlyReport()
  const sendMut = useSendMonthlyReportTest()
  const userEmail = useAuthStore(s => s.user?.email)

  const onPreview = async () => {
    try {
      await previewMut.mutateAsync()
    } catch (e) {
      toastApiError(e, 'Could not build the report preview')
    }
  }

  const onSendTest = async () => {
    try {
      await sendMut.mutateAsync()
      toastSuccess('Test report sent', userEmail ? `Check the inbox for ${userEmail}.` : 'Check your inbox.')
    } catch (e) {
      toastApiError(e, 'Could not send the test report')
    }
  }

  const preview = previewMut.data

  return (
    <PanelCard
      title="Monthly report"
      description="Preview last month's cost email, or send a test copy to yourself only"
      data-testid="azure-report-preview"
      action={
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onPreview()}
            loading={previewMut.isPending}
            leftIcon={<Eye className="h-4 w-4" aria-hidden />}
          >
            {preview ? 'Refresh preview' : 'Preview'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onSendTest()}
            loading={sendMut.isPending}
            leftIcon={<Mail className="h-4 w-4" aria-hidden />}
          >
            Send test to me
          </Button>
        </>
      }
    >
      {preview ? (
        <div className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Subject: </span>
            <span className="font-medium text-foreground">{preview.subject}</span>
          </p>
          {/* Empty sandbox: no scripts, no same-origin access, no forms or navigation. */}
          <iframe
            title="Monthly report preview"
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={preview.html}
            className="h-[32rem] w-full rounded-lg border border-border bg-white"
          />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Select <span className="font-medium text-foreground">Preview</span> to see the email recipients will get on the
          1st of the month.
        </p>
      )}
    </PanelCard>
  )
}

export function ReportsSettingsTab() {
  const canManage = useAuthStore(s => s.can('platform_costs.manage'))
  return (
    <div className="space-y-4" data-testid="azure-reports">
      <div className={canManage ? 'grid gap-4 xl:grid-cols-2' : 'grid gap-4'}>
        <SettingsPanel canManage={canManage} />
        {canManage ? <MonthlyReportPanel /> : null}
      </div>
      <SyncRunsPanel canManage={canManage} />
    </div>
  )
}
