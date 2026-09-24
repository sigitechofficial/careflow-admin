import * as React from 'react'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useApproveHours,
  useHoursApprovals,
  useRejectHours,
} from '@/features/hours-approvals/hooks'
import type { HoursApprovalStatus } from '@/features/hours-approvals/api'

const TABS: { id: HoursApprovalStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
]

/** Hard weekly cap — extra hours above this can never be approved (mirrors backend). */
const MAX_APPROVABLE_WEEKLY_HOURS = 60

const STATUS_TONE: Record<HoursApprovalStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
  APPROVED: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  REJECTED: 'bg-red-500/15 text-red-800 dark:text-red-200',
}

export default function HoursApprovalsPage() {
  const canManage = useAuthStore(s => s.can('hours_approvals.manage'))
  const [tab, setTab] = React.useState<HoursApprovalStatus>('PENDING')
  const { data: rows = [], isLoading, isError } = useHoursApprovals(tab)
  const approveMut = useApproveHours()
  const rejectMut = useRejectHours()

  const handleApprove = async (id: string) => {
    try {
      await approveMut.mutateAsync({ id })
      toastSuccess('Extra hours approved')
    } catch (e) {
      toastApiError(e, 'Could not approve')
    }
  }

  const handleReject = async (id: string) => {
    if (!window.confirm('Reject these extra hours? The carer will be removed from this visit plan.')) return
    try {
      await rejectMut.mutateAsync({ id })
      toastSuccess('Rejected — carer removed from the plan')
    } catch (e) {
      toastApiError(e, 'Could not reject')
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <Clock className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Hours approvals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Carers assigned beyond their contracted weekly hours. Approve to keep the assignment, or
            reject to remove them from the plan.
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-amber-600 text-amber-800 dark:border-amber-400 dark:text-amber-200'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        {isLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Could not load approvals.</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No {tab.toLowerCase()} requests.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Carer</th>
                  <th className="px-4 py-2.5">Service user</th>
                  <th className="px-4 py-2.5 text-right">Contracted</th>
                  <th className="px-4 py-2.5 text-right">Projected</th>
                  <th className="px-4 py-2.5 text-right">Extra</th>
                  <th className="px-4 py-2.5">Status</th>
                  {canManage && tab === 'PENDING' ? (
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link
                        to="/employee/$employeeId/edit"
                        params={{ employeeId: r.employeeId }}
                        search={{ tab: 'employment' }}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {r.employeeName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Link
                        to="/service-users/$serviceUserId/visit-plan"
                        params={{ serviceUserId: r.serviceUserId }}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {r.serviceUserName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.contractedWeeklyHours ?? '—'}h
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${
                        (r.projectedWeeklyHours ?? 0) > MAX_APPROVABLE_WEEKLY_HOURS
                          ? 'text-destructive'
                          : ''
                      }`}
                    >
                      ~{r.projectedWeeklyHours ?? '—'}h
                      {(r.projectedWeeklyHours ?? 0) > MAX_APPROVABLE_WEEKLY_HOURS ? (
                        <span className="ml-1 text-[10px] font-normal">
                          over {MAX_APPROVABLE_WEEKLY_HOURS}h
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-300">
                      +{r.extraHours ?? '—'}h
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    {canManage && tab === 'PENDING' ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            disabled={
                              approveMut.isPending ||
                              rejectMut.isPending ||
                              (r.projectedWeeklyHours ?? 0) > MAX_APPROVABLE_WEEKLY_HOURS
                            }
                            title={
                              (r.projectedWeeklyHours ?? 0) > MAX_APPROVABLE_WEEKLY_HOURS
                                ? `Cannot approve — exceeds the ${MAX_APPROVABLE_WEEKLY_HOURS}h weekly maximum. Reduce assigned hours first.`
                                : undefined
                            }
                            onClick={() => void handleApprove(r.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            disabled={approveMut.isPending || rejectMut.isPending}
                            onClick={() => void handleReject(r.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
