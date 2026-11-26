import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserMedicalSafety } from '@/features/alerts/hooks/useServiceUserMedicalSafety'
import { usePersonSurveyHistory } from '@/features/surveys/reminders/survey-reminders'
import { useSafeguardingList } from '@/features/safeguarding/hooks/useSafeguarding'
import { usePathwayCases } from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import { PATHWAY_META } from '@/features/specialist-pathways/pathway-specs'
import {
  CHECKLIST_GROUP_ORDER,
  type ChecklistItem,
} from '@/features/service-users/dashboard/service-user-checklist'

/* ─── Links ───────────────────────────────────────────────────────────── */

export type OverviewTarget =
  | { to: '/service-users/$serviceUserId/profile'; search: { tab: string; focus?: string } }
  | {
      to:
        | '/service-users/$serviceUserId/visit-plan'
        | '/service-users/$serviceUserId/care-plan'
        | '/service-users/$serviceUserId/medication'
        | '/service-users/$serviceUserId/ecm'
        | '/service-users/$serviceUserId/activity'
        | '/service-users/$serviceUserId/alerts'
        | '/service-users/$serviceUserId/documents'
      search?: undefined
    }

const linkClass = 'text-[13px] font-medium text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-400'

export function OverviewLink({
  serviceUserId,
  target,
  children,
  className,
  title,
}: {
  serviceUserId: string
  target: OverviewTarget
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <Link
      to={target.to}
      params={{ serviceUserId }}
      search={target.search}
      className={cn(linkClass, className)}
      title={title}
    >
      {children}
    </Link>
  )
}

export const profileTab = (tab: string, focus?: string): OverviewTarget => ({
  to: '/service-users/$serviceUserId/profile',
  search: focus ? { tab, focus } : { tab },
})

/* ─── Card + rows ─────────────────────────────────────────────────────── */

