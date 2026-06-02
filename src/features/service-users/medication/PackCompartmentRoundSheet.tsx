import * as React from 'react'
import { useQueries } from '@tanstack/react-query'
import { CheckCheck, ChevronRight, Loader2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  fetchMedicationEvent,
  type MarChartCell,
  type MarChartMedicationRow,
  type MedicationEventDetail,
} from '@/features/service-users/api/medication-mar.api'
import { medicationEventDetailKey } from '@/features/service-users/hooks/useMedicationEvents'
import type { MedicationPackCompartmentRow } from '@/features/service-users/types'
import { MarEventStatusBadge } from '@/features/service-users/medication/MarEventStatusBadge'
import {
  compartmentCollapsedHeadline,
  compartmentSummaryDisplayCode,
  summarizeCompartmentDay,
  cellCode,
  type CompartmentAggregateCell,
} from '@/features/service-users/medication/mar-pack-calendar-layout'
import {
  statusCodeHeaderClass,
  formatGbDate,
} from '@/features/service-users/medication/mar-record-utils'
import {
  carerAdministeredName,
  eventReason,
  eventReviewLabel,
  eventScheduledDueTime,
  formatGbDateTime,
} from '@/features/service-users/medication/medication-event-display'
import './mar-record.css'

function DrawerRow({
  label,
  value,
  mono,
  full,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  full?: boolean
}) {
  if (full) {
    return (
      <div className="record-summary-item full">
        <div className="label">{label}</div>
        <div className="value">{value}</div>
      </div>
    )
  }
  return (
    <div className="drawer-row">
      <span className="drawer-key">{label}</span>
      <span className={cn('drawer-val', mono && 'font-mono text-xs tabular-nums')}>{value}</span>
    </div>
  )
}

