import * as React from 'react'
import {
  ListFilter,
  Loader2,
  Radio,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/select'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { VisitQueueCard } from '@/features/ecm/components/EcmVisitQueueCard'
import {
  useEcmExceptions,
} from '@/features/ecm/hooks/useEcm'
import type { EcmExceptionRow } from '@/features/ecm/types/ecm.types'
import {
  exceptionPlannedDayKey,
  isDayInPeriod,
} from '@/features/ecm/utils/ecm-operational-period.util'

function humanizeTag(code: string): string {
  if (code === 'OUTSIDE_AREA_CHECK_IN_REQUEST') return 'Outside area check-in'
  if (code === 'UNABLE_TO_START') return 'Unable to start'
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function rowHasMockLocation(row: EcmExceptionRow): boolean {
  return Boolean(row.hasMockLocation) || row.kind === 'MOCK_LOCATION'
}

function rowMatchesQueueTag(row: EcmExceptionRow, tag: string): boolean {
  if (tag === 'all') return true
  if (tag === 'OVERDUE') return row.overdue
  if (tag === 'MOCK_LOCATION') return rowHasMockLocation(row)
  return row.kind === tag
}

/** Always shown — even when count is 0 — so coordinators can filter an empty period. */
const ALWAYS_QUEUE_TAGS = [
  'CARER_SOS',
  'UNABLE_TO_START',
  'MOCK_LOCATION',
  'OVERDUE',
  'LEFT_VISIT_AREA',
  'OUTSIDE_AREA_CHECK_IN_REQUEST',
  'POTENTIAL_MISSED',
  'CONFIRMED_MISSED',
  'MISSING_CHECKOUT',
  'OUTSIDE_GEOFENCE',
  'LATE_ARRIVAL',
  'VERY_LATE_ARRIVAL',
  'EARLY_ARRIVAL',
  'EARLY_DEPARTURE',
  'SHORT_VISIT',
  'LONG_VISIT',
  'EXCESSIVE_OVERRUN',
  'MANUAL_ATTENDANCE',
] as const

type QueueTagOption = { id: string; label: string; count: number }

type VisitQueueGroup = { jobId: string; rows: EcmExceptionRow[] }

function visitQueueKey(jobId: string): string {
  return `visit:${jobId}`
}

function queueTagOptions(visits: VisitQueueGroup[]): {
  chips: QueueTagOption[]
  catalog: QueueTagOption[]
} {
  const counts = new Map<string, number>()
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1)
  for (const visit of visits) {
    const tags = new Set<string>()
    let unackedSos = false
    for (const row of visit.rows) {
      if (row.kind === 'CARER_SOS') {
        if (!isSosAcknowledged(row)) unackedSos = true
      } else {
        tags.add(row.kind)
      }
      if (rowHasMockLocation(row)) tags.add('MOCK_LOCATION')
      if (row.overdue) tags.add('OVERDUE')
    }
    if (unackedSos) tags.add('CARER_SOS')
    for (const tag of tags) bump(tag)
  }
  const extra = [...counts.keys()]
    .filter((id) => !(ALWAYS_QUEUE_TAGS as readonly string[]).includes(id) && id !== 'OTHER')
    .sort((a, b) => humanizeTag(a).localeCompare(humanizeTag(b)))
  const catalog: QueueTagOption[] = ['all', ...ALWAYS_QUEUE_TAGS, ...extra].map((id) => ({
    id,
    label: id === 'all' ? 'All tags' : humanizeTag(id),
    count: id === 'all' ? visits.length : (counts.get(id) ?? 0),
  }))
  const chips = catalog.filter((opt) => opt.id === 'all' || opt.count > 0)
  return { chips, catalog }
}

function isLeftVisitArea(row: EcmExceptionRow): boolean {
  return row.kind === 'LEFT_VISIT_AREA'
}

function isOutsideAreaCheckInRequest(row: EcmExceptionRow): boolean {
  return row.kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST'
}

function isCheckInRequestPending(row: EcmExceptionRow): boolean {
  return (
    isOutsideAreaCheckInRequest(row) &&
    (row.checkInMethodRequest?.status ?? 'PENDING') === 'PENDING'
  )
}

function isUnableToStart(row: EcmExceptionRow): boolean {
  return row.kind === 'UNABLE_TO_START'
}

function isCarerSos(row: EcmExceptionRow): boolean {
  return row.kind === 'CARER_SOS'
}

function isSosAcknowledged(row: EcmExceptionRow): boolean {
  return Boolean(
    row.sos?.acknowledgedAt ||
      row.acknowledgedAt ||
      row.lifecycle === 'ACKNOWLEDGED' ||
      row.lifecycle === 'RESOLVED' ||
      row.lifecycle === 'MANAGER_REVIEWED' ||
      row.lifecycle === 'CLOSED',
  )
}

function isAreaLockPending(row: EcmExceptionRow): boolean {
  return isLeftVisitArea(row) && row.areaLock?.status !== 'ALLOWED'
}

function visitRowRank(row: EcmExceptionRow): number {
  if (isCarerSos(row) && !isSosAcknowledged(row)) return 0
  if (isAreaLockPending(row)) return 1
  if (isUnableToStart(row)) return 2
  if (isCheckInRequestPending(row)) return 3
  if (isLeftVisitArea(row)) return 4
  if (isOutsideAreaCheckInRequest(row)) return 5
  if (isCarerSos(row)) return 6
  if (row.overdue) return 7
  return 8
}

function visitGroupRank(rows: EcmExceptionRow[]): number {
  return rows.reduce((best, row) => Math.min(best, visitRowRank(row)), 99)
}

function groupQueueItems(rows: EcmExceptionRow[]): VisitQueueGroup[] {
  const byJob = new Map<string, EcmExceptionRow[]>()
  for (const row of rows) {
    const list = byJob.get(row.scheduledJobId) ?? []
    list.push(row)
    byJob.set(row.scheduledJobId, list)
  }
  const groups: VisitQueueGroup[] = []
  for (const [jobId, groupRows] of byJob) {
    groupRows.sort((a, b) => visitRowRank(a) - visitRowRank(b))
    groups.push({ jobId, rows: groupRows })
  }
  groups.sort((a, b) => visitGroupRank(a.rows) - visitGroupRank(b.rows))
  return groups
}


export function EcmExceptionQueuePanel({
  onOpenVisit,
  serviceUserId,
  dateFrom,
  dateTo,
  periodLabel,
  focusJobId,
}: {
  onOpenVisit: (jobId: string) => void
  /** When set, only exceptions for this service user are loaded. */
  serviceUserId?: string
  /** Inclusive period start (YYYY-MM-DD). */
  dateFrom?: string
  /** Inclusive period end (YYYY-MM-DD). */
  dateTo?: string
  /** Human label for the active operational period (preset name or date span). */
  periodLabel?: string
  /** Expand and scroll to this visit (notification deep link). */
  focusJobId?: string | null
}) {
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const locationId = serviceUserId ? undefined : (globalLocationId ?? undefined)
  const exceptions = useEcmExceptions({ limit: 100, serviceUserId, locationId })
  /** `undefined` = auto-open first locked card; `null` = user collapsed all. */
  const [expandedId, setExpandedId] = React.useState<string | null | undefined>(
    undefined,
  )
  const [tagFilter, setTagFilter] = React.useState('all')

  React.useEffect(() => {
    if (focusJobId) setExpandedId(visitQueueKey(focusJobId))
  }, [focusJobId])

  const allRows = exceptions.data ?? []
  const periodRows = React.useMemo(() => {
    if (!dateFrom || !dateTo) return allRows
    return allRows.filter((row) =>
      isDayInPeriod(exceptionPlannedDayKey(row), dateFrom, dateTo),
    )
  }, [allRows, dateFrom, dateTo])

  const visitGroups = React.useMemo(
    () => groupQueueItems(periodRows),
    [periodRows],
  )

  const { chips: tagChips, catalog: tagCatalog } = React.useMemo(
    () => queueTagOptions(visitGroups),
    [visitGroups],
  )

  React.useEffect(() => {
    if (tagFilter !== 'all' && !tagCatalog.some((opt) => opt.id === tagFilter)) {
      setTagFilter('all')
    }
  }, [tagFilter, tagCatalog])

  const visibleVisits = React.useMemo(
    () =>
      tagFilter === 'all'
        ? visitGroups
        : visitGroups.filter((visit) =>
            visit.rows.some((row) => rowMatchesQueueTag(row, tagFilter)),
          ),
    [visitGroups, tagFilter],
  )

  if (exceptions.isLoading) {
    return (
      <ContentCard
        className="space-y-3 p-4"
        data-testid="ecm-exception-queue"
      >
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading exception queue…
        </div>
      </ContentCard>
    )
  }

  if (exceptions.isError) {
    return (
      <ContentCard
        className="space-y-3 p-4"
        data-testid="ecm-exception-queue"
      >
        <p className="text-sm text-muted-foreground">
          Exception queue unavailable — apply the ECM exceptions migration and restart the API.
        </p>
      </ContentCard>
    )
  }

  const firstActionVisit = visibleVisits.find((visit) =>
    visit.rows.some(
      (row) =>
        (isCarerSos(row) && !isSosAcknowledged(row)) ||
        isAreaLockPending(row) ||
        isUnableToStart(row) ||
        isCheckInRequestPending(row),
    ),
  )
  const focusedVisit = focusJobId
    ? visibleVisits.find((visit) => visit.jobId === focusJobId)
    : null
  const defaultExpandedId = focusedVisit
    ? visitQueueKey(focusedVisit.jobId)
    : firstActionVisit
      ? visitQueueKey(firstActionVisit.jobId)
      : null

  const showingLabel = [
    periodLabel ? `Showing exceptions for ${periodLabel}.` : 'Showing all open exceptions.',
    locationId ? 'Showing exceptions for the selected header location.' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ContentCard className="space-y-3 p-4" data-testid="ecm-exception-queue">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <h3 className="text-base font-semibold text-foreground">
            {serviceUserId ? 'Exceptions for this service user' : 'Exception queue'}
          </h3>
        </div>
        <p className="pl-6 text-sm text-foreground/80">{showingLabel}</p>
        <p className="pl-6 text-xs text-muted-foreground">
          {visibleVisits.length}
          {tagFilter !== 'all' || visitGroups.length !== visibleVisits.length
            ? ` of ${visitGroups.length}`
            : ''}{' '}
          {visibleVisits.length === 1 ? 'visit' : 'visits'} · one card per visit
        </p>
      </header>
      <div className="space-y-2" data-testid="ecm-exception-queue-filters">
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ListFilter className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Filter by tag
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger
              className={cn(
                'h-8 w-auto min-w-[7.5rem] gap-1 rounded-full px-3 text-xs shadow-none',
                (tagFilter === 'all' || !tagChips.some((c) => c.id === tagFilter)) &&
                  'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
              )}
              data-testid="ecm-exception-queue-tag-select"
            >
              <span>
                {tagFilter === 'all' || tagChips.some((c) => c.id === tagFilter)
                  ? 'All tags'
                  : (tagCatalog.find((o) => o.id === tagFilter)?.label ?? 'All tags')}
                <span className="ml-1.5 tabular-nums opacity-80">
                  {tagFilter === 'all' || tagChips.some((c) => c.id === tagFilter)
                    ? visitGroups.length
                    : (tagCatalog.find((o) => o.id === tagFilter)?.count ?? 0)}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent>
              {tagCatalog.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="text-xs">
                  {opt.label}
                  <span className="ml-1.5 tabular-nums text-muted-foreground">{opt.count}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tagChips
            .filter((opt) => opt.id !== 'all')
            .map((opt) => {
              const active = tagFilter === opt.id
              return (
                <Button
                  key={opt.id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="h-8 rounded-full px-3 text-xs"
                  aria-pressed={active}
                  onClick={() => setTagFilter(opt.id)}
                >
                  {opt.label}
                  <span className="ml-1.5 tabular-nums opacity-80">{opt.count}</span>
                </Button>
              )
            })}
        </div>
      </div>
      <div className="grid gap-3">
        {visibleVisits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {visitGroups.length > 0 && tagFilter !== 'all'
              ? 'No open exceptions match this tag. Choose All tags or another filter.'
              : allRows.length > 0 && dateFrom && dateTo
                ? 'No open exceptions in this period. Try This month or a wider custom range.'
                : 'No open ECM exceptions.'}
          </p>
        ) : (
          visibleVisits.map(visit => {
            const key = visitQueueKey(visit.jobId)
            const expanded =
              expandedId === undefined
                ? key === defaultExpandedId
                : expandedId === key
            return (
              <VisitQueueCard
                key={key}
                rows={visit.rows}
                expanded={expanded}
                focused={Boolean(focusJobId && visit.jobId === focusJobId)}
                onToggle={() =>
                  setExpandedId(current => {
                    const openId = current === undefined ? defaultExpandedId : current
                    return openId === key ? null : key
                  })
                }
                onOpenVisit={onOpenVisit}
              />
            )
          })
        )}
      </div>
    </ContentCard>
  )
}
