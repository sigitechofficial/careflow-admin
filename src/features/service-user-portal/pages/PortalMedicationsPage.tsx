import * as React from 'react'
import { Pill } from 'lucide-react'
import { usePortalMedications } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import type { PortalMedicationTimelineItem } from '@/features/service-user-portal/api/portal.api'
import { PortalSection } from '@/features/service-user-portal/components/portal-display.util'
import { formatPortalDateTime } from '@/features/service-user-portal/components/portal-display.util'
import { Timeline, type TimelineEvent } from '@/shared/ui/timeline'
import { cn } from '@/shared/lib/utils'

function formatScheduleTime(value: string | null): string {
  if (!value) return '—'
  if (/^\d{2}:\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function timelineType(status: string): TimelineEvent['type'] {
  switch (status) {
    case 'GIVEN':
      return 'success'
    case 'REFUSED':
    case 'NOT_GIVEN':
    case 'MISSED':
      return 'destructive'
    case 'HELD':
      return 'warning'
    default:
      return 'default'
  }
}

function toTimelineEvent(item: PortalMedicationTimelineItem): TimelineEvent {
  const descriptionParts = [
    item.roundLabel ? `Round: ${item.roundLabel}` : null,
    item.dose ? `Dose: ${item.dose}` : null,
    item.reason,
    item.isPrn ? 'PRN medication' : null,
  ].filter(Boolean)

  return {
    id: item.id,
    title: item.medicationName,
    description: descriptionParts.join(' · ') || undefined,
    date: item.recordedAt ?? item.scheduledAt ?? '',
    category: item.statusLabel,
    type: timelineType(item.status),
    author: item.carerName ?? undefined,
    metadata:
      item.scheduledAt && item.scheduledAt !== item.recordedAt
        ? { Scheduled: formatPortalDateTime(item.scheduledAt) }
        : undefined,
  }
}

export default function PortalMedicationsPage() {
  const { data, isLoading, error } = usePortalMedications()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading medications…</p>
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load medications. Please try again later.
      </div>
    )
  }

  const timelineEvents = data.timeline.map(toTimelineEvent)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Medications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your current medicines and a timeline of recent administrations from the last 30 days.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Current medications ({data.activeMedications.length})
        </h2>
        {data.activeMedications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active medications on your record.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.activeMedications.map(med => (
              <PortalSection key={med.id} title={med.name}>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      med.status === 'PAUSED'
                        ? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
                        : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
                    )}
                  >
                    {med.statusLabel}
                  </span>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Dose</dt>
                    <dd className="text-foreground">{med.dose ?? med.strength ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Route</dt>
                    <dd className="text-foreground">{med.routeName ?? '—'}</dd>
                  </div>
                </dl>
                {med.schedules.length > 0 ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Scheduled times
                    </p>
                    <ul className="space-y-1.5">
                      {med.schedules.map((slot, index) => (
                        <li
                          key={`${med.id}-${index}`}
                          className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-sm"
                        >
                          <span className="text-foreground">
                            {slot.roundName ?? slot.dueVisitName ?? 'Scheduled dose'}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatScheduleTime(slot.dueTime)}
                            {slot.dose ? ` · ${slot.dose}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </PortalSection>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Pill className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Administration timeline</h2>
        </div>
        {timelineEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No medication administrations recorded in the last 30 days.
          </p>
        ) : (
          <Timeline events={timelineEvents} />
        )}
      </section>
    </div>
  )
}