function MedicineRoundCard({
  row,
  cell,
  event,
  loading,
  onViewDetail,
}: {
  row: MarChartMedicationRow
  cell: MarChartCell | undefined
  event: MedicationEventDetail | undefined
  loading: boolean
  onViewDetail?: () => void
}) {
  const code = cellCode(cell) ?? '—'
  const isDue = cell?.cellState === 'due'
  const isNa = cell?.cellState === 'na' || code === 'N/A'

  if (isNa) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{row.medicationName}</span>
        <span className="ml-2">Not scheduled</span>
      </div>
    )
  }

  if (isDue) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3 dark:border-amber-900 dark:bg-amber-950/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{row.medicationName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[row.strength, row.dose].filter(Boolean).join(' · ') || '—'}
              {row.routeName ? ` · ${row.routeName}` : ''}
            </p>
          </div>
          <span className="cell-inner cell-due shrink-0 px-2 py-0.5 text-xs">Due</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading {row.medicationName}…
      </div>
    )
  }

  const reviewPending = event ? eventReviewLabel(event) === 'Pending' : cell?.requiresReview

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-medium">{row.medicationName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[row.strength, row.dose].filter(Boolean).join(' · ') || '—'}
            {(event?.routeNameSnapshot ?? row.routeName)
              ? ` · ${event?.routeNameSnapshot ?? row.routeName}`
              : ''}
          </p>
        </div>
        {event ? (
          <MarEventStatusBadge status={event.status} statusCode={event.statusCode} />
        ) : (
          <span
            className="inline-flex min-w-[2rem] shrink-0 items-center justify-center rounded px-2 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: cell?.color ?? '#64748b',
              color: cell?.textColor?.trim() || '#fff',
            }}
          >
            {code}
          </span>
        )}
      </div>

      {event && (
        <div className="space-y-0 px-1 py-1">
          <DrawerRow label="Scheduled" mono value={eventScheduledDueTime(event)} />
          <DrawerRow
            label="Given at"
            mono
            value={event.actualDateTime ? formatGbDateTime(event.actualDateTime) : '—'}
          />
          <DrawerRow label="Recorded at" mono value={formatGbDateTime(event.createdAt)} />
          {event.doseGiven && <DrawerRow label="Dose given" value={event.doseGiven} />}
          <DrawerRow label="Carer" value={carerAdministeredName(event.administeredBy)} />
          {eventReason(event) !== '—' && (
            <DrawerRow label="Reason" value={eventReason(event)} full />
          )}
          {event.notes && <DrawerRow label="Notes" value={event.notes} full />}
          <DrawerRow
            label="Review"
            value={
              reviewPending ? (
                <span className="badge-review">⏳ Pending review</span>
              ) : (
                eventReviewLabel(event)
              )
            }
          />
          {(event.correctionReason || event.correctionNotes) && (
            <>
              {event.correctionReason && (
                <DrawerRow label="Correction" value={event.correctionReason} />
              )}
              {event.correctionNotes && (
                <DrawerRow label="Correction notes" value={event.correctionNotes} full />
              )}
            </>
          )}
        </div>
      )}

      {!event && cell?.recordId && (
        <p className="px-3 py-2 text-xs text-muted-foreground">Could not load administration details.</p>
      )}

      {onViewDetail && cell?.recordId && (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300"
            onClick={onViewDetail}
          >
            View full record
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export function PackCompartmentRoundSheet({
  open,
  onOpenChange,
  serviceUserId,
  packName,
  compartment,
  roundName,
  dueTime,
  date,
  day,
  rows,
  aggregate,
  onRecordRound,
  onOpenMedicine,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  packName: string
  compartment: MedicationPackCompartmentRow | null
  roundName: string
  dueTime: string
  date: string
  day: number
  rows: MarChartMedicationRow[]
  aggregate: CompartmentAggregateCell
  onRecordRound: () => void
  onOpenMedicine?: (row: MarChartMedicationRow, cell: MarChartCell) => void
}) {
  const counts = React.useMemo(() => summarizeCompartmentDay(rows, day), [rows, day])
  const headline = compartmentCollapsedHeadline(counts)
  const displayCode = compartmentSummaryDisplayCode(aggregate)
  const hdrClass = statusCodeHeaderClass(displayCode === 'PR' ? 'R' : displayCode)

  const medLines = React.useMemo(
    () =>
      rows.map(row => ({
        row,
        cell: row.days.find(c => c.day === day),
      })),
    [rows, day],
  )

  const recordIds = React.useMemo(
    () =>
      medLines
        .map(l => l.cell?.recordId)
        .filter((id): id is string => Boolean(id)),
    [medLines],
  )

  const eventQueries = useQueries({
    queries: recordIds.map(eventId => ({
      queryKey: medicationEventDetailKey(serviceUserId, eventId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchMedicationEvent(serviceUserId, eventId, { signal }),
      enabled: open && Boolean(eventId),
      staleTime: 30_000,
    })),
  })

  const eventByRecordId = React.useMemo(() => {
    const map = new Map<string, MedicationEventDetail>()
    recordIds.forEach((id, i) => {
      const data = eventQueries[i]?.data
      if (data) map.set(id, data)
    })
    return map
  }, [recordIds, eventQueries])

  const eventsLoading = eventQueries.some(q => q.isLoading)
  const reviewPendingCount = medLines.filter(
    l => l.cell?.requiresReview || (l.cell?.recordId && eventByRecordId.get(l.cell.recordId) && eventReviewLabel(eventByRecordId.get(l.cell.recordId)!) === 'Pending'),
  ).length

  const windowLabel =
    compartment?.windowStart && compartment?.windowEnd
      ? `${compartment.windowStart}–${compartment.windowEnd}`
      : rows[0]?.roundWindowStart && rows[0]?.roundWindowEnd
        ? `${rows[0].roundWindowStart}–${rows[0].roundWindowEnd}`
        : null

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const roundStatusLabel =
    aggregate.kind === 'partial'
      ? 'Partial round (PR)'
      : counts.due === counts.scheduled
        ? 'All due'
        : counts.due > 0
          ? `${counts.due} due · ${counts.recorded} recorded`
          : headline.text

  return (
    <>
      <div
        className={`mar-drawer-overlay ${open ? 'open' : ''}`}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />
      <div
        className={`mar-drawer ${open ? 'open' : ''}`}
        role="dialog"
        aria-label={`${roundName} compartment round`}
      >
        <div className="record-summary-card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
            <button
              type="button"
              className="mar-record-close"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className={`record-summary-hdr ${hdrClass}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '0 8px 8px' }}>
              <div className="record-summary-code">{displayCode || '—'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>
                  Blister pack · {packName}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {roundName} compartment
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                  {formatGbDate(date)} · Due {dueTime}
                  {windowLabel ? ` · Window ${windowLabel}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="record-summary-body">
            <div className="record-summary-item">
              <div className="label">Round status</div>
              <div className="value">{roundStatusLabel}</div>
            </div>
            <div className="record-summary-item">
              <div className="label">Medicines</div>
              <div className="value">
                {counts.scheduled} scheduled
                {counts.due > 0 ? ` · ${counts.due} due` : ''}
                {counts.recorded > 0 ? ` · ${counts.recorded} recorded` : ''}
              </div>
            </div>
            {(counts.G > 0 || counts.R > 0 || counts.N > 0 || counts.U > 0) && (
              <div className="record-summary-item full">
                <div className="label">Status breakdown</div>
                <div className="value" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {counts.G > 0 && <span>{counts.G} Given</span>}
                  {counts.R > 0 && <span>{counts.R} Refused</span>}
                  {counts.N > 0 && <span>{counts.N} Missed</span>}
                  {counts.U > 0 && <span>{counts.U} Unavailable</span>}
                </div>
              </div>
            )}
            {reviewPendingCount > 0 && (
              <div className="record-summary-item">
                <div className="label">Manager review</div>
                <div className="value">
                  <span className="badge-review">⏳ {reviewPendingCount} pending</span>
                </div>
              </div>
            )}
            {compartment?.witnessRequired && (
              <div className="record-summary-item full">
                <div className="label">Witness</div>
                <div className="value">Required for this round</div>
              </div>
            )}
          </div>

          <div className="drawer-section">
            <div className="drawer-label">Medicines in this round</div>
            {eventsLoading && recordIds.length > 0 && (
              <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading administration details…
              </p>
            )}
            <div className="space-y-3">
              {medLines.map(({ row, cell }) => {
                const event = cell?.recordId ? eventByRecordId.get(cell.recordId) : undefined
                const qIndex = cell?.recordId ? recordIds.indexOf(cell.recordId) : -1
                const loading = qIndex >= 0 && (eventQueries[qIndex]?.isLoading ?? false)
                return (
                  <MedicineRoundCard
                    key={`${row.medicationId}:${row.scheduleId ?? ''}`}
                    row={row}
                    cell={cell}
                    event={event}
                    loading={loading}
                    onViewDetail={
                      cell && onOpenMedicine
                        ? () => {
                            onOpenMedicine(row, cell)
                            onOpenChange(false)
                          }
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </div>

          <div className="drawer-section space-y-2">
            <button
              type="button"
              className="mar-record-btn-primary w-full gap-1.5"
              onClick={() => {
                onRecordRound()
                onOpenChange(false)
              }}
            >
              <CheckCheck className="inline h-4 w-4" style={{ verticalAlign: -2, marginRight: 6 }} />
              {counts.due === counts.scheduled
                ? `Record all ${counts.scheduled} medicines`
                : counts.due > 0
                  ? `Record / update round (${counts.due} due)`
                  : 'Update round records'}
            </button>
            <button type="button" className="mar-record-btn-outline w-full" onClick={() => onOpenChange(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