export function OverviewCard({
  title,
  action,
  children,
  className,
  testId,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card px-5 py-[18px]', className)} data-testid={testId}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {action ? <div className="shrink-0 whitespace-nowrap">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

export type RowTone = 'ok' | 'warn' | 'danger' | 'muted'

export function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: RowTone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border/70 py-2.5 text-sm first:border-t-0">
      <span className="shrink-0 whitespace-nowrap text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-right font-medium text-foreground',
          tone === 'ok' && 'text-green-700 dark:text-green-400',
          tone === 'warn' && 'text-amber-700 dark:text-amber-400',
          tone === 'danger' && 'text-red-700 dark:text-red-400',
          tone === 'muted' && 'text-muted-foreground/70',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** A row value that is empty shows a muted dash. */
export function valueOrDash(value: string | null | undefined): { value: string; tone?: RowTone } {
  const v = value?.trim()
  return v ? { value: v } : { value: '—', tone: 'muted' }
}

/* ─── Status strip ───────────────────────────────────────────────────── */

export function StatusTile({
  label,
  value,
  action,
  attention,
  testId,
}: {
  label: string
  value: React.ReactNode
  action?: React.ReactNode
  /** Amber when something needs a look. */
  attention?: boolean
  testId?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5',
        attention
          ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
          : 'border-border bg-card',
      )}
      data-testid={testId}
    >
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground">{value}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function SafetyTile({ serviceUserId }: { serviceUserId: string }) {
  const { snapshot, medicalLoading, medicalError, permissions } = useServiceUserMedicalSafety(serviceUserId, {
    omitFlashFromImmediate: true,
  })
  if (!permissions.canProfile && !permissions.canAllergies && !permissions.canMedAllergies) return null
  const count = snapshot.immediate.length
  const value = medicalLoading
    ? 'Loading…'
    : medicalError
      ? 'Could not load'
      : count === 0
        ? 'None recorded'
        : count === 1
          ? snapshot.immediate[0]!.title
          : `${count} important — ${snapshot.immediate[0]!.title}`
  return (
    <StatusTile
      label="Safety alerts"
      value={value}
      attention={count > 0}
      testId="overview-status-safety"
      action={
        <OverviewLink serviceUserId={serviceUserId} target={{ to: '/service-users/$serviceUserId/alerts' }}>
          View
        </OverviewLink>
      }
    />
  )
}

export function SurveysTile({ serviceUserId }: { serviceUserId: string }) {
  const canSee = useAuthStore(s => s.can('surveys.read') || s.can('surveys.manage') || s.can('surveys.responses.record'))
  const { data, isLoading } = usePersonSurveyHistory({ serviceUserId }, canSee)
  if (!canSee) return null
  const waiting = (data?.notAnswered ?? []).filter(n => n.open && n.person).length
  const parts = data
    ? [
        data.comingUp.length ? `${data.comingUp.length} coming up` : null,
        waiting ? `${waiting} waiting for answers` : null,
        data.answered.length ? `${data.answered.length} answered` : null,
      ].filter(Boolean)
    : []
  return (
    <StatusTile
      label="Surveys"
      value={isLoading ? 'Loading…' : parts.length ? parts.join(' · ') : 'None sent or scheduled'}
      attention={waiting > 0}
      testId="overview-status-surveys"
      action={
        <OverviewLink serviceUserId={serviceUserId} target={profileTab('surveys')}>
          Open
        </OverviewLink>
      }
    />
  )
}

export function SafeguardingTile({ serviceUserId }: { serviceUserId: string }) {
  const { data: cases, isLoading } = useSafeguardingList({ aboutServiceUserId: serviceUserId })
  const open = (cases ?? []).filter(c => c.status !== 'CLOSED')
  const first = open[0] ?? cases?.[0]
  return (
    <StatusTile
      label="Safeguarding"
      value={
        isLoading
          ? 'Loading…'
          : open.length
            ? `${open.length} open concern${open.length === 1 ? '' : 's'}`
            : cases?.length
              ? `No open concerns (${cases.length} closed)`
              : 'No concerns'
      }
      attention={open.length > 0}
      testId="overview-status-safeguarding"
      action={
        first ? (
          <Link to="/safeguarding/$caseId" params={{ caseId: first.id }} className={linkClass}>
            View
          </Link>
        ) : (
          <Link to="/safeguarding" className={linkClass}>
            View
          </Link>
        )
      }
    />
  )
}

/** Care delivery row: specialist pathway cases (only for users with specialist_pathways.read). */
export function PathwaysRow({ serviceUserId }: { serviceUserId: string }) {
  const { data: cases, isLoading } = usePathwayCases({ serviceUserId })
  const open = (cases ?? []).filter(c => c.status !== 'CLOSED')
  const overdue = open.some(c => c.reviewOverdue)
  return (
    <Row
      label="Specialist pathways"
      tone={overdue ? 'danger' : undefined}
      value={
        isLoading
          ? '…'
          : open.length
            ? open.map(c => PATHWAY_META[c.pathwayType].label).join(', ') + (overdue ? ' · review overdue' : '')
            : 'None'
      }
    />
  )
}

/* ─── Get ready for care ─────────────────────────────────────────────── */

/** The checks that block rota, visits and billing, in the order to do them. */
const PRIORITY_STEPS: Record<string, { title: string; detail: string; cta: string }> = {
  'care-plan': { title: 'Publish a care plan', detail: 'Link from the initial assessment or a care pathway', cta: 'Create plan' },
  'visit-plan': { title: 'Set up the visit plan', detail: 'Needed to generate the rota', cta: 'Set up visits' },
  'access-method': { title: 'Record access & entry details', detail: 'How carers get in, key safe location and code', cta: 'Add details' },
  'charge-card': { title: 'Assign a charge card', detail: 'Needed to bill visits', cta: 'Assign card' },
  funders: { title: 'Add a funder', detail: 'Who pays for the care', cta: 'Add funder' },
  'initial-assessment': { title: 'Complete the initial assessment', detail: 'Needed before care starts', cta: 'Start assessment' },
  address: { title: 'Add the home address', detail: 'Needed for visits and travel', cta: 'Add address' },
}

function CheckMark({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
        done
          ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
      )}
      aria-label={done ? 'Done' : 'Missing'}
    >
      {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
    </span>
  )
}

