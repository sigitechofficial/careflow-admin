import * as React from 'react'
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { EmptyState, PageHeader } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import {
  useApproveHours,
  useHoursApprovals,
  useRejectHours,
} from '@/features/hours-approvals/hooks'
import type { HoursApproval, HoursApprovalStatus } from '@/features/hours-approvals/api'

const TABS: { id: HoursApprovalStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
]

/** Hard weekly cap — extra hours above this can never be approved (mirrors backend). */
const MAX_APPROVABLE_WEEKLY_HOURS = 60

const STATUS_BADGE: Record<HoursApprovalStatus, React.ComponentProps<typeof Badge>['variant']> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
}

const STATUS_LABEL: Record<HoursApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

function exceedsWeeklyCap(row: HoursApproval) {
  return (row.projectedWeeklyHours ?? 0) > MAX_APPROVABLE_WEEKLY_HOURS
}

export default function HoursApprovalsPage() {
  const canManage = useAuthStore(s => s.can('hours_approvals.manage'))
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatInstant = (iso: string | null | undefined) => {
    if (!iso) return '—'
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }

  const [tab, setTab] = React.useState<HoursApprovalStatus>('PENDING')
  const { data: rows = [], isLoading, isError } = useHoursApprovals(tab)
  const approveMut = useApproveHours()
  const rejectMut = useRejectHours()

  const [rejectTarget, setRejectTarget] = React.useState<HoursApproval | null>(null)

  const overCapCount = tab === 'PENDING' ? rows.filter(exceedsWeeklyCap).length : 0
  const showActions = canManage && tab === 'PENDING'

  const handleApprove = async (id: string) => {
    try {
      await approveMut.mutateAsync({ id })
      toastSuccess('Extra hours approved')
    } catch (e) {
      toastApiError(e, 'Could not approve')
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    try {
      await rejectMut.mutateAsync({ id: rejectTarget.id })
      toastSuccess('Rejected — carer removed from the plan')
      setRejectTarget(null)
    } catch (e) {
      toastApiError(e, 'Could not reject')
    }
  }

  return (
    <div className="flex w-full flex-col gap-4" data-testid="hours-approvals-page">
      <PageHeader
        title="Hours approvals"
        description="Review carers assigned beyond their contracted weekly hours. Approve to keep the assignment, or reject to remove them from the visit plan."
        icon={<Clock className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Employee' },
          { label: 'Hours approvals' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {TABS.map(t => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tab === t.id ? 'default' : 'ghost'}
              className="gap-1.5"
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {tab === t.id && !isLoading ? (
                <span className="rounded-full bg-background/20 px-1.5 py-0 text-[10px] font-semibold tabular-nums">
                  {rows.length}
                </span>
              ) : null}
            </Button>
          ))}
        </div>

        {tab === 'PENDING' && overCapCount > 0 ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {overCapCount} request{overCapCount === 1 ? '' : 's'} over the {MAX_APPROVABLE_WEEKLY_HOURS}h cap
          </p>
        ) : null}
      </div>

      {tab === 'PENDING' ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              If projected weekly hours exceed{' '}
              <span className="font-semibold tabular-nums">{MAX_APPROVABLE_WEEKLY_HOURS}h</span>, Approve is
              disabled. Reduce the carer&apos;s assigned hours on the visit plan first — you can still Reject to
              remove them from the plan.
            </p>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading approvals…
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">Could not load approvals.</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-6 w-6" aria-hidden />}
            title={`No ${tab.toLowerCase()} requests`}
            description={
              tab === 'PENDING'
                ? 'When a carer is assigned beyond their contracted hours on a visit plan, a request will appear here.'
                : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5">Carer</th>
                    <th className="px-4 py-2.5">Service user</th>
                    <th className="px-4 py-2.5 text-right">Contracted</th>
                    <th className="px-4 py-2.5 text-right">Projected</th>
                    <th className="px-4 py-2.5 text-right">Extra</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">{tab === 'PENDING' ? 'Requested' : 'Decided'}</th>
                    {showActions ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const overCap = exceedsWeeklyCap(r)
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-border/70 last:border-0 hover:bg-muted/30 ${
                          overCap ? 'bg-destructive/[0.03]' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            to="/employee/$employeeId/edit"
                            params={{ employeeId: r.employeeId }}
                            search={{ tab: 'employment' }}
                            className="font-medium text-primary underline-offset-2 hover:underline"
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
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {r.contractedWeeklyHours ?? '—'}h
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={overCap ? 'font-semibold text-destructive' : 'font-medium text-foreground'}>
                            ~{r.projectedWeeklyHours ?? '—'}h
                          </span>
                          {overCap ? (
                            <Badge variant="destructive" size="sm" className="ml-2 align-middle">
                              Over {MAX_APPROVABLE_WEEKLY_HOURS}h
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-700 dark:text-amber-300">
                          +{r.extraHours ?? '—'}h
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_BADGE[r.status]} size="sm">
                            {STATUS_LABEL[r.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {formatInstant(tab === 'PENDING' ? r.requestedAt : r.decidedAt ?? r.requestedAt)}
                        </td>
                        {showActions ? (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="gap-1.5"
                                disabled={approveMut.isPending || rejectMut.isPending || overCap}
                                title={
                                  overCap
                                    ? `Cannot approve — exceeds the ${MAX_APPROVABLE_WEEKLY_HOURS}h weekly maximum. Reduce assigned hours first.`
                                    : undefined
                                }
                                onClick={() => void handleApprove(r.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-destructive hover:text-destructive"
                                disabled={approveMut.isPending || rejectMut.isPending}
                                onClick={() => setRejectTarget(r)}
                              >
                                <XCircle className="h-3.5 w-3.5" aria-hidden />
                                Reject
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
              {rows.length} request{rows.length === 1 ? '' : 's'}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={rejectTarget != null} onOpenChange={o => !o && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject extra hours?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget ? (
                <>
                  Rejecting will remove <span className="font-medium text-foreground">{rejectTarget.employeeName}</span>{' '}
                  from <span className="font-medium text-foreground">{rejectTarget.serviceUserName}</span>&apos;s visit
                  plan. This cannot be undone from this screen.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rejectMut.isPending}
              onClick={e => {
                e.preventDefault()
                void handleReject()
              }}
            >
              {rejectMut.isPending ? 'Rejecting…' : 'Reject & remove carer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
