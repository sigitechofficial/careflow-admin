import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Info, Search, SearchX } from 'lucide-react'
import { useHrEmployees } from '@/features/hr/hooks/useHr'
import {
  DeploymentStatusLegend,
  HrDeploymentBadge,
  HrLifecycleBadge,
} from '@/features/hr/components/HrStatusBadges'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/misc'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { UserAvatar } from '@/shared/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { EmployeeLifecycleStatus, HrDeploymentStatus } from '@/features/hr/api/hr.api'
import {
  complianceIssueLabel,
  DEPLOYMENT_STATUS_OPTIONS,
  deploymentStatusLabel,
  LIFECYCLE_STATUS_OPTIONS,
} from '@/features/hr/utils/hr-display.util'
import { cn } from '@/shared/lib/utils'

const ALL = 'ALL'

export function HrEmployeeListTable({
  lifecycle,
  deployment,
  onLifecycleChange,
  onDeploymentChange,
}: {
  lifecycle?: EmployeeLifecycleStatus
  deployment?: HrDeploymentStatus
  onLifecycleChange: (status: EmployeeLifecycleStatus | undefined) => void
  onDeploymentChange: (status: HrDeploymentStatus | undefined) => void
}) {
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  React.useEffect(() => setPage(1), [lifecycle, deployment])
  const query = useHrEmployees({
    page,
    limit: 20,
    search: search.trim() || undefined,
    employeeLifecycleStatus: lifecycle,
    deploymentStatus: deployment,
  })
  const rows = query.data?.data ?? []
  const meta = query.data?.meta
  const filtered = !!lifecycle || !!deployment

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name, employee number, or job title"
              className="pl-9"
            />
          </div>
          <Select
            value={lifecycle ?? ALL}
            onValueChange={v => onLifecycleChange(v === ALL ? undefined : (v as EmployeeLifecycleStatus))}
          >
            <SelectTrigger className="sm:w-48" aria-label="Filter by lifecycle status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All lifecycle statuses</SelectItem>
              {LIFECYCLE_STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={deployment ?? ALL}
            onValueChange={v => onDeploymentChange(v === ALL ? undefined : (v as HrDeploymentStatus))}
          >
            <SelectTrigger className="sm:w-44" aria-label="Filter by deployment status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All deployment</SelectItem>
              {DEPLOYMENT_STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onLifecycleChange(undefined)
                onDeploymentChange(undefined)
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        {meta ? (
          <p className="text-sm text-muted-foreground">
            {meta.total} employee{meta.total === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Employee</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Lifecycle</th>
              <th className="px-4 py-2.5 font-medium">
                <span className="inline-flex items-center gap-1">
                  Deployment
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="What deployment status means"
                          className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Info className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs p-3 normal-case tracking-normal">
                        <DeploymentStatusLegend layout="stack" />
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
              </th>
              <th className="w-10 px-2 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  </td>
                  <td />
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <SearchX className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="text-sm font-medium">
                      {filtered || search.trim() ? 'No employees match' : 'No employees yet'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {filtered || search.trim()
                        ? 'Try another search or clear the filters.'
                        : 'Employees appear here once they are added or hired.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.employeeId} className="group border-t border-border transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={row.name} size="sm" />
                      <div className="min-w-0">
                        <Link
                          to="/hr/employees/$employeeId"
                          params={{ employeeId: row.employeeId }}
                          className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {row.employeeNumber ?? row.employeeId.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="truncate">{row.jobTitle ?? '—'}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.employmentType ?? 'Employment type not set'}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <HrLifecycleBadge status={row.employeeLifecycleStatus} />
                  </td>
                  <td className="px-4 py-2.5">
                    <HrDeploymentBadge status={row.readinessStatus} />
                    {row.compliance.issues.length ? (
                      <p
                        className="mt-1 max-w-[16rem] truncate text-xs text-muted-foreground"
                        title={row.compliance.issues.map(complianceIssueLabel).join(', ')}
                      >
                        Compliance: {row.compliance.issues.slice(0, 2).map(complianceIssueLabel).join(', ')}
                        {row.compliance.issues.length > 2 ? ` +${row.compliance.issues.length - 2} more` : ''}
                      </p>
                    ) : null}
                    {row.readinessStatus !== row.deploymentStatus ? (
                      <p className="text-[11px] text-muted-foreground">
                        HR status: {deploymentStatusLabel(row.deploymentStatus)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <Link
                      to="/hr/employees/$employeeId"
                      params={{ employeeId: row.employeeId }}
                      aria-label={`Open ${row.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeploymentStatusLegend className="rounded-lg border border-dashed border-border px-3 py-2.5" />

      {meta && meta.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              {meta.page} / {meta.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {query.error ? (
        <p className={cn('text-sm text-destructive')}>Could not load HR employee list.</p>
      ) : null}
    </div>
  )
}
