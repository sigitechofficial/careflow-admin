import * as React from 'react'
import { AlertTriangle, CheckCircle2, Eye, Users } from 'lucide-react'
import { StatCard } from '@/shared/ui/card'
import { Combobox } from '@/shared/ui/combobox'
import { EmptyState } from '@/shared/ui/page-elements'
import { Skeleton } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'
import { PolicyAcknowledgementBadge } from '@/features/policies/components/PolicyAcknowledgementBadge'
import { usePolicyAcknowledgementReport } from '@/features/policies/hooks/usePolicyAcknowledgements'
import { formatPolicyDate } from '@/features/policies/policy-format'
import { policyErrorCopy } from '@/features/policies/policy-error'
import type { PolicyAcknowledgementReportRow } from '@/features/policies/types/policy.types'

export type StaffAcknowledgementFilter = 'all' | 'outstanding' | 'overdue'

const FILTER_OPTIONS: Array<{ value: StaffAcknowledgementFilter; label: string }> = [
  { value: 'all', label: 'All staff' },
  { value: 'outstanding', label: 'Not acknowledged' },
  { value: 'overdue', label: 'Overdue' },
]

export function filterStaffAcknowledgements(
  rows: PolicyAcknowledgementReportRow[],
  filter: StaffAcknowledgementFilter,
): PolicyAcknowledgementReportRow[] {
  if (filter === 'outstanding') return rows.filter(row => row.status !== 'ACKNOWLEDGED')
  if (filter === 'overdue') return rows.filter(row => row.overdue)
  return rows
}

/** Manager view: who has read and acknowledged the current published version. */
export function PolicyStaffAcknowledgements({ documentId }: { documentId: string }) {
  const reportQuery = usePolicyAcknowledgementReport(documentId)
  const [filter, setFilter] = React.useState<StaffAcknowledgementFilter>('all')
  const report = reportQuery.data

  // Links from the weekly manager summary open /policies/:id#staff-acknowledgements.
  const loaded = Boolean(report)
  React.useEffect(() => {
    if (!loaded || window.location.hash !== '#staff-acknowledgements') return
    document.getElementById('staff-acknowledgements')?.scrollIntoView({ block: 'start' })
  }, [loaded])

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-2" data-testid="policy-staff-acknowledgements-loading">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (reportQuery.isError || !report) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {policyErrorCopy(reportQuery.error).message}
      </p>
    )
  }

  const rows = filterStaffAcknowledgements(report.rows, filter)
  const { totals } = report

  return (
    <div className="space-y-4" data-testid="policy-staff-acknowledgements">
      <p className="text-sm text-muted-foreground">
        {report.versionLabel} published {formatPolicyDate(report.publishedAt)}. Staff have {report.dueWithinDays} days to
        read and acknowledge it.
        {report.branchScoped ? ' Showing staff in your branches only.' : ''}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Need to acknowledge" value={totals.required} icon={<Users className="h-5 w-5" aria-hidden />} tone="primary" />
        <StatCard
          label="Acknowledged"
          value={totals.acknowledged}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
          tone="success"
        />
        <StatCard label="Opened only" value={totals.viewedOnly} icon={<Eye className="h-5 w-5" aria-hidden />} tone="sky" />
        <StatCard label="Not opened" value={totals.notOpened} icon={<Eye className="h-5 w-5" aria-hidden />} tone="muted" />
        <StatCard
          label="Overdue"
          value={totals.overdue}
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          tone={totals.overdue ? 'destructive' : 'muted'}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Combobox
          className="w-52"
          value={filter}
          onChange={v => setFilter((v || 'all') as StaffAcknowledgementFilter)}
          options={FILTER_OPTIONS}
          allowDeselect={false}
          aria-label="Show"
        />
        <span className="text-sm text-muted-foreground" data-testid="policy-staff-acknowledgements-count">
          {rows.length} of {report.rows.length} staff
        </span>
      </div>

      {report.rows.length === 0 ? (
        <EmptyState
          title="No staff need to acknowledge this policy"
          description="No active employees in your branches match this policy's audience and applicability."
        />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No staff match this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm" data-testid="policy-staff-acknowledgements-table">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Job title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Opened</th>
                <th className="px-3 py-2">Acknowledged</th>
                <th className="px-3 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.employeeId}
                  className={cn('border-t border-border', row.overdue && 'bg-destructive/5')}
                  data-testid="policy-staff-acknowledgement-row"
                >
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.branch ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.jobTitle ?? '—'}</td>
                  <td className="px-3 py-2">
                    <PolicyAcknowledgementBadge status={row.status} overdue={row.overdue} />
                  </td>
                  <td className="px-3 py-2">{formatPolicyDate(row.viewedAt)}</td>
                  <td className="px-3 py-2">{formatPolicyDate(row.acknowledgedAt)}</td>
                  <td className={cn('px-3 py-2', row.overdue && 'font-medium text-destructive')}>
                    {formatPolicyDate(row.dueAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
