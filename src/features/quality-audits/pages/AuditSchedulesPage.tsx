import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CalendarClock, CalendarPlus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import type { AuditSchedule } from '../types'
import { useAuditSchedules, useStopAuditSchedule, useUpdateAuditSchedule } from '../hooks'
import { FREQUENCY_LABEL, STATUS_LABEL } from '../labels'
import { ScheduleAuditDialog } from '../components/ScheduleAuditDialog'
import { useAccountableOptions } from '../components/AuditFiltersBar'
import { PersonChip } from '../components/AuditTable'

/** Governance → Audits → Schedules: which audits run where, how often, and who is accountable. */
export default function AuditSchedulesPage() {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('quality_audits.manage'))
  const [includeStopped, setIncludeStopped] = React.useState(false)
  const query = useAuditSchedules({ includeStopped })
  const stop = useStopAuditSchedule()
  const update = useUpdateAuditSchedule()
  const people = useAccountableOptions(canManage)
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const rows = query.data ?? []

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError(null)
    try {
      await fn()
      toastSuccess(ok)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the schedule.')
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="audit-schedules-page">
      <PageHeader
        title="Audit schedules"
        description="Each schedule makes the next audit when it falls due, and marks it missed if it is not done in time."
        icon={<CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: 'Audits', href: '/governance/audits' }, { label: 'Schedules' }]}
        actions={canManage ? [{ label: 'Schedule audit', onClick: () => setOpen(true), icon: <CalendarPlus className="h-4 w-4" /> }] : []}
      />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <label className="mb-3 flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={includeStopped} onChange={e => setIncludeStopped(e.target.checked)} />
          Show stopped schedules
        </label>
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="audit-schedules-table">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {['Audit', 'Branch', 'How often', 'Window', 'Person accountable', 'Next due', ''].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No audits are scheduled yet.
                  </td>
                </tr>
              ) : (
                rows.map((s: AuditSchedule) => (
                  <tr key={s.id} className="border-b border-border last:border-0" data-testid="audit-schedule-row">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{s.template.title}</div>
                      <div className="text-xs text-muted-foreground">{s.template.area?.name ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.location?.name ?? 'Whole organisation'}</td>
                    <td className="px-3 py-2.5">
                      {canManage && !s.stoppedAt ? (
                        <select
                          className={`${feedbackSelectClass} h-8 max-w-[10rem] py-0 text-xs`}
                          value={s.frequency}
                          aria-label={`How often: ${s.template.title}`}
                          onChange={e =>
                            void run(
                              () => update.mutateAsync({ id: s.id, body: { frequency: e.target.value as AuditSchedule['frequency'] } }),
                              'Schedule saved',
                            )
                          }
                        >
                          {Object.entries(FREQUENCY_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      ) : (
                        FREQUENCY_LABEL[s.frequency]
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                      {s.earlyDays} day(s) early · {s.lateDays} late
                    </td>
                    <td className="px-3 py-2.5">
                      {canManage && !s.stoppedAt ? (
                        <select
                          className={`${feedbackSelectClass} h-8 max-w-[12rem] py-0 text-xs`}
                          value={s.accountable?.id ?? ''}
                          aria-label={`Person accountable: ${s.template.title}`}
                          onChange={e =>
                            void run(
                              () => update.mutateAsync({ id: s.id, body: { accountableUserId: e.target.value || null } }),
                              'Schedule saved',
                            )
                          }
                        >
                          <option value="">No one</option>
                          {s.accountable && !people.some(p => p.id === s.accountable!.id) ? (
                            <option value={s.accountable.id}>{s.accountable.name ?? 'Someone'}</option>
                          ) : null}
                          {people.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <PersonChip name={s.accountable?.name} />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {s.stoppedAt ? (
                        <Badge size="sm" variant="muted">
                          Stopped {formatOrganisationDate(s.stoppedAt)}
                        </Badge>
                      ) : s.next ? (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => void navigate({ to: '/governance/audits/$auditId', params: { auditId: s.next!.auditId } })}
                        >
                          {formatOrganisationDate(s.next.dueDate)} · {STATUS_LABEL[s.next.status]}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {canManage && !s.stoppedAt ? (
                        <InlineConfirm
                          title="Stop this schedule?"
                          description="No more audits will be made from it. The one waiting to be done is cancelled; one already started is kept."
                          confirmLabel="Stop"
                          destructive
                          onConfirm={() => void run(() => stop.mutateAsync(s.id), 'Schedule stopped')}
                        >
                          <Button size="sm" variant="ghost" className="text-destructive" data-testid="audit-schedule-stop">
                            Stop
                          </Button>
                        </InlineConfirm>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ScheduleAuditDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
