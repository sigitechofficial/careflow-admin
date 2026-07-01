import * as React from 'react'
import { usePortalVisitPlans } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import type { PortalVisitPlan } from '@/features/service-user-portal/api/portal.api'
import {
  formatPortalDate,
  PortalReadOnlyField,
  PortalSection,
} from '@/features/service-user-portal/components/portal-display.util'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-table'
import { cn } from '@/shared/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  ENDED: 'Ended',
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'SUSPENDED':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    case 'ENDED':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatCarers(slot: PortalVisitPlan['slots'][number]): string {
  if (slot.carers.length === 0) {
    return slot.requiredCarers > 1 ? `${slot.requiredCarers} carers required` : 'To be assigned'
  }
  return slot.carers
    .map(c => (c.dayLabel ? `${c.displayName} (${c.dayLabel})` : c.displayName))
    .join(', ')
}

function VisitPlanSummary({ plan }: { plan: PortalVisitPlan }) {
  return (
    <PortalSection title="Plan summary">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusBadgeClass(plan.status),
          )}
        >
          {STATUS_LABELS[plan.status] ?? plan.status}
        </span>
        {plan.weeklyContractedHours ? (
          <span className="text-sm text-muted-foreground">
            {plan.weeklyContractedHours} hours per week
          </span>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PortalReadOnlyField label="Effective from" value={formatPortalDate(plan.effectiveFrom)} />
        <PortalReadOnlyField label="Effective to" value={formatPortalDate(plan.effectiveTo)} />
        <PortalReadOnlyField label="Review due" value={formatPortalDate(plan.reviewDueAt)} />
        {plan.status === 'SUSPENDED' ? (
          <>
            <PortalReadOnlyField label="Suspended" value={formatPortalDate(plan.suspendedAt)} />
            <PortalReadOnlyField label="Reason" value={plan.pauseReason?.name} />
            <PortalReadOnlyField label="Expected resume" value={formatPortalDate(plan.expectedResumeAt)} />
          </>
        ) : null}
        {plan.notes ? <PortalReadOnlyField label="Notes" value={plan.notes} /> : null}
      </div>
    </PortalSection>
  )
}

function VisitPlanSlotsTable({ plan }: { plan: PortalVisitPlan }) {
  if (plan.slots.length === 0) {
    return <p className="text-sm text-muted-foreground">No visits are scheduled on this plan yet.</p>
  }

  return (
    <PortalSection title="Your visits">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visit</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Carers</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.slots.map(slot => (
              <TableRow key={slot.id}>
                <TableCell className="font-medium">{slot.label}</TableCell>
                <TableCell>{slot.daysLabel}</TableCell>
                <TableCell>
                  {slot.plannedStartTime} – {slot.plannedEndTime}
                </TableCell>
                <TableCell>{formatCarers(slot)}</TableCell>
                <TableCell className="max-w-xs text-muted-foreground">{slot.notes || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalSection>
  )
}

export default function PortalVisitPlansPage() {
  const { data, isLoading } = usePortalVisitPlans()
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null)

  const plans = data?.plans ?? []
  const active = data?.active ?? null

  React.useEffect(() => {
    if (!plans.length) {
      setSelectedPlanId(null)
      return
    }
    setSelectedPlanId(prev => {
      if (prev && plans.some(p => p.id === prev)) return prev
      return active?.id ?? plans[0]?.id ?? null
    })
  }, [plans, active])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading visit plan…</p>
  }

  if (!plans.length) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Visit plan</h1>
        <p className="text-sm text-muted-foreground">
          No visit plan is on your record yet. Your care team will set this up for you.
        </p>
      </div>
    )
  }

  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? active ?? plans[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Visit plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          When your carers visit and who is assigned. Contact your care team to request changes.
        </p>
      </div>

      {plans.length > 1 ? (
        <label className="block max-w-md space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Plan version</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={selectedPlan?.id ?? ''}
            onChange={e => setSelectedPlanId(e.target.value)}
          >
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {STATUS_LABELS[plan.status] ?? plan.status} — from {formatPortalDate(plan.effectiveFrom)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {selectedPlan ? (
        <>
          <VisitPlanSummary plan={selectedPlan} />
          <VisitPlanSlotsTable plan={selectedPlan} />
        </>
      ) : null}
    </div>
  )
}
