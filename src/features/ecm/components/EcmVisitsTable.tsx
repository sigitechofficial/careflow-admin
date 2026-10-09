import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import type { EcmLiveVisitCarer, EcmLiveVisitRow } from '@/features/ecm/types/ecm.types'
import {
  dayKeyFromInstant,
  formatOpsCalendarDate,
  formatOpsClockTime,
} from '@/shared/lib/operational-day.util'

function formatVisitDate(iso: string): string {
  return formatOpsCalendarDate(iso)
}

function formatClockTime(iso: string | null | undefined): string {
  return formatOpsClockTime(iso)
}

function formatDurationMinutes(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins)) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatSignedMinutes(value: number | null | undefined): string {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

function VarianceGroupCell({
  label,
  badgeClassName,
  minutes,
}: {
  label: string
  badgeClassName: string
  minutes: number | null | undefined
}) {
  const assessed = label !== 'Not assessed'
  return (
    <div className="flex flex-col items-start gap-0.5">
      {assessed ? (
        <Badge variant="outline" className={cn('w-fit font-medium', badgeClassName)}>
          {label}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      <span className="tabular-nums text-xs text-muted-foreground">
        {formatSignedMinutes(minutes)}
        {minutes != null ? ' min' : ''}
      </span>
    </div>
  )
}

function carerRoleLabel(carer: EcmLiveVisitCarer, carers: EcmLiveVisitCarer[]): string {
  if (carer.isLeadCarer) return 'Lead'
  return carers.some((c) => c.isLeadCarer) ? 'Support' : 'Carer'
}

/** Double-up: carers late against their own planned start, or not yet clocked in. */
function CarerArrivalWarnings({ carers }: { carers: EcmLiveVisitCarer[] }) {
  const flagged = carers.filter((c) => c.lateArrivalMinutes != null || c.notClockedIn)
  if (flagged.length === 0) return null
  return (
    <div className="mt-1 flex flex-col items-start gap-0.5">
      {flagged.map((c) => {
        const role = carerRoleLabel(c, carers)
        const planned = formatClockTime(c.plannedStartDateTime)
        const title = c.checkInAt
          ? `${c.name} — planned ${planned}, clocked in ${formatClockTime(c.checkInAt)}`
          : `${c.name} — planned ${planned}, not clocked in`
        return (
          <Badge
            key={c.employeeId}
            variant="outline"
            title={title}
            className="w-fit border-orange-500/30 bg-orange-500/10 text-[10px] font-medium text-orange-800 dark:text-orange-200"
          >
            {c.notClockedIn ? `${role} not clocked in` : `${role} late +${c.lateArrivalMinutes} min`}
          </Badge>
        )
      })}
    </div>
  )
}

function punctualityLabel(code: string | null | undefined): string {
  switch ((code ?? '').toUpperCase()) {
    case 'EARLY_ARRIVAL':
    case 'EARLY_DEPARTURE':
      return 'Early'
    case 'ON_TIME':
      return 'On time'
    case 'LATE_ARRIVAL':
    case 'LATE_DEPARTURE':
      return 'Late'
    case 'VERY_LATE_ARRIVAL':
      return 'Critically late'
    default:
      return 'Not assessed'
  }
}

function punctualityBadgeClass(code: string | null | undefined): string {
  const c = (code ?? '').toUpperCase()
  if (c === 'VERY_LATE_ARRIVAL') {
    return 'bg-destructive/10 text-destructive border-destructive/30'
  }
  if (c === 'LATE_ARRIVAL' || c === 'LATE_DEPARTURE') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (c === 'EARLY_ARRIVAL' || c === 'EARLY_DEPARTURE') {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
  }
  if (c === 'ON_TIME') {
    return 'bg-success/10 text-success border-success/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function durationVarianceLabel(code: string | null | undefined): string {
  switch ((code ?? '').toUpperCase()) {
    case 'SHORT_VISIT':
      return 'Short'
    case 'LONG_VISIT':
    case 'EXCESSIVE_OVERRUN':
      return 'Exceeded'
    case 'ON_TIME':
      return 'On time'
    default:
      return 'Not assessed'
  }
}

function durationVarianceBadgeClass(code: string | null | undefined): string {
  const c = (code ?? '').toUpperCase()
  if (c === 'SHORT_VISIT') {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
  }
  if (c === 'LONG_VISIT' || c === 'EXCESSIVE_OVERRUN') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (c === 'ON_TIME') {
    return 'bg-success/10 text-success border-success/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function carersLabel(row: EcmLiveVisitRow): string {
  const carers = row.carers ?? []
  if (carers.length === 0) return '—'
  const ordered = [...carers].sort(
    (a, b) => Number(b.isLeadCarer) - Number(a.isLeadCarer),
  )
  if (ordered.length <= 2) {
    return ordered.map((c) => c.name || c.employeeId).join(', ')
  }
  const primary = ordered[0]?.name || ordered[0]?.employeeId || 'Carer'
  return `${primary} +${ordered.length - 1}`
}

function plannedDurationOf(row: EcmLiveVisitRow): number | null {
  if (row.plannedDurationMinutes != null) return row.plannedDurationMinutes
  if (!row.plannedStartDateTime || !row.plannedEndDateTime) return null
  const ms = new Date(row.plannedEndDateTime).getTime() - new Date(row.plannedStartDateTime).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60_000)
}

function actualDurationOf(row: EcmLiveVisitRow): number | null {
  if (row.actualDurationMinutes != null) return row.actualDurationMinutes
  if (!row.actualCheckInAt || !row.actualCheckOutAt) return null
  const ms = new Date(row.actualCheckOutAt).getTime() - new Date(row.actualCheckInAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60_000)
}

/** Join address + postcode without duplicating a postcode already present in the address line. */
function formatEcmVisitAddress(address?: string | null, postcode?: string | null): string {
  const addr = address?.replace(/\s+/g, ' ').trim() ?? ''
  const pc = postcode?.replace(/\s+/g, ' ').trim() ?? ''
  if (!addr && !pc) return '—'
  if (!pc) return addr
  if (!addr) return pc
  const norm = (s: string) => s.toUpperCase()
  if (norm(addr) === norm(pc)) return addr
  const parts = addr.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length > 0 && norm(parts[parts.length - 1]!) === norm(pc)) return addr
  if (norm(addr).endsWith(norm(pc))) return addr
  return `${addr}, ${pc}`
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Same wording as the status badges (LATE_ARRIVAL → Late Arrival). */
function codeLabel(code: string | null | undefined): string {
  if (!code || code === 'NONE' || code === 'NOT_ASSESSED') return ''
  if (code === 'OUTSIDE_AREA_CHECK_IN_REQUEST') return 'Outside area check-in'
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function assessedLabel(label: string): string {
  return label === 'Not assessed' ? '' : label
}

/** Extra CSV column appended after Address (e.g. billing amounts on a service user). */
export type EcmVisitsCsvExtraColumn = {
  header: string
  value: (row: EcmLiveVisitRow) => string | number | null | undefined
}

/** CSV of the visits table rows (dates and times in the organisation timezone). */
export function buildEcmVisitsCsv(
  rows: EcmLiveVisitRow[],
  extraColumns: EcmVisitsCsvExtraColumn[] = [],
): string {
  const header = [
    'Date',
    'Slot',
    'Service user',
    'Visit ID',
    'Carer',
    'Planned start',
    'Planned end',
    'Actual start',
    'Actual end',
    'Start punctuality',
    'Start variance (min)',
    'End punctuality',
    'End variance (min)',
    'Planned duration (min)',
    'Actual duration (min)',
    'Duration variance',
    'Duration variance (min)',
    'Status',
    'Missed',
    'Exceptions',
    'Address',
    ...extraColumns.map((col) => col.header),
  ]
  const clock = (iso: string | null | undefined) => {
    const t = iso ? formatClockTime(iso) : ''
    return t === '—' ? '' : t
  }
  const lines = rows.map((row) => {
    const exceptions = [
      row.arrivalClassification !== 'ON_TIME' ? codeLabel(row.arrivalClassification) : '',
      row.durationClassification !== 'ON_TIME' ? codeLabel(row.durationClassification) : '',
      ...row.operationalExceptionCodes.map(codeLabel),
    ].filter(Boolean)
    const address = formatEcmVisitAddress(row.address, row.postcode)
    return [
      dayKeyFromInstant(row.plannedStartDateTime) || row.plannedStartDateTime.slice(0, 10),
      row.slotLabel?.trim() || 'Visit',
      row.serviceUserName,
      row.visitRef?.trim() ?? '',
      (row.carers ?? []).map((c) => c.name || c.employeeId).join('; '),
      clock(row.plannedStartDateTime),
      clock(row.plannedEndDateTime),
      clock(row.actualCheckInAt),
      clock(row.actualCheckOutAt),
      assessedLabel(punctualityLabel(row.arrivalClassification)),
      row.startVarianceMinutes,
      assessedLabel(punctualityLabel(row.departureClassification)),
      row.endVarianceMinutes,
      plannedDurationOf(row),
      actualDurationOf(row),
      assessedLabel(durationVarianceLabel(row.durationClassification)),
      row.durationVarianceMinutes,
      codeLabel(row.lifecycleStatus),
      codeLabel(row.missedClassification),
      exceptions.join('; '),
      address === '—' ? '' : address,
      ...extraColumns.map((col) => col.value(row)),
    ]
      .map(csvEscape)
      .join(',')
  })
  return [header.join(','), ...lines].join('\n')
}

/** Extra column shown after Address (before Action), e.g. billing amounts on a service user. */
export type EcmVisitsTableExtraColumn = {
  key: string
  header: React.ReactNode
  className?: string
  render: (row: EcmLiveVisitRow) => React.ReactNode
}

const BASE_COLUMN_COUNT = 19

/**
 * ECM visits table (ECM live monitoring). Shared by the service user and employee
 * Visits tabs so every page shows the same columns.
 */
export function EcmVisitsTable({
  rows,
  onOpen,
  renderAction,
  emptyState,
  extraColumns = [],
  rowClassName,
  className,
}: {
  rows: EcmLiveVisitRow[]
  onOpen?: (row: EcmLiveVisitRow) => void
  /** Replaces the default Open button in the Action column. */
  renderAction?: (row: EcmLiveVisitRow) => React.ReactNode
  emptyState?: React.ReactNode
  extraColumns?: EcmVisitsTableExtraColumn[]
  rowClassName?: (row: EcmLiveVisitRow) => string | undefined
  className?: string
}) {
  const tableScrollRef = React.useRef<HTMLDivElement>(null)
  const [isScrolledX, setIsScrolledX] = React.useState(false)

  React.useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const update = () => setIsScrolledX(el.scrollLeft > 0)
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [rows.length])

  return (
    <div
      ref={tableScrollRef}
      className={cn('overflow-x-auto rounded-lg border border-border', className)}
    >
      <table className="w-full min-w-[2060px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="sticky left-0 z-30 w-[8.5rem] min-w-[8.5rem] border-b border-border bg-muted px-3 py-2.5 text-left font-medium text-muted-foreground">
              Date
            </th>
            <th className="sticky left-[8.5rem] z-30 w-[5.5rem] min-w-[5.5rem] border-b border-border bg-muted px-3 py-2.5 text-left font-medium text-muted-foreground">
              Slot
            </th>
            <th
              className={cn(
                'sticky left-[14rem] z-30 min-w-[9rem] border-b border-border bg-muted px-3 py-2.5 text-left font-medium text-muted-foreground',
                isScrolledX &&
                  'border-r shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]',
              )}
            >
              Service user
            </th>
            <th className="min-w-[11rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Visit ID
            </th>
            <th className="min-w-[8rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Carer
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Planned start
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Planned end
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Actual start
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Actual end
            </th>
            <th className="min-w-[8rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Clock-in
            </th>
            <th className="min-w-[8.5rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Start punctuality
            </th>
            <th className="min-w-[8.5rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              End punctuality
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Planned duration
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Actual duration
            </th>
            <th className="min-w-[8.5rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Duration variance
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Exceptions
            </th>
            <th className="min-w-[12rem] max-w-[16rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Address
            </th>
            {extraColumns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
            <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={BASE_COLUMN_COUNT + extraColumns.length} className="px-3 py-12 text-center">
                {emptyState ?? <p className="text-sm text-muted-foreground">No visits.</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const plannedDuration = plannedDurationOf(row)
              const actualDuration = actualDurationOf(row)
              const startPunctuality = punctualityLabel(row.arrivalClassification)
              const endPunctuality = punctualityLabel(row.departureClassification)
              const durationLabel = durationVarianceLabel(row.durationClassification)
              const addressLabel = formatEcmVisitAddress(row.address, row.postcode)

              return (
                <tr
                  key={row.scheduledJobId}
                  className={cn(
                    'group border-b border-border last:border-0 hover:bg-muted/40',
                    rowClassName?.(row),
                  )}
                >
                  <td className="sticky left-0 z-20 w-[8.5rem] min-w-[8.5rem] border-b border-border bg-card px-3 py-2.5 whitespace-nowrap text-muted-foreground group-hover:bg-muted">
                    {formatVisitDate(row.plannedStartDateTime)}
                  </td>
                  <td className="sticky left-[8.5rem] z-20 w-[5.5rem] min-w-[5.5rem] border-b border-border bg-card px-3 py-2.5 font-medium group-hover:bg-muted">
                    {row.slotLabel?.trim() || 'Visit'}
                  </td>
                  <td
                    className={cn(
                      'sticky left-[14rem] z-20 min-w-[9rem] border-b border-border bg-card px-3 py-2.5 group-hover:bg-muted',
                      isScrolledX &&
                        'border-r shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]',
                    )}
                  >
                    {row.serviceUserName}
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {row.visitRef?.trim() || '—'}
                  </td>
                  <td
                    className="min-w-[8rem] border-b border-border px-3 py-2.5"
                    title={
                      (row.carers ?? []).length > 2
                        ? (row.carers ?? [])
                            .map((c) => c.name || c.employeeId)
                            .join(', ')
                        : undefined
                    }
                  >
                    {carersLabel(row)}
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatClockTime(row.plannedStartDateTime)}
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatClockTime(row.plannedEndDateTime)}
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatClockTime(row.actualCheckInAt)}
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatClockTime(row.actualCheckOutAt)}
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    {row.checkInMethod && row.checkInMethod !== 'NONE' ? (
                      <span
                        className={cn(
                          'font-medium',
                          row.checkInMethod === 'NFC' && 'text-sky-700 dark:text-sky-300',
                          (row.checkInMethod === 'MANUAL' || row.checkInMethod === 'OFFICE') &&
                            'text-amber-700 dark:text-amber-300',
                          row.checkInMethod === 'GPS' && 'text-foreground',
                        )}
                      >
                        {row.checkInMethodLabel ?? row.checkInMethod}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <VarianceGroupCell
                      label={startPunctuality}
                      badgeClassName={punctualityBadgeClass(row.arrivalClassification)}
                      minutes={row.startVarianceMinutes}
                    />
                    <CarerArrivalWarnings carers={row.carers ?? []} />
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <VarianceGroupCell
                      label={endPunctuality}
                      badgeClassName={punctualityBadgeClass(row.departureClassification)}
                      minutes={row.endVarianceMinutes}
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums">
                    {formatDurationMinutes(plannedDuration)}
                  </td>
                  <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums">
                    {formatDurationMinutes(actualDuration)}
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <VarianceGroupCell
                      label={durationLabel}
                      badgeClassName={durationVarianceBadgeClass(row.durationClassification)}
                      minutes={row.durationVarianceMinutes}
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <EcmStatusBadge code={row.lifecycleStatus} kind="lifecycle" />
                      <EcmStatusBadge code={row.missedClassification} kind="missed" />
                    </div>
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {row.operationalExceptionCodes.length === 0 &&
                      row.durationClassification === 'NOT_ASSESSED' &&
                      row.arrivalClassification === 'NOT_ASSESSED' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          {row.arrivalClassification !== 'NOT_ASSESSED' &&
                          row.arrivalClassification !== 'ON_TIME' ? (
                            <EcmStatusBadge
                              code={row.arrivalClassification}
                              kind="arrival"
                              className="text-[10px]"
                            />
                          ) : null}
                          {row.durationClassification !== 'NOT_ASSESSED' &&
                          row.durationClassification !== 'ON_TIME' ? (
                            <EcmStatusBadge
                              code={row.durationClassification}
                              kind="duration"
                              className="text-[10px]"
                            />
                          ) : null}
                          {row.operationalExceptionCodes.slice(0, 3).map((code) => (
                            <EcmStatusBadge
                              key={`${row.scheduledJobId}-${code}`}
                              code={code}
                              kind="generic"
                              className="text-[10px]"
                            />
                          ))}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="min-w-[12rem] max-w-[16rem] border-b border-border px-3 py-2.5 text-muted-foreground">
                    <span
                      className="line-clamp-2 break-words"
                      title={addressLabel === '—' ? undefined : addressLabel}
                    >
                      {addressLabel}
                    </span>
                  </td>
                  {extraColumns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('border-b border-border px-3 py-2.5', col.className)}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  <td className="border-b border-border px-3 py-2.5">
                    {renderAction ? (
                      renderAction(row)
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpen?.(row)}
                      >
                        Open
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
