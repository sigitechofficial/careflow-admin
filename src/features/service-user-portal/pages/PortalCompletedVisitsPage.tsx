import * as React from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { usePortalCompletedVisits } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import type { PortalCompletedVisit } from '@/features/service-user-portal/api/portal.api'
import {
  formatPortalDateTime,
  PortalReadOnlyField,
  PortalSection,
} from '@/features/service-user-portal/components/portal-display.util'
import { Button } from '@/shared/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-table'
import { cn } from '@/shared/lib/utils'

type ViewMode = 'list' | 'cards'

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  PARTIALLY_COMPLETED: 'Partially completed',
}

function statusBadgeClass(status: string): string {
  if (status === 'COMPLETED') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
  }
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
}

function formatCarers(carers: string[]): string {
  if (!carers.length) return '—'
  return carers.join(', ')
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusBadgeClass(status),
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function CompletedVisitsList({ visits }: { visits: PortalCompletedVisit[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Visit</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Actual end</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Carers</TableHead>
            <TableHead className="max-w-xs">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map(v => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.visitName}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatPortalDateTime(v.scheduledStartAt)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatPortalDateTime(v.actualEndAt ?? v.scheduledEndAt)}
              </TableCell>
              <TableCell>
                <StatusBadge status={v.status} />
              </TableCell>
              <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                {formatCarers(v.carers)}
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {v.notes?.trim() || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CompletedVisitsCards({ visits }: { visits: PortalCompletedVisit[] }) {
  return (
    <div className="space-y-4">
      {visits.map(v => (
        <PortalSection key={v.id} title={v.visitName}>
          <div className="mb-3">
            <StatusBadge status={v.status} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PortalReadOnlyField label="Scheduled" value={formatPortalDateTime(v.scheduledStartAt)} />
            <PortalReadOnlyField label="Scheduled end" value={formatPortalDateTime(v.scheduledEndAt)} />
            <PortalReadOnlyField label="Actual start" value={formatPortalDateTime(v.actualStartAt)} />
            <PortalReadOnlyField label="Actual end" value={formatPortalDateTime(v.actualEndAt)} />
            <PortalReadOnlyField label="Carers" value={formatCarers(v.carers)} />
            <PortalReadOnlyField label="Notes" value={v.notes} />
          </div>
        </PortalSection>
      ))}
    </div>
  )
}

export default function PortalCompletedVisitsPage() {
  const { data, isLoading } = usePortalCompletedVisits()
  const [viewMode, setViewMode] = React.useState<ViewMode>('list')

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading completed visits…</p>
  }

  const visits = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Completed visits</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Care visits that have been completed in the last six months.
          </p>
        </div>
        {visits.length > 0 ? (
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="gap-1.5"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" aria-hidden />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              className="gap-1.5"
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
              Cards
            </Button>
          </div>
        ) : null}
      </div>

      {visits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed visits in the last six months.</p>
      ) : viewMode === 'list' ? (
        <CompletedVisitsList visits={visits} />
      ) : (
        <CompletedVisitsCards visits={visits} />
      )}
    </div>
  )
}
