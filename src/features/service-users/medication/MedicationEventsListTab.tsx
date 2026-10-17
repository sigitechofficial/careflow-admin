import { PrnOverLimitBadge } from '@/features/service-users/medication/PrnOverLimitBadge'
import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useMedicationEventsList } from '@/features/service-users/hooks/useMedicationEvents'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { MarEventStatusBadge } from '@/features/service-users/medication/MarEventStatusBadge'
import { RecordDetailDrawer } from '@/features/service-users/medication/RecordDetailDrawer'
import { eventCarerDisplay } from '@/features/service-users/medication/medication-event-display'
import type { MedicationStatusCodeLookupRow } from '@/features/service-users/types'

import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

function formatWhen(iso: string | null): string {
  return formatGbDateTime(iso)
}

export function MedicationEventsListTab({ serviceUserId }: { serviceUserId: string }) {
  const [page, setPage] = React.useState(1)
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [statusCode, setStatusCode] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [detailEventId, setDetailEventId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  const lookupsQuery = useMedicationLookups()
  const statusCodeOptions = React.useMemo(() => {
    const raw: MedicationStatusCodeLookupRow[] = lookupsQuery.data?.statusCodes ?? []
    return raw
      .filter(sc => sc.code !== 'Pending' && sc.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }, [lookupsQuery.data])

  const eventsQuery = useMedicationEventsList(serviceUserId, page, true, {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    statusCode: statusCode === 'all' ? undefined : statusCode,
  })

  const rows = React.useMemo(() => {
    const raw = eventsQuery.data?.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return raw
    return raw.filter(ev =>
      (ev.medication?.medicationName ?? '').toLowerCase().includes(q),
    )
  }, [eventsQuery.data, search])

  const meta = eventsQuery.data?.meta
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1

  if (eventsQuery.isLoading && !eventsQuery.data) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading administration history…
      </div>
    )
  }

  if (eventsQuery.error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {eventsQuery.error instanceof Error ? eventsQuery.error.message : 'Failed to load events'}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            className="h-8 w-[10.5rem]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            className="h-8 w-[10.5rem]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status code</label>
          <Select
            value={statusCode}
            onValueChange={v => {
              setStatusCode(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-[12rem]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status codes</SelectItem>
              {statusCodeOptions.map(sc => (
                <SelectItem key={sc.code} value={sc.code}>
                  {sc.code} — {sc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Search medication</label>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name…"
            className="h-8"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => {
            setDateFrom('')
            setDateTo('')
            setStatusCode('all')
            setSearch('')
            setPage(1)
          }}
        >
          Clear
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
          <span>Administration history ({meta?.total ?? rows.length})</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1 text-xs font-normal">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No administration events match filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Date / time</th>
                  <th className="px-3 py-2">Medication</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Carer</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(ev => (
                  <tr
                    key={ev.id}
                    className="cursor-pointer border-b border-border/80 last:border-0 hover:bg-muted/30"
                    onClick={() => {
                      setDetailEventId(ev.id)
                      setDetailOpen(true)
                    }}
                  >
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {formatWhen(ev.actualDateTime ?? ev.scheduledDateTime ?? ev.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {ev.medication?.medicationName ?? '—'}
                      {ev.prnOverLimit ? <PrnOverLimitBadge className="ml-1.5" /> : null}
                    </td>
                    <td className="px-3 py-2">
                      <MarEventStatusBadge status={ev.status} statusCode={ev.statusCode} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{eventCarerDisplay(ev)}</td>
                    <td className="max-w-[14rem] truncate px-3 py-2 text-muted-foreground">
                      {ev.notGivenReason?.name ?? ev.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        serviceUserId={serviceUserId}
        eventId={detailEventId}
      />
    </div>
  )
}
