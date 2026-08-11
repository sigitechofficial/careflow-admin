import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2, MapPin } from 'lucide-react'
import { fetchBodyMapHandover } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { recordTypeLabel } from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

type Props = {
  serviceUserId: string
  /** Compact strip for MAR / other modules */
  compact?: boolean
  /** Visit workspace: always pull latest after mobile carer writes */
  refreshOnMount?: boolean
}

export function BodyMapHandoverPreview({ serviceUserId, compact, refreshOnMount }: Props) {
  const query = useQuery({
    queryKey: [...bodyMapKeys.all, 'handover', serviceUserId] as const,
    queryFn: ({ signal }) => fetchBodyMapHandover(serviceUserId, signal),
    enabled: Boolean(serviceUserId),
    refetchOnMount: refreshOnMount ? 'always' : undefined,
    staleTime: refreshOnMount ? 0 : undefined,
  })

  if (query.isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading body map handover…
      </p>
    )
  }

  if (query.isError || !query.data) return null

  const data = query.data
  if (data.activeCount === 0) {
    if (compact) return null
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Visit handover — body map</p>
        <p className="mt-1 text-xs">No active body map concerns on file.</p>
      </div>
    )
  }

  const urgent = data.highRiskCount > 0 || data.safeguardingCount > 0

  if (compact) {
    return (
      <div
        className={
          urgent
            ? 'rounded-lg border border-amber-300 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950'
            : 'rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2.5 text-xs text-blue-950'
        }
      >
        <p className="flex items-center gap-1.5 font-semibold">
          {urgent ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          Body map handover — {data.activeCount} active concern
          {data.activeCount === 1 ? '' : 's'}
        </p>
        <ul className="mt-1.5 space-y-0.5">
          {data.concerns.slice(0, 4).map(c => (
            <li key={c.recordId}>
              {recordTypeLabel(c.recordType as BodyMapRecordTypeCode)}
              {c.subType ? ` · ${c.subType}` : ''}
              {c.bodyPart ? ` — ${c.bodyPart}` : ''}
              {c.reviewOverdue ? ' · review overdue' : ''}
            </li>
          ))}
          {data.concerns.length > 4 ? (
            <li className="text-muted-foreground">+{data.concerns.length - 4} more…</li>
          ) : null}
        </ul>
        <Link
          to="/service-users/$serviceUserId/body-map"
          params={{ serviceUserId }}
          className="mt-2 inline-block font-semibold text-indigo-700 hover:underline"
        >
          Open body map →
        </Link>
      </div>
    )
  }

  return (
    <section
      className={
        urgent
          ? 'rounded-xl border border-amber-300 bg-amber-50/80 p-4'
          : 'rounded-xl border border-blue-200 bg-blue-50/60 p-4'
      }
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-blue-700" aria-hidden />
            Visit handover — body map
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Active markers and concerns before the visit (§13). Updated{' '}
            {formatGbDateTime(data.generatedAt)}.
          </p>
        </div>
        <Link
          to="/service-users/$serviceUserId/body-map"
          params={{ serviceUserId }}
          className="text-xs font-semibold text-indigo-700 hover:underline"
        >
          Full body map
        </Link>
      </header>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-background px-2 py-0.5 font-medium">
          {data.activeCount} active
        </span>
        {data.highRiskCount > 0 ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-medium text-red-900">
            {data.highRiskCount} high / urgent
          </span>
        ) : null}
        {data.safeguardingCount > 0 ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-medium text-red-900">
            {data.safeguardingCount} safeguarding
          </span>
        ) : null}
        {data.reviewDueCount > 0 ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-900">
            {data.reviewDueCount} review overdue
          </span>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2">
        {data.concerns.map(c => (
          <li
            key={c.recordId}
            className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs"
          >
            <p className="font-semibold text-foreground">
              {recordTypeLabel(c.recordType as BodyMapRecordTypeCode)}
              {c.subType ? ` · ${c.subType}` : ''}
              <span className="ml-1 font-normal text-muted-foreground">
                ({c.riskLevel})
              </span>
            </p>
            {c.bodyPart ? (
              <p className="mt-0.5">
                Location: {c.bodyPart}
                {c.specificLocation ? ` — ${c.specificLocation}` : ''}
                {c.bodyView ? ` · ${c.bodyView.toLowerCase()}` : ''}
              </p>
            ) : null}
            {c.descriptionPreview ? (
              <p className="mt-0.5 text-muted-foreground">{c.descriptionPreview}</p>
            ) : null}
            {c.reviewOverdue ? (
              <p className="mt-0.5 font-medium text-amber-800">Review overdue</p>
            ) : null}
            {c.safeguardingTriggered ? (
              <p className="mt-0.5 font-medium text-red-800">Safeguarding triggered</p>
            ) : null}
          </li>
        ))}
      </ul>

      {data.patchSites.length > 0 ? (
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Patch sites
          </p>
          <ul className="mt-1 space-y-1 text-xs">
            {data.patchSites.map(p => (
              <li key={p.recordId}>
                {p.medicineName ?? 'Patch'} — {p.bodyPart ?? 'site on map'}
                {p.nextChangeDue
                  ? ` · change due ${formatGbDateTime(p.nextChangeDue)}`
                  : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
