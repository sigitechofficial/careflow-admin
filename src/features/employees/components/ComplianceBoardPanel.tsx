import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { StatCard } from '@/shared/ui/card'
import { ContentCard } from '@/shared/ui/content-section'
import { LoadingSpinner } from '@/shared/ui/page-elements'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import { useAuthStore } from '@/features/auth/store'
import { useComplianceBoard } from '@/features/employees/hooks/useEmployeeCompliance'
import type {
  ComplianceBoardCell,
  ComplianceBoardColumn,
  ComplianceBoardDisplayStatus,
  ComplianceBoardNextAction,
} from '@/features/employees/api/employee-compliance-api'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { resolveEmployeeVisaTypes } from '@/features/settings/employee/employee-visa-defaults'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import {
  cellToneClass,
  COMPLIANCE_BOARD_GROUPS,
  presentBoardCell,
} from '@/features/employees/compliance/compliance-board-presentation'

function editSearch(complianceTypeCode?: string | null) {
  return {
    tab: 'employment-compliance' as const,
    ...(complianceTypeCode ? { complianceType: complianceTypeCode } : {}),
  }
}

function displayStatusBadge(status: ComplianceBoardDisplayStatus | undefined, blocked: boolean) {
  const resolved: ComplianceBoardDisplayStatus =
    status ?? (blocked ? 'BLOCKED' : 'COMPLIANT')
  if (resolved === 'BLOCKED') {
    return (
      <Badge variant="solid-destructive" size="sm">
        Blocked
      </Badge>
    )
  }
  if (resolved === 'ATTENTION') {
    return (
      <Badge variant="warning" size="sm">
        Attention
      </Badge>
    )
  }
  return (
    <Badge variant="success" size="sm">
      Compliant
    </Badge>
  )
}

