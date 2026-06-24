import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, FileText } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs'
import {
  auditActorLabel,
  auditItemHref,
  auditRowContext,
  auditRowEventType,
  formatAuditIp,
} from '@/features/audit/audit-log-display'
import {
  AUDIT_EVENT_TYPES,
  auditEventTypeLabel,
  type AuditEventType,
} from '@/features/audit/audit-event-types'

const MODULE_FILTER_ALL = '__all__'
const EVENT_TYPE_FILTER_ALL = '__all__'

import { formatDateTime } from '@/shared/lib/utils'

function formatWhen(iso: string): string {
  return formatDateTime(iso)
}

export default function AuditLogPage() {
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [ipFilter, setIpFilter] = React.useState('')
  const [debouncedIp, setDebouncedIp] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [module, setModule] = React.useState(MODULE_FILTER_ALL)
  const [eventType, setEventType] = React.useState(EVENT_TYPE_FILTER_ALL)
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedIp(ipFilter.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [ipFilter])

  const hasFilters =
    debouncedSearch ||
    debouncedIp ||
    dateFrom ||
    dateTo ||
    module !== MODULE_FILTER_ALL ||
    eventType !== EVENT_TYPE_FILTER_ALL

  const query = useAuditLogs({
    page,
    limit: 50,
    search: debouncedSearch || undefined,
    ipAddress: debouncedIp || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    module: module === MODULE_FILTER_ALL ? undefined : module,
    eventType:
      eventType === EVENT_TYPE_FILTER_ALL ? undefined : (eventType as AuditEventType),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setIpFilter('')
    setDebouncedIp('')
    setDateFrom('')
    setDateTo('')
    setModule(MODULE_FILTER_ALL)
    setEventType(EVENT_TYPE_FILTER_ALL)
    setPage(1)
  }

  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Who did what, for which service user, when, and from which IP. Filter by date range, IP, module, and event type."
        icon={<FileText className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Admin' },
          { label: 'Audit' },
        ]}
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Search action, module, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-md h-9"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground px-0.5">
              From
            </span>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[10.5rem]"
              aria-label="Date from"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground px-0.5">
              To
            </span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="h-9 w-[10.5rem]"
              aria-label="Date to"
            />
          </div>
          <Input
            placeholder="Filter by IP…"
            value={ipFilter}
            onChange={e => setIpFilter(e.target.value)}
            className="h-9 w-[9.5rem] font-mono text-xs"
            aria-label="Filter by IP address"
          />
          <Select
            value={module}
            onValueChange={v => {
              setModule(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[11rem]">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MODULE_FILTER_ALL}>All modules</SelectItem>
              <SelectItem value="MEDICATION">Medication</SelectItem>
              <SelectItem value="OBSERVATION">Observations</SelectItem>
              <SelectItem value="SERVICE_USER">Service user</SelectItem>
              <SelectItem value="AUTH">Auth</SelectItem>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
              <SelectItem value="SCHEDULING">Scheduling</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={eventType}
            onValueChange={v => {
              setEventType(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[10rem]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EVENT_TYPE_FILTER_ALL}>All event types</SelectItem>
              {AUDIT_EVENT_TYPES.map(t => (
                <SelectItem key={t} value={t}>
                  {auditEventTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters ? (
            <Button type="button" size="sm" variant="ghost" className="h-9" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>

        {query.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading audit log…
          </div>
        ) : query.isError ? (
          <p className="py-4 text-sm text-destructive" role="alert">
            {query.error instanceof Error
              ? query.error.message
              : 'Could not load audit log. You may need the audit_logs.read permission.'}
          </p>
        ) : (
          <>
            <div className="max-h-[min(70vh,640px)] overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                      When
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Who</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      What happened
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Service user
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      IP address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const ctx = auditRowContext(row)
                    return (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/20">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-xs">
                          {formatWhen(row.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-xs">{auditActorLabel(row.user)}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {auditEventTypeLabel(auditRowEventType(row))}
                          </span>
                        </td>
                        <td className="max-w-xs px-3 py-2 text-xs text-foreground">
                          <div className="font-medium">{ctx.eventLabel}</div>
                          <div className="mt-0.5 text-muted-foreground">{ctx.summary}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {ctx.serviceUserId && ctx.serviceUserName ? (
                            <Link
                              to="/service-users/$serviceUserId/view"
                              params={{ serviceUserId: ctx.serviceUserId }}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {ctx.serviceUserName}
                            </Link>
                          ) : ctx.serviceUserId ? (
                            <Link
                              to="/service-users/$serviceUserId/view"
                              params={{ serviceUserId: ctx.serviceUserId }}
                              className="text-primary underline-offset-2 hover:underline font-mono text-[11px]"
                            >
                              Open profile
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {ctx.subject ? (
                            (() => {
                              const itemTo = auditItemHref(row, ctx)
                              return itemTo && ctx.serviceUserId ? (
                                <Link
                                  to={itemTo}
                                  params={{ serviceUserId: ctx.serviceUserId }}
                                  className="text-primary underline-offset-2 hover:underline"
                                >
                                  {ctx.subject}
                                </Link>
                              ) : (
                                ctx.subject
                              )
                            })()
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatAuditIp(row.ipAddress)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} · {meta.total} entries
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!meta.hasPrevPage || query.isFetching}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!meta.hasNextPage || query.isFetching}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
