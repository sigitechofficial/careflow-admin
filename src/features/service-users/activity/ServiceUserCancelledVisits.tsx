import * as React from 'react'
import { CalendarOff, ClipboardList, Loader2 } from 'lucide-react'
import { useServiceUserVisitActivity } from '@/features/service-users/activity/hooks'
import type { ServiceUserActivityVisit } from '@/features/service-users/activity/api'
import { useServiceUserVisitPlans } from '@/features/service-users/visit-plan/hooks'
import {
  useVisitPlanDateChangesForPlans,
  visitCancelledByLabel,
  type VisitPlanDateChange,
} from '@/features/service-users/visit-plan/visit-plan-date-changes.api'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyInTimeZone, minutesInOperationalTimeZone } from '@/shared/lib/operational-day.util'
import { contentBodyClass, contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { ChangeCancellationBillingDialog } from '@/features/service-users/activity/ChangeCancellationBillingDialog'

/** "HH:mm" of an instant in the organisation's timezone. */
function hmOf(iso: string): string {
  const minutes = minutesInOperationalTimeZone(new Date(iso))
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

type CancelledRow = {
  key: string
  date: string
  startTime: string
  endTime: string | null
  label: string
  status: 'CANCELLED' | 'CALLED_OFF'
  /** From "Changes for specific dates" on the visit plan: who cancelled, why, billing. */
  planChange: VisitPlanDateChange | null
  /** The rota visit, when one was made (can be opened). */
  visit: ServiceUserActivityVisit | null
}

const CHARGE_LABELS: Record<string, string> = {
  CHARGE: 'Charged',
  NO_CHARGE: 'No charge',
  WAIVE: 'Charge waived',
  PENDING_REVIEW: 'Billing to review',
}

type RotaCancellation = NonNullable<ServiceUserActivityVisit['cancellation']>

/** "Charged · 100% · 22h notice" from the rota cancellation record. */
function billingLabel(decision: string | null, r: RotaCancellation | null): string | null {
  if (!decision) return null
  const parts = [CHARGE_LABELS[decision] ?? decision]
  if (decision === 'CHARGE' && r?.chargePercent != null) parts.push(`${r.chargePercent}%`)
  if (r?.noticeHours != null) parts.push(`${Math.round(r.noticeHours * 10) / 10}h notice`)
  return parts.join(' · ')
}

/** Where a charge stands with invoicing. */
function invoiceLabel(r: RotaCancellation | null): string | null {
  if (!r || r.chargeDecision !== 'CHARGE') return null
  if (!r.invoice) return 'Not invoiced yet'
  return r.invoice.locked
    ? `On ${r.invoice.invoiceNumber ?? 'an invoice'} (locked)`
    : `On ${r.invoice.invoiceNumber ?? 'an invoice run'} (being prepared)`
}

function atLabel(iso: string | null, formatDate: (d: string) => string, formatTime: (iso: string) => string) {
  return iso ? `${formatDate(dayKeyInTimeZone(iso))} ${formatTime(iso)}` : 'Not recorded'
}

/**
 * Cancelled visits of a service user: cancellations recorded on the visit plan (with reason,
 * including dates not on the rota yet) merged with rota visits cancelled or called off elsewhere.
 * A visit cancelled on the plan and on the rota shows once.
 */
export function ServiceUserCancelledVisits({
  serviceUserId,
  dateFrom,
  dateTo,
  onOpenVisit,
  openingVisitId,
}: {
  serviceUserId: string
  dateFrom: string
  dateTo: string
  onOpenVisit: (visit: ServiceUserActivityVisit) => void
  openingVisitId: string | null
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const canChangeBilling = useAuthStore(s => s.can('billing.invoice_runs.manage' as never))
  // Cancelled visit whose billing decision is being changed.
  const [billingFor, setBillingFor] = React.useState<{ jobId: string; label: string; current: string | null } | null>(
    null,
  )
  const rotaQuery = useServiceUserVisitActivity(serviceUserId, {
    page: 1,
    limit: 200,
    dateFrom,
    dateTo,
    statuses: ['CANCELLED', 'CALLED_OFF'],
    sortOrder: 'asc',
  })
  const plansQuery = useServiceUserVisitPlans(serviceUserId)
  const planIds = React.useMemo(() => (plansQuery.data ?? []).map(p => p.id), [plansQuery.data])
  const changeQueries = useVisitPlanDateChangesForPlans(serviceUserId, planIds)

  const loading = rotaQuery.isLoading || plansQuery.isLoading || changeQueries.some(q => q.isLoading)
  const error = rotaQuery.error ?? plansQuery.error ?? changeQueries.find(q => q.error)?.error ?? null

  const rows = React.useMemo<CancelledRow[]>(() => {
    const byKey = new Map<string, CancelledRow>()
    for (const q of changeQueries) {
      for (const c of q.data?.changes ?? []) {
        if (c.type !== 'CANCELLED' || c.date < dateFrom || c.date > dateTo) continue
        const key = `${c.date}|${c.plannedStartTime}`
        byKey.set(key, {
          key,
          date: c.date,
          startTime: c.plannedStartTime,
          endTime: c.plannedEndTime || null,
          label: c.slotLabel,
          status: 'CANCELLED',
          planChange: c,
          visit: null,
        })
      }
    }
    for (const v of rotaQuery.data?.data ?? []) {
      const date = dayKeyInTimeZone(v.scheduledStartDateTime)
      const startTime = hmOf(v.scheduledStartDateTime)
      const key = `${date}|${startTime}`
      const existing = byKey.get(key)
      if (existing) {
        existing.visit = v
        continue
      }
      byKey.set(key, {
        key,
        date,
        startTime,
        endTime: v.scheduledEndDateTime ? hmOf(v.scheduledEndDateTime) : null,
        label: v.visitName,
        status: v.status === 'CALLED_OFF' ? 'CALLED_OFF' : 'CANCELLED',
        planChange: null,
        visit: v,
      })
    }
    return [...byKey.values()].sort((a, b) => `${a.date}|${a.startTime}`.localeCompare(`${b.date}|${b.startTime}`))
  }, [changeQueries, rotaQuery.data, dateFrom, dateTo])

  /** Who cancelled, when and why — from the visit plan record, else the rota record. */
  const cancellationDetails = (row: CancelledRow): { fields: Array<[string, string]> } => {
    const c = row.planChange
    // The rota record holds the live billing decision (it can be changed later by finance).
    const rota = row.visit?.cancellation?.source === 'CANCELLATION' ? row.visit.cancellation : null
    const party = (value: string | null, description: string | null) =>
      value === 'OTHER' && description ? description : value ? visitCancelledByLabel(value) : null
    const fields: Array<[string, string | null]> = []
    if (c) {
      fields.push(
        ['Cancelled by', c.recordedByName ?? 'Not recorded'],
        ['When', atLabel(c.recordedAt, formatDate, formatTime)],
        ['Who asked', party(c.cancelledByParty, c.cancelledByDescription)],
        ['Reason', c.reasonCode === 'OTHER' ? null : c.reasonLabel],
        // The hours-decrease cancel puts the same text in both; show it once.
        ['Notes', c.notes && c.notes !== c.cancelledByDescription ? c.notes : null],
        ['Billing', billingLabel(rota?.chargeDecision ?? c.chargeDecision, rota)],
        ['Invoice', invoiceLabel(rota)],
        ['Where', 'Visit plan — Cancel visits'],
      )
    } else if (row.visit?.cancellation) {
      const r = row.visit.cancellation
      const planChange = r.source === 'PLAN_CHANGE'
      fields.push(
        ['Cancelled by', r.cancelledByName ?? 'Not recorded'],
        ['When', atLabel(r.cancelledAt, formatDate, formatTime)],
        ['Who asked', party(r.cancelledByParty, r.cancelledByDescription)],
        ['Reason', planChange ? 'Visit plan changed' : r.reasonCode === 'OTHER' ? null : r.reasonLabel],
        ['Notes', r.reasonNotes],
        ['Billing', billingLabel(r.chargeDecision, planChange ? null : r)],
        ['Invoice', invoiceLabel(planChange ? null : r)],
        ['Where', planChange ? 'Visit plan amendment' : 'Rota'],
      )
    } else {
      fields.push(['Where', 'Rota (no details recorded)'])
    }
    return { fields: fields.filter((f): f is [string, string] => Boolean(f[1])) }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading cancelled visits…
      </div>
    )
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Could not load cancelled visits'}
      </p>
    )
  }
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
        <CalendarOff className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <p className={cn('mt-3 font-medium', contentTitleClass)}>No cancelled visits in this range</p>
        <p className={cn('mx-auto mt-1 max-w-md', contentHelperClass)}>Try a wider date range.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-2" data-testid="activity-cancelled-list">
        {rows.map(row => {
          const d = cancellationDetails(row)
          const body = (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-foreground">{row.label}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {row.status === 'CALLED_OFF' ? 'Called off' : 'Cancelled'}
                  </Badge>
                  {!row.visit ? (
                    <span className={contentHelperClass}>Not on the rota yet</span>
                  ) : null}
                </div>
                <p className={cn('mt-1', contentHelperClass)}>
                  {formatDate(row.date)} · {row.startTime}
                  {row.endTime ? `–${row.endTime}` : ''}
                </p>
                <dl className={cn('mt-2 grid gap-x-4 gap-y-0.5 sm:grid-cols-[8rem_1fr]', contentBodyClass)}>
                  {d.fields.map(([term, value]) => (
                    <React.Fragment key={term}>
                      <dt className={contentHelperClass}>{term}</dt>
                      <dd>{value}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
              {row.visit ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                  {openingVisitId === row.visit.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ClipboardList className="h-3.5 w-3.5" />
                  )}
                  Details
                </span>
              ) : null}
            </>
          )
          const rowClass =
            'flex w-full items-start justify-between gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 text-left'
          const rota = row.visit?.cancellation?.source === 'CANCELLATION' ? row.visit.cancellation : null
          const canChange = canChangeBilling && row.visit != null && rota != null && !rota.invoice?.locked
          return (
            <li key={row.key}>
              {row.visit ? (
                <button
                  type="button"
                  onClick={() => row.visit && onOpenVisit(row.visit)}
                  disabled={openingVisitId === row.visit.id}
                  className={cn(
                    rowClass,
                    'transition-colors hover:border-teal-300 hover:bg-teal-50/40 dark:hover:border-teal-800 dark:hover:bg-teal-950/20',
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
              {canChange && row.visit ? (
                <div className="mt-1 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      row.visit &&
                      setBillingFor({
                        jobId: row.visit.scheduledJobId,
                        label: `${row.label} · ${formatDate(row.date)} ${row.startTime}`,
                        current: rota?.chargeDecision ?? null,
                      })
                    }
                    data-testid="activity-change-billing"
                  >
                    Change billing decision
                  </Button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className={contentHelperClass}>
        {rows.length} cancelled visit{rows.length === 1 ? '' : 's'}
      </p>
      <ChangeCancellationBillingDialog
        open={billingFor != null}
        onOpenChange={open => {
          if (!open) setBillingFor(null)
        }}
        serviceUserId={serviceUserId}
        scheduledJobId={billingFor?.jobId ?? ''}
        visitLabel={billingFor?.label ?? ''}
        current={billingFor?.current ?? null}
      />
    </>
  )
}