function CompliancePercentCell({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return (
      <span className="text-xs text-muted-foreground" title="No applicable mandatory requirements">
        —
      </span>
    )
  }
  const tone =
    value >= 100
      ? 'text-muted-foreground'
      : value >= 80
        ? 'text-foreground'
        : value >= 50
          ? 'text-warning'
          : 'text-destructive'
  return (
    <div className="w-[2.75rem]">
      <div className={cn('text-[11px] font-medium tabular-nums leading-none', tone)}>{value}%</div>
      <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full',
            value >= 100 ? 'bg-muted-foreground/40' : value >= 80 ? 'bg-primary/70' : value >= 50 ? 'bg-warning' : 'bg-destructive',
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

function NextActionCell({ action }: { action?: ComplianceBoardNextAction }) {
  if (!action) return <span className="text-muted-foreground">—</span>
  const quiet = action.kind === 'NONE'
  const urgent = action.kind === 'EXPIRED' || action.kind === 'MISSING' || action.kind === 'BLOCKING'
  const warn = action.kind === 'EXPIRING_7' || action.kind === 'REJECTED'
  return (
    <div className="min-w-[11.5rem] max-w-[15rem]">
      <p
        className={cn(
          'text-xs leading-snug',
          quiet && 'font-normal text-muted-foreground',
          !quiet && urgent && 'font-medium text-destructive',
          !quiet && warn && 'font-medium text-warning',
          !quiet && !urgent && !warn && 'font-medium text-foreground',
        )}
      >
        {action.primary}
      </p>
      {action.secondary ? (
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{action.secondary}</p>
      ) : null}
    </div>
  )
}

function BoardStatusCell({ cell }: { cell: ComplianceBoardCell }) {
  const presented = presentBoardCell({
    applicable: cell.applicable,
    effectiveStatus: cell.effectiveStatus,
    daysRemaining: cell.daysRemaining,
    expiryDate: cell.expiryDate,
    blocksRostering: cell.blocksRostering,
  })
  return (
    <div
      className={cn(
        'mx-auto min-w-[3.5rem] max-w-[4.75rem] rounded px-0.5 py-0.5 text-center',
        cellToneClass(presented.tone),
      )}
      title={[cell.effectiveStatus, presented.secondary].filter(Boolean).join(' · ')}
    >
      <div
        className={cn(
          'text-[9px] uppercase tracking-wide leading-tight',
          presented.tone === 'quiet' || presented.tone === 'muted'
            ? 'font-normal'
            : 'font-semibold',
        )}
      >
        {presented.primary}
      </div>
      {presented.secondary ? (
        <div className="mt-0.5 text-[8px] leading-tight opacity-80">{presented.secondary}</div>
      ) : null}
    </div>
  )
}

function IssuesCell({
  blocking,
  warning,
  total,
  additional,
  blocksAllocation,
}: {
  blocking: number
  warning: number
  total: number
  additional: number
  blocksAllocation: boolean
}) {
  if (total === 0 && additional === 0) {
    return <span className="text-[10px] text-muted-foreground">None</span>
  }
  return (
    <div className="flex min-w-[5.25rem] flex-col items-start gap-0.5">
      {blocking > 0 ? (
        <Badge variant="destructive" size="sm">
          {blocking} Critical
        </Badge>
      ) : null}
      {warning > 0 ? (
        <Badge variant="warning" size="sm">
          {warning} Warning
        </Badge>
      ) : null}
      {additional > 0 ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-[10px] leading-tight text-muted-foreground underline decoration-dotted underline-offset-2">
                {total > 0
                  ? `${total} visible · ${additional} more`
                  : blocksAllocation
                    ? `${additional} off-board`
                    : `${additional} off-board`}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Extra compliance issues from allocation rules that are not shown as board columns
              (for example learning / off-matrix types).
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  )
}

function buildGroupedColumns(columns: ComplianceBoardColumn[]) {
  const byCode = new Map(columns.map((c) => [c.code, c]))
  const groups: Array<{ label: string; cols: ComplianceBoardColumn[] }> = []
  for (const g of COMPLIANCE_BOARD_GROUPS) {
    const cols = g.codes.map((code) => byCode.get(code)).filter(Boolean) as ComplianceBoardColumn[]
    if (cols.length) groups.push({ label: g.label, cols })
  }
  const used = new Set(groups.flatMap((g) => g.cols.map((c) => c.code)))
  const rest = columns.filter((c) => !used.has(c.code))
  if (rest.length) groups.push({ label: 'Other', cols: rest })
  return groups
}

export function ComplianceBoardPanel() {
  const canRead = useAuthStore(
    (s) =>
      s.can('employees.read') ||
      s.can('employees.compliance.read') ||
      s.can('employees.compliance.reports.read'),
  )
  const canOpenEdit = useAuthStore(
    (s) => s.can('employees.update') || s.can('employees.compliance.update'),
  )

  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [displayStatus, setDisplayStatus] = React.useState<'all' | ComplianceBoardDisplayStatus>('all')
  const [documentState, setDocumentState] = React.useState<
    'all' | 'expired' | 'expiring_7' | 'expiring_8_30' | 'missing' | 'valid'
  >('all')
  const [issuesOnly, setIssuesOnly] = React.useState(false)
  const [boardSort, setBoardSort] = React.useState<'urgent' | 'nearest_expiry' | 'name'>('urgent')
  const [visaTypeId, setVisaTypeId] = React.useState('all')
  const [locationId, setLocationId] = React.useState('all')
  const [showAllAlerts, setShowAllAlerts] = React.useState(false)

  React.useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const generalSettingsQuery = useGeneralSettings(canRead)
  const lookupsQuery = useEmployeeLookups(canRead)
  const visaTypes = React.useMemo(
    () => resolveEmployeeVisaTypes(generalSettingsQuery.data?.employeeVisaTypes),
    [generalSettingsQuery.data?.employeeVisaTypes],
  )
  const locations = lookupsQuery.data?.locations ?? []

  const boardFilters = React.useMemo(
    () => ({
      search: search || undefined,
      displayStatus: displayStatus === 'all' ? undefined : displayStatus,
      documentState: documentState === 'all' ? undefined : documentState,
      issuesOnly: issuesOnly || undefined,
      boardSort,
      visaTypeIds: visaTypeId !== 'all' ? [visaTypeId] : undefined,
      locationId: locationId !== 'all' ? locationId : undefined,
    }),
    [search, displayStatus, documentState, issuesOnly, boardSort, visaTypeId, locationId],
  )

  const query = useComplianceBoard(canRead, true, boardFilters)
  const summary = query.data?.summary
  const columns = query.data?.columns ?? []
  const rows = query.data?.rows ?? []
  const groups = React.useMemo(() => buildGroupedColumns(columns), [columns])
  const matrixColCount = columns.length
  const alerts = query.data?.alerts ?? []
  const policy = query.data?.allocationPolicy
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
  const warningAlerts = alerts.filter((a) => a.severity === 'warning')

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="compliance-board-denied">
        You do not have permission to view the staff compliance board.
      </p>
    )
  }

  return (
    <div className="space-y-4" data-testid="compliance-board">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Staff Compliance Board</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Spot who needs action, what expires next, and which gaps block rostering. Click a name or
            cell to open Employment Compliance.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" data-testid="compliance-board-summary">
          <StatCard
            label="Needs action"
            value={summary.needsActionCount ?? summary.blockedCount}
            icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
            tone="destructive"
            className="!rounded-lg !p-3 shadow-sm [&_p.text-2xl]:!text-lg"
            data-testid="compliance-board-stat-needs-action"
          />
          <StatCard
            label="Expired"
            value={summary.expiredCount ?? 0}
            icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
            tone="destructive"
            className="!rounded-lg !p-3 shadow-sm [&_p.text-2xl]:!text-lg"
          />
          <StatCard
            label="≤7 days"
            value={summary.expiring7Count ?? 0}
            icon={<CalendarClock className="h-4 w-4" aria-hidden />}
            tone="warning"
            className="!rounded-lg !p-3 shadow-sm [&_p.text-2xl]:!text-lg"
          />
          <StatCard
            label="8–30 days"
            value={summary.expiring8To30Count ?? 0}
            icon={<CalendarClock className="h-4 w-4" aria-hidden />}
            tone="amber"
            className="!rounded-lg !p-3 shadow-sm [&_p.text-2xl]:!text-lg"
          />
          <StatCard
            label="Fully compliant"
            value={summary.fullyCompliantCount ?? summary.clearCount}
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
            tone="success"
            className="!rounded-lg !p-3 shadow-sm [&_p.text-2xl]:!text-lg"
          />
        </div>
      ) : null}

      {policy ? (
        <div
          className={cn(
            'flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2 text-xs',
            policy.mode === 'BLOCK'
              ? 'border-border bg-muted/40 text-foreground'
              : 'border-warning/30 bg-warning/5 text-foreground',
          )}
          data-testid="compliance-board-policy"
          role="status"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium">
              Rostering policy: {policy.mode === 'BLOCK' ? 'Block' : 'Warn only'}
            </p>
            <p className="text-muted-foreground">
              {policy.mode === 'BLOCK'
                ? 'Staff with roster-blocking gaps show as Blocked and should not be allocated.'
                : 'Gaps still show as Attention, but Status stays Clear for rostering until policy is Block.'}{' '}
              Tune requirements in{' '}
              <Link
                to="/settings"
                search={{ tab: 'compliance-requirements' }}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Settings → Compliance requirements
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      {alerts.length > 0 ? (
        <div className="space-y-2" data-testid="compliance-board-alerts">
          {criticalAlerts.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                Critical alerts ({criticalAlerts.length})
              </div>
              <ul className="max-h-16 space-y-0.5 overflow-y-auto text-xs text-foreground">
                {(showAllAlerts ? criticalAlerts : criticalAlerts.slice(0, 3)).map((a) => (
                  <li key={`c-${a.employeeId}-${a.message}`}>
                    {canOpenEdit ? (
                      <Link
                        to="/employee/$employeeId/edit"
                        params={{ employeeId: a.employeeId }}
                        search={editSearch(a.complianceTypeCode)}
                        className="underline-offset-2 hover:underline"
                      >
                        {a.message}
                      </Link>
                    ) : (
                      a.message
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {warningAlerts.length > 0 ? (
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
              <div className="mb-1.5 text-xs font-semibold text-foreground">
                Warnings ({warningAlerts.length})
              </div>
              <ul className="max-h-14 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {(showAllAlerts ? warningAlerts : warningAlerts.slice(0, 2)).map((a) => (
                  <li key={`w-${a.employeeId}-${a.message}`}>
                    {canOpenEdit ? (
                      <Link
                        to="/employee/$employeeId/edit"
                        params={{ employeeId: a.employeeId }}
                        search={editSearch(a.complianceTypeCode)}
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        {a.message}
                      </Link>
                    ) : (
                      a.message
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {alerts.length > 10 ? (
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setShowAllAlerts((v) => !v)}
            >
              {showAllAlerts ? 'Show fewer alerts' : `Show all ${summary?.alertTotal ?? alerts.length} alerts`}
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className="rounded-xl border border-border bg-card p-3 shadow-sm"
        data-testid="compliance-board-filters"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search employee…"
              className="h-9 pl-8"
              data-testid="compliance-board-search"
              aria-label="Search employee"
            />
          </div>
          <Select
            value={displayStatus}
            onValueChange={(v) => setDisplayStatus(v as typeof displayStatus)}
          >
            <SelectTrigger className="h-9 w-[9.75rem]" aria-label="Overall status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
              <SelectItem value="ATTENTION">Attention</SelectItem>
              <SelectItem value="COMPLIANT">Compliant</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={documentState}
            onValueChange={(v) => setDocumentState(v as typeof documentState)}
          >
            <SelectTrigger className="h-9 w-[11rem]" aria-label="Document state">
              <SelectValue placeholder="Document state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All documents</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring_7">Expiring ≤7 days</SelectItem>
              <SelectItem value="expiring_8_30">Expiring 8–30 days</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="h-9 w-[11rem]" aria-label="Branch / location">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={visaTypeId} onValueChange={setVisaTypeId}>
            <SelectTrigger className="h-9 w-[13rem]" aria-label="Immigration status">
              <SelectValue placeholder="Immigration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All immigration</SelectItem>
              {visaTypes.map((vt) => (
                <SelectItem key={vt.id} value={vt.id}>
                  {vt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={boardSort} onValueChange={(v) => setBoardSort(v as typeof boardSort)}>
            <SelectTrigger className="h-9 w-[10.5rem]" aria-label="Sort">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent first</SelectItem>
              <SelectItem value="nearest_expiry">Nearest expiry</SelectItem>
              <SelectItem value="name">Employee A–Z</SelectItem>
            </SelectContent>
          </Select>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 text-xs text-foreground">
            <input
              type="checkbox"
              checked={issuesOnly}
              onChange={(e) => setIssuesOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
              data-testid="compliance-board-issues-only"
            />
            Issues only
          </label>
        </div>
      </div>

      <ContentCard className="overflow-hidden p-0" data-testid="compliance-board-table-card">
        {query.isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" label="Loading compliance board…" />
          </div>
        ) : null}

        {query.isError ? (
          <p className="p-6 text-sm text-destructive" role="alert">
            Could not load compliance board.{' '}
            <button type="button" className="underline" onClick={() => void query.refetch()}>
              Retry
            </button>
          </p>
        ) : null}

        {!query.isLoading && !query.isError && columns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No board columns available. Ensure compliance types are seeded under Settings →
              Compliance types.
            </p>
          </div>
        ) : null}

        {!query.isLoading && !query.isError && columns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[78rem] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-40 w-[10rem] min-w-[10rem] max-w-[10rem] border-b border-border bg-muted px-2 py-2 font-semibold"
                  >
                    Employee
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[10rem] z-40 w-[3.25rem] min-w-[3.25rem] border-b border-border bg-muted px-1.5 py-2 font-semibold"
                  >
                    %
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[13.25rem] z-40 w-[6rem] min-w-[6rem] border-b border-border bg-muted px-1.5 py-2 font-semibold"
                  >
                    Issues
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[19.25rem] z-40 w-[12.5rem] min-w-[12.5rem] border-b border-r border-border bg-muted px-2 py-2 font-semibold shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]"
                  >
                    Next action
                  </th>
                  {groups.map((g) => (
                    <th
                      key={g.label}
                      colSpan={g.cols.length}
                      className="border-b border-l border-border bg-muted/90 px-1 py-1 text-center font-semibold text-foreground/80"
                    >
                      {g.label}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="sticky right-0 z-40 min-w-[5.5rem] border-b border-l border-border bg-muted px-2 py-2 text-center font-semibold shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.12)]"
                  >
                    Status
                  </th>
                </tr>
                <tr>
                  {groups.flatMap((g) =>
                    g.cols.map((col, idx) => (
                      <th
                        key={col.code}
                        className={cn(
                          'border-b border-border bg-muted px-1 py-1.5 text-center font-semibold',
                          idx === 0 && 'border-l',
                        )}
                        title={col.name}
                      >
                        {col.shortLabel}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={matrixColCount + 5}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      No employees match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.employeeId} className="border-t border-border/80 hover:bg-muted/20">
                      <td className="sticky left-0 z-30 w-[10rem] min-w-[10rem] max-w-[10rem] bg-card px-2 py-1">
                        {canOpenEdit ? (
                          <Link
                            to="/employee/$employeeId/edit"
                            params={{ employeeId: row.employeeId }}
                            search={editSearch(row.nextAction?.typeCode)}
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                          >
                            {row.employeeName}
                          </Link>
                        ) : (
                          <span className="font-medium">{row.employeeName}</span>
                        )}
                        <p className="truncate text-[10px] text-muted-foreground">
                          {row.jobTitle || row.roleName || '—'}
                        </p>
                      </td>
                      <td className="sticky left-[10rem] z-30 w-[3.25rem] min-w-[3.25rem] bg-card px-1.5 py-1 align-middle">
                        <CompliancePercentCell value={row.compliancePercent} />
                      </td>
                      <td className="sticky left-[13.25rem] z-30 w-[6rem] min-w-[6rem] bg-card px-1.5 py-1 align-middle">
                        <IssuesCell
                          blocking={row.blockingIssueCount ?? 0}
                          warning={row.warningIssueCount ?? 0}
                          total={row.totalIssueCount ?? 0}
                          additional={row.additionalOffBoardIssueCount ?? 0}
                          blocksAllocation={row.blocksAllocation}
                        />
                      </td>
                      <td className="sticky left-[19.25rem] z-30 w-[12.5rem] min-w-[12.5rem] border-r border-border/70 bg-card px-2 py-1 align-middle shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                        {canOpenEdit && row.nextAction?.typeCode ? (
                          <Link
                            to="/employee/$employeeId/edit"
                            params={{ employeeId: row.employeeId }}
                            search={editSearch(row.nextAction.typeCode)}
                            className="block"
                          >
                            <NextActionCell action={row.nextAction} />
                          </Link>
                        ) : (
                          <NextActionCell action={row.nextAction} />
                        )}
                      </td>
                      {row.cells.map((cell) => {
                        const isGroupStart = groups.some((g) => g.cols[0]?.code === cell.code)
                        const inner = <BoardStatusCell cell={cell} />
                        return (
                          <td
                            key={cell.code}
                            className={cn(
                              'px-0.5 py-0.5 align-middle',
                              isGroupStart && 'border-l border-border/60',
                            )}
                          >
                            {canOpenEdit && cell.applicable ? (
                              <Link
                                to="/employee/$employeeId/edit"
                                params={{ employeeId: row.employeeId }}
                                search={editSearch(cell.code)}
                                className="block"
                                data-testid={`compliance-board-cell-${row.employeeId}-${cell.code}`}
                              >
                                {inner}
                              </Link>
                            ) : (
                              inner
                            )}
                          </td>
                        )
                      })}
                      <td className="sticky right-0 z-30 border-l border-border bg-card px-2 py-1 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                        {displayStatusBadge(row.overallDisplayStatus, row.blocksAllocation)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </ContentCard>
    </div>
  )
}