export function GetReadyForCare({ serviceUserId, items }: { serviceUserId: string; items: ChecklistItem[] }) {
  const done = items.filter(i => i.done).length
  const total = items.length
  const percent = total ? Math.round((done / total) * 100) : 0
  const steps = Object.keys(PRIORITY_STEPS)
    .map(id => items.find(i => i.id === id && !i.done))
    .filter((i): i is ChecklistItem => Boolean(i))
    .slice(0, 3)
  const groups = CHECKLIST_GROUP_ORDER.map(group => {
    const groupItems = items.filter(i => i.group === group)
    // Added items first, each part in checklist order.
    return { group, items: [...groupItems.filter(i => i.done), ...groupItems.filter(i => !i.done)] }
  }).filter(g => g.items.length > 0)

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-5 sm:px-6" data-testid="service-user-checklist">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold text-foreground">Get ready for care</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {done} of {total} details added.
            {steps.length > 0
              ? ` Start with ${steps.length === 1 ? 'this one — it blocks' : `the first ${steps.length === 2 ? 'two' : 'three'} — they block`} rota, visits or billing.`
              : done === total
                ? ' Everything is in place.'
                : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="inline-block h-1.5 w-[120px] overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full bg-teal-700" style={{ width: `${percent}%` }} />
          </span>
          <span className="tabular-nums">
            {done} / {total}
          </span>
        </div>
      </div>

      {steps.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-2" data-testid="checklist-priority-steps">
          {steps.map((item, index) => {
            const step = PRIORITY_STEPS[item.id]!
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[10px] border border-orange-200 bg-orange-50/70 px-3.5 py-3 dark:border-orange-900 dark:bg-orange-950/20"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-orange-300 bg-card text-[13px] font-semibold text-amber-700 dark:border-orange-800 dark:text-amber-400">
                  {index + 1}
                </span>
                <div className="min-w-[160px] flex-1">
                  <div className="text-sm font-semibold text-foreground">{step.title}</div>
                  <div className="text-[13px] text-muted-foreground">{step.detail}</div>
                </div>
                <Link
                  to={item.to}
                  params={{ serviceUserId }}
                  search={item.search}
                  className={cn(
                    'flex h-9 shrink-0 items-center rounded-lg px-3.5 text-[13px] font-medium no-underline',
                    index < 2
                      ? 'bg-teal-700 text-white hover:bg-teal-800'
                      : 'border border-input bg-card text-foreground hover:bg-muted',
                  )}
                >
                  {step.cta}
                </Link>
              </li>
            )
          })}
        </ol>
      ) : null}

      <div className="mt-5 grid gap-x-7 gap-y-3 border-t border-border/70 pt-[18px] [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group}>
            <div className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {group} · {groupItems.filter(i => i.done).length} of {groupItems.length}
            </div>
            <ul className="mt-2 flex flex-col gap-0.5">
              {groupItems.map(item => (
                <li
                  key={item.id}
                  className="flex items-center gap-2.5 py-1.5 text-sm"
                  data-testid={`checklist-item-${item.id}`}
                  data-done={item.done}
                  title={item.detail}
                >
                  <CheckMark done={item.done} />
                  <span className={cn('min-w-0 flex-1', item.done ? 'text-muted-foreground' : 'text-foreground')}>
                    {item.title}
                  </span>
                  <Link
                    to={item.to}
                    params={{ serviceUserId }}
                    search={item.search}
                    className={cn(
                      'text-[13px] font-medium hover:underline',
                      item.done ? 'text-muted-foreground' : 'text-teal-700 dark:text-teal-400',
                    )}
                  >
                    {item.linkLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
