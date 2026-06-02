import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Printer } from 'lucide-react'
import { fetchBodyMapExport } from '@/features/service-users/body-map/api'
import type { BodyMapRecordRow, BodyMapSummary } from '@/features/service-users/body-map/types'
import { recordTypeLabel } from '@/features/service-users/body-map/catalog/record-types'
import { Button } from '@/shared/ui/button'
import { toastApiError } from '@/shared/lib/toast'
import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

type ExportPayload = {
  exportedAt: string
  format: string
  serviceUser: {
    id: string
    name: string
    dateOfBirth: string | null
    serviceUserNumber: string | null
  } | null
  summary: BodyMapSummary
  records: BodyMapRecordRow[]
  handoverPatchSites?: {
    recordId: string
    medicineName: string | null
    bodyPart: string | null
    nextChangeDue: string | null
    lastAdministrationAt: string | null
  }[]
  auditTrails?: { recordId: string; entries: { action: string; at: string; userId?: string }[] }[]
}

function computeGaps(records: BodyMapRecordRow[]) {
  const now = Date.now()
  const overdueReviews = records.filter(
    r =>
      r.nextReviewAt &&
      new Date(r.nextReviewAt).getTime() < now &&
      !['CLOSED', 'RESOLVED', 'ARCHIVED'].includes(r.status),
  )
  const medMissingDoseLink = records.filter(
    r =>
      r.recordType === 'MEDICATION' &&
      r.medicationSite &&
      !r.medicationSite.lastAdministrationEventId &&
      !['CLOSED', 'RESOLVED', 'ARCHIVED'].includes(r.status),
  )
  return { overdueReviews, medMissingDoseLink }
}

type Props = {
  serviceUserId: string
}

export function BodyMapCqcEvidenceView({ serviceUserId }: Props) {
  const [data, setData] = React.useState<ExportPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchBodyMapExport(serviceUserId)
      .then(payload => {
        if (!cancelled) {
          setData(payload as ExportPayload)
          setError(null)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load evidence pack')
          toastApiError(e, 'Could not load CQC evidence')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [serviceUserId])

  type GapRow = { recordId: string; code?: string; message: string }
  const apiGaps = (data as { outstandingGaps?: GapRow[] } | null)?.outstandingGaps
  const fallbackGaps: GapRow[] = data
    ? [
        ...computeGaps(data.records).overdueReviews.map(r => ({
          recordId: r.id,
          message: `${recordTypeLabel(r.recordType)} — review overdue`,
        })),
        ...computeGaps(data.records).medMissingDoseLink.map(r => ({
          recordId: r.id,
          message: 'Medication site without linked MAR dose',
        })),
      ]
    : []
  const gapRows: GapRow[] = apiGaps?.length ? apiGaps : fallbackGaps
  const activeRecords =
    data?.records.filter(r => !['CLOSED', 'RESOLVED', 'ARCHIVED'].includes(r.status)) ?? []

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Building CQC evidence pack…
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? 'No evidence data'}</p>
  }

  const su = data.serviceUser

  return (
    <div className="body-map-cqc-evidence space-y-6 rounded-lg border bg-card p-6 text-sm print:border-0 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-semibold">CQC evidence pack</h2>
          <p className="text-xs text-muted-foreground">
            Inspection-friendly view · {data.format} · generated{' '}
            {formatGbDateTime(data.exportedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/service-users/$serviceUserId/body-map" params={{ serviceUserId }}>
              Back to body map
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            Print pack
          </Button>
        </div>
      </div>

      <section className="border-b pb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Service user
        </h3>
        <p className="mt-1 text-base font-semibold">{su?.name ?? '—'}</p>
        <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          {su?.serviceUserNumber ? (
            <div>
              <dt className="text-muted-foreground">Number</dt>
              <dd>{su.serviceUserNumber}</dd>
            </div>
          ) : null}
          {su?.dateOfBirth ? (
            <div>
              <dt className="text-muted-foreground">Date of birth</dt>
              <dd>{new Date(su.dateOfBirth).toLocaleDateString('en-GB')}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Active concerns summary
        </h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-md border px-3 py-2">
            <span className="text-muted-foreground">Active records</span>
            <p className="text-lg font-semibold">{data.summary.activeCount}</p>
          </li>
          <li className="rounded-md border px-3 py-2">
            <span className="text-muted-foreground">Review due</span>
            <p className="text-lg font-semibold">{data.summary.reviewDueCount}</p>
          </li>
          <li className="rounded-md border px-3 py-2">
            <span className="text-muted-foreground">High / urgent</span>
            <p className="text-lg font-semibold">{data.summary.highRiskCount}</p>
          </li>
          <li className="rounded-md border px-3 py-2">
            <span className="text-muted-foreground">MAR missing site</span>
            <p className="text-lg font-semibold">
              {data.summary.medicationAlerts?.missingBodyMapSiteCount ?? 0}
            </p>
          </li>
        </ul>
      </section>

      {gapRows.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <h3 className="font-semibold text-amber-950">Outstanding gaps</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-950">
            {gapRows.map(g => (
              <li key={`${g.recordId}-${g.code ?? g.message}`}>{g.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {(data.handoverPatchSites?.length ?? 0) > 0 ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Handover — active patch sites
          </h3>
          <table className="mt-2 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-2">Medicine</th>
                <th className="py-1 pr-2">Location</th>
                <th className="py-1 pr-2">Next change</th>
                <th className="py-1">Last MAR dose</th>
              </tr>
            </thead>
            <tbody>
              {data.handoverPatchSites!.map(row => (
                <tr key={row.recordId} className="border-b border-border/60">
                  <td className="py-1.5 pr-2">{row.medicineName ?? '—'}</td>
                  <td className="py-1.5 pr-2">{row.bodyPart ?? '—'}</td>
                  <td className="py-1.5 pr-2">
                    {row.nextChangeDue ? formatGbDateTime(row.nextChangeDue) : '—'}
                  </td>
                  <td className="py-1.5">
                    {row.lastAdministrationAt
                      ? formatGbDateTime(row.lastAdministrationAt)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Record details ({activeRecords.length} active)
        </h3>
        <div className="mt-2 space-y-4">
          {activeRecords.map(r => (
            <article key={r.id} className="rounded-lg border p-4 break-inside-avoid">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-semibold">
                  {recordTypeLabel(r.recordType)}
                  {r.subType ? ` · ${r.subType}` : ''}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {r.status} · risk {r.riskLevel}
                </span>
              </header>
              {r.description ? (
                <p className="mt-2 text-xs whitespace-pre-wrap">{r.description}</p>
              ) : null}
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {r.markers.map(m => (
                  <li key={m.id}>
                    Marker: {m.bodyView} · {m.bodyPart}
                    {m.specificLocation ? ` (${m.specificLocation})` : ''}
                  </li>
                ))}
                {r.nextReviewAt ? (
                  <li>Next review: {formatGbDateTime(r.nextReviewAt)}</li>
                ) : null}
                {r.medicationSite?.lastAdministrationEvent ? (
                  <li>
                    Linked MAR dose:{' '}
                    {formatGbDateTime(r.medicationSite.lastAdministrationEvent.actualDateTime)}{' '}
                    · {r.medicationSite.lastAdministrationEvent.status}
                  </li>
                ) : null}
                {r.safeguardingCheck ? <li>Safeguarding checklist completed</li> : null}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="text-xs text-muted-foreground print:block">
        <p>
          Full machine-readable pack: use <strong>CQC export</strong> on the body map screen to
          download JSON including audit trails ({data.auditTrails?.length ?? 0} records).
        </p>
      </section>
    </div>
  )
}
