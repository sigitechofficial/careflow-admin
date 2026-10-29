import * as React from 'react'
import { AlertTriangle, CheckCircle2, Clock, Loader2, PlusCircle, Trash2, XCircle } from 'lucide-react'
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
import { Label, Textarea } from '@/shared/ui/form-field'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import {
  useApproveHours,
  useCheckHoursRequestsWithinLimit,
  useDeleteAllHoursApprovals,
  useHoursApprovals,
  useRejectHours,
} from '@/features/hours-approvals/hooks'
import type {
  ContractedHoursImpact,
  DraftPlanRequestPayload,
  HoursApproval,
  RotaVisitRequestPayload,
  VisitPlanRequestPayload,
  HoursApprovalStatus,
} from '@/features/hours-approvals/types'
import {
  ContractedHoursImpactSummary,
  formatHours,
} from '@/features/hours-approvals/components/ContractedHoursImpactSummary'
import { ServiceUserHoursDecreaseImpact } from '@/features/hours-approvals/components/ServiceUserHoursDecreaseImpact'
import { HoursRequestChanges } from '@/features/hours-approvals/components/HoursRequestChanges'
import {
  AddExtraHoursDialog,
  EXTRA_HOURS_PERMISSION,
} from '@/features/hours-approvals/components/CarerExtraHours'

const TABS: { id: HoursApprovalStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
]

/** Default weekly cap; each carer row carries the one set in Settings → Dom Rules. */
const MAX_APPROVABLE_WEEKLY_HOURS = 60

function approvableCap(row: HoursApproval): number {
  return row.maxApprovableHours ?? MAX_APPROVABLE_WEEKLY_HOURS
}

const STATUS_BADGE: Record<HoursApprovalStatus, React.ComponentProps<typeof Badge>['variant']> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
}

const STATUS_LABEL: Record<HoursApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

function isContractedChange(row: HoursApproval) {
  return row.requestType === 'CONTRACTED_HOURS_CHANGE'
}

function isServiceUserHoursChange(row: HoursApproval) {
  return row.requestType === 'SERVICE_USER_WEEKLY_HOURS_CHANGE'
}

function isExtraVisitRequest(row: HoursApproval) {
  return row.requestType === 'EXTRA_VISIT_OVER_HOURS'
}

function isRotaVisitRequest(row: HoursApproval) {
  return row.requestType === 'ROTA_VISIT_OVER_HOURS'
}

function rotaVisitPayload(row: HoursApproval): RotaVisitRequestPayload | null {
  return isRotaVisitRequest(row) ? ((row.requestPayload as unknown as RotaVisitRequestPayload | null) ?? null) : null
}

const ROTA_SOURCE_LABEL: Record<RotaVisitRequestPayload['source'], string> = {
  ROTA: 'Rota visit',
  EXTRA_VISIT: 'Extra visit',
  SPECIAL_VISIT: 'Special visit',
}

/** Visits of the plan held back from the carer until approved. */
function heldVisitCount(row: HoursApproval): number {
  if (row.requestType !== 'VISIT_PLAN_OVER_HOURS') return 0
  return ((row.requestPayload as unknown as VisitPlanRequestPayload | null)?.withheld ?? []).length
}

/** A carer over their weekly hours (rota / extra / special visit, or a visit plan): extra hours can settle it. */
function isCarerHoursRequest(row: HoursApproval) {
  return row.requestType === 'ROTA_VISIT_OVER_HOURS' || row.requestType === 'VISIT_PLAN_OVER_HOURS'
}

function isDraftPlanRequest(row: HoursApproval) {
  return row.requestType === 'DRAFT_PLAN_OVER_HOURS'
}

/** A draft plan request's busiest week (its payload is not an extra visit's). */
function draftPlanWeek(row: HoursApproval): DraftPlanRequestPayload | null {
  return isDraftPlanRequest(row) ? ((row.requestPayload as unknown as DraftPlanRequestPayload | null) ?? null) : null
}

/** 1550 → "25h 50m". */
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** An extra visit's week: as it is now for pending requests, else as it was when asked for. */
function extraVisitWeek(row: HoursApproval): { weekMinutes: number; limitMinutes: number | null } | null {
  const payload = row.requestPayload
  if (!payload) return null
  const week = row.currentWeek ?? payload
  return {
    weekMinutes: week.weekMinutes,
    limitMinutes: week.limitWeeklyHours != null ? Math.round(week.limitWeeklyHours * 60) : null,
  }
}

function exceedsWeeklyCap(row: HoursApproval) {
  return (
    (row.requestType === 'VISIT_PLAN_OVER_HOURS' || row.requestType === 'ROTA_VISIT_OVER_HOURS') &&
    (row.projectedWeeklyHours ?? 0) > approvableCap(row)
  )
}

/** Pending rows store the preview; decided rows store { requested, applied }. */
function contractedImpact(row: HoursApproval): ContractedHoursImpact | null {
  const raw = row.impactSummary as
    | (ContractedHoursImpact & { applied?: never })
    | { requested?: ContractedHoursImpact | null; applied?: ContractedHoursImpact | null }
    | null
  if (!raw || typeof raw !== 'object') return null
  if ('applied' in raw || 'requested' in raw) {
    return (raw as { applied?: ContractedHoursImpact | null }).applied ??
      (raw as { requested?: ContractedHoursImpact | null }).requested ??
      null
  }
  return raw as ContractedHoursImpact
}

/** Plain-words note on where a request stands against the weekly hours now. */
function WithinLimitNote({ row }: { row: HoursApproval }) {
  if (row.status === 'APPROVED' && row.decisionNotes?.startsWith('Approved automatically')) {
    return (
      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
        {row.decisionNotes}. No manager action was needed.
      </p>
    )
  }
  if (row.status !== 'PENDING') return null
  const week = row.weekNow
  if (week && (row.requestType === 'ROTA_VISIT_OVER_HOURS' || row.requestType === 'VISIT_PLAN_OVER_HOURS')) {
    if (week.shortHours > 0) {
      return (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          Still {formatHours(week.shortHours)} over the carer&apos;s weekly limit of {formatHours(week.limitHours)}.
        </p>
      )
    }
    if (week.blockedReason) {
      return (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          The carer is back within their weekly hours, but this can&apos;t be approved automatically:{' '}
          {week.blockedReason}. Approve or reject it yourself.
        </p>
      )
    }
    return (
      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
        The carer is back within their weekly hours — this will be approved automatically.
      </p>
    )
  }
  if (row.requestType === 'EXTRA_VISIT_OVER_HOURS') {
    const week = extraVisitWeek(row)
    if (week?.limitMinutes != null && week.weekMinutes <= week.limitMinutes) {
      return (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          Now within the service user&apos;s weekly hours — approving won&apos;t go over the limit. The visit is
          only created when you approve.
        </p>
      )
    }
  }
  return null
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

  // On opening: carer requests back within the weekly hours are approved automatically.
  const checkWithinLimit = useCheckHoursRequestsWithinLimit()
  const [autoApproved, setAutoApproved] = React.useState<Array<{ approvalId: string; label: string }>>([])
  const runCheck = checkWithinLimit.mutateAsync
  const checkedRef = React.useRef(false)
  React.useEffect(() => {
    // Once per visit to the page (React runs effects twice in development).
    if (checkedRef.current) return
    checkedRef.current = true
    runCheck()
      .then(res => {
        if (res.approved.length) setAutoApproved(res.approved)
      })
      .catch(() => {
        // Not shown: the list still loads, and the nightly run checks again.
      })
  }, [runCheck])
  const approveMut = useApproveHours()
  const rejectMut = useRejectHours()
  const deleteAllMut = useDeleteAllHoursApprovals()
  const [deleteAllOpen, setDeleteAllOpen] = React.useState(false)

  const [rejectTarget, setRejectTarget] = React.useState<HoursApproval | null>(null)
  const canAddExtraHours = useAuthStore(s => s.can(EXTRA_HOURS_PERMISSION))
  // Kept on the page (not the row) so the result stays open when the request leaves the list.
  const [extraHoursTarget, setExtraHoursTarget] = React.useState<HoursApproval | null>(null)
  const [rejectReason, setRejectReason] = React.useState('')
  /** An extra visit over the weekly hours needs a reason to reject (the requester sees it). */
  const rejectReasonRequired =
    rejectTarget != null &&
    (isExtraVisitRequest(rejectTarget) || isDraftPlanRequest(rejectTarget)) &&
    rejectTarget.rejectReasonRequired !== false
  const [approveContractedTarget, setApproveContractedTarget] = React.useState<HoursApproval | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const overCapCount = tab === 'PENDING' ? rows.filter(exceedsWeeklyCap).length : 0
  const showActions = canManage && tab === 'PENDING'

  const handleApprove = async (id: string, draftPlan = false) => {
    try {
      const message = await approveMut.mutateAsync({ id })
      toastSuccess(draftPlan ? 'Draft visit plan approved — it can now be activated' : message || 'Extra hours approved')
    } catch (e) {
      toastApiError(e, 'Could not approve')
    }
  }

  const handleApproveContracted = async () => {
    if (!approveContractedTarget) return
    try {
      const message = await approveMut.mutateAsync({ id: approveContractedTarget.id })
      toastSuccess(
        isExtraVisitRequest(approveContractedTarget)
          ? 'Extra visit approved and added to the rota'
          : isServiceUserHoursChange(approveContractedTarget)
            ? 'Weekly hours changed'
            : 'Contracted hours changed',
        // e.g. "3 visits over the new hours cancelled", or why they could not be.
        isServiceUserHoursChange(approveContractedTarget) && message?.includes('. ')
          ? message.slice(message.indexOf('. ') + 2)
          : undefined,
      )
      setApproveContractedTarget(null)
    } catch (e) {
      toastApiError(e, 'Could not approve')
    }
  }

  const handleDeleteAll = async () => {
    try {
      const count = await deleteAllMut.mutateAsync(tab)
      toastSuccess(`${count} request${count === 1 ? '' : 's'} deleted`)
      setDeleteAllOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not delete')
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    if (rejectReasonRequired && !rejectReason.trim()) return
    try {
      await rejectMut.mutateAsync({ id: rejectTarget.id, notes: rejectReason.trim() || undefined })
      toastSuccess(
        isExtraVisitRequest(rejectTarget)
          ? 'Rejected — the extra visit was not added'
          : isDraftPlanRequest(rejectTarget)
          ? "Rejected — the draft stays as it is and can't be activated"
          : isServiceUserHoursChange(rejectTarget)
          ? 'Rejected — weekly hours unchanged'
          : isContractedChange(rejectTarget)
            ? 'Rejected — contracted hours unchanged'
            : isRotaVisitRequest(rejectTarget) && rejectTarget.changes?.some((c) => c.kind === 'EXTRA_EDIT')
              ? 'Rejected — the extra visit keeps its current time and carers'
              : isRotaVisitRequest(rejectTarget)
              ? 'Rejected — the visit stays without this carer'
              : rejectTarget.rejectAction === 'REMOVE_EXTRA_VISITS'
                ? 'Rejected — the carer stays off the visits over their hours'
                : 'Rejected — carer removed from the plan',
      )
      setRejectTarget(null)
      setRejectReason('')
    } catch (e) {
      toastApiError(e, 'Could not reject')
    }
  }

  return (
    <div className="flex w-full flex-col gap-4" data-testid="hours-approvals-page">
      <PageHeader
        title="Hours approvals"
        description="Review carers assigned beyond their contracted weekly hours, changes to a carer's contracted hours or a service user's weekly hours, and extra visits over a service user's weekly hours. Nothing applies until it is approved."
        icon={<Clock className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Employee' },
          { label: 'Hours approvals' },
        ]}
      />

      {autoApproved.length ? (
        <div
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
          data-testid="hours-auto-approved"
        >
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {autoApproved.length} request{autoApproved.length === 1 ? ' was' : 's were'} approved automatically
            </p>
            <p className="text-xs">
              The carer is back within their weekly hours (a visit was cancelled or they were taken off one), so they
              are now on the visit. You can see {autoApproved.length === 1 ? 'it' : 'them'} on the Approved tab.
            </p>
            <ul className="list-disc space-y-0.5 pl-5 text-xs">
              {autoApproved.map(a => (
                <li key={a.approvalId}>{a.label}</li>
              ))}
            </ul>
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAutoApproved([])}>
            Dismiss
          </Button>
        </div>
      ) : null}

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

        <div className="flex items-center gap-3">
          {tab === 'PENDING' && overCapCount > 0 ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {overCapCount} request{overCapCount === 1 ? '' : 's'} over the weekly cap
            </p>
          ) : null}
          {canManage && rows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              disabled={deleteAllMut.isPending}
              onClick={() => setDeleteAllOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete All
            </Button>
          ) : null}
        </div>
      </div>

      {tab === 'PENDING' ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Carer over their contracted weekly hours: the carer is not on those visits until approved. If the
              week would exceed the highest hours a manager can approve (Settings → Dom Rules, default{' '}
              <span className="font-semibold tabular-nums">{MAX_APPROVABLE_WEEKLY_HOURS}h</span>), Approve is
              disabled. Other requests (hours changes, extra visits) apply only when approved; Reject leaves
              everything as it is.
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
                ? "A request appears here when a carer is assigned beyond their contracted hours, a carer's contracted hours or a service user's weekly hours are changed, or an extra visit or a draft visit plan would go over a service user's weekly hours."
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
                    const suHours = isServiceUserHoursChange(r)
                    const extraVisit = isExtraVisitRequest(r) ? (r.requestPayload ?? null) : null
                    const draftWeek = draftPlanWeek(r)
                    const draftLimitMinutes =
                      draftWeek?.limitWeeklyHours != null ? Math.round(draftWeek.limitWeeklyHours * 60) : null
                    // Carer or service user hours change: shows previous → new instead of projected.
                    const contracted = isContractedChange(r) || suHours
                    const impact = isContractedChange(r) ? contractedImpact(r) : null
                    const change =
                      contracted && r.previousContractedWeeklyHours != null && r.requestedContractedWeeklyHours != null
                        ? r.requestedContractedWeeklyHours - r.previousContractedWeeklyHours
                        : null
                    return (
                      <React.Fragment key={r.id}>
                      <tr
                        className={`border-b border-border/70 last:border-0 hover:bg-muted/30 ${
                          overCap ? 'bg-destructive/[0.03]' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          {r.employeeId ? (
                            <Link
                              to="/employee/$employeeId/edit"
                              params={{ employeeId: r.employeeId }}
                              search={{ tab: 'employment' }}
                              className="font-medium text-primary underline-offset-2 hover:underline"
                            >
                              {r.employeeName}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {contracted ? (
                            <div className="mt-1">
                              <Badge variant="outline" size="sm">
                                {suHours ? 'Service user weekly hours' : 'Contracted hours change'}
                              </Badge>
                            </div>
                          ) : isExtraVisitRequest(r) ? (
                            <div className="mt-1 space-y-0.5">
                              <Badge variant="outline" size="sm">
                                Extra visit over weekly hours
                              </Badge>
                              {extraVisit ? (
                                <p className="text-xs text-foreground">
                                  {formatDate(extraVisit.date)} · {extraVisit.startTime}–{extraVisit.endTime} ·{' '}
                                  {extraVisit.slotLabel}
                                </p>
                              ) : null}
                              {r.reason ? (
                                <p className="text-xs text-muted-foreground">Reason: {r.reason}</p>
                              ) : null}
                              {r.status === 'REJECTED' && r.decisionNotes ? (
                                <p className="text-xs text-red-700 dark:text-red-300">
                                  Rejected: {r.decisionNotes}
                                </p>
                              ) : null}
                            </div>
                          ) : isRotaVisitRequest(r) ? (
                            <div className="mt-1 space-y-0.5">
                              <Badge variant="outline" size="sm">
                                {ROTA_SOURCE_LABEL[rotaVisitPayload(r)?.source ?? 'ROTA']} over carer&apos;s weekly hours
                              </Badge>
                              {rotaVisitPayload(r) ? (
                                <p className="text-xs text-foreground">
                                  {formatInstant(rotaVisitPayload(r)!.start)}–{formatTime(rotaVisitPayload(r)!.end)}
                                </p>
                              ) : null}
                              {r.changes?.some((c) => c.kind === 'EXTRA_EDIT') ? (
                                <HoursRequestChanges changes={r.changes} />
                              ) : r.status === 'PENDING' ? (
                                <p className="text-xs text-muted-foreground">Carer not on the visit until approved</p>
                              ) : null}
                              {r.status === 'REJECTED' && r.decisionNotes ? (
                                <p className="text-xs text-red-700 dark:text-red-300">Rejected: {r.decisionNotes}</p>
                              ) : null}
                            </div>
                          ) : heldVisitCount(r) > 0 || r.changes?.length ? (
                            <div className="mt-1">
                              {heldVisitCount(r) > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  {heldVisitCount(r)} visit{heldVisitCount(r) === 1 ? '' : 's'} held back until approved
                                </p>
                              ) : null}
                              <HoursRequestChanges changes={r.changes ?? []} />
                            </div>
                          ) : isDraftPlanRequest(r) ? (
                            <div className="mt-1 space-y-0.5">
                              <Badge variant="outline" size="sm">
                                Draft visit plan over weekly hours
                              </Badge>
                              {draftWeek ? (
                                <p className="text-xs text-foreground">
                                  Busiest week {formatDate(draftWeek.heaviestWeekStart)}
                                  {draftWeek.overWeeks.length > 1
                                    ? ` · ${draftWeek.overWeeks.length} weeks over`
                                    : ''}
                                </p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">
                                Can&apos;t be activated until approved
                              </p>
                              {r.status === 'REJECTED' && r.decisionNotes ? (
                                <p className="text-xs text-red-700 dark:text-red-300">
                                  Rejected: {r.decisionNotes}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          <WithinLimitNote row={r} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.serviceUserId ? (
                            <Link
                              to="/service-users/$serviceUserId/visit-plan"
                              params={{ serviceUserId: r.serviceUserId }}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {r.serviceUserName}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {contracted
                            ? formatHours(r.previousContractedWeeklyHours)
                            : extraVisit || draftWeek
                              ? formatHours(r.contractedWeeklyHours)
                              : `${r.contractedWeeklyHours ?? '—'}h`}
                          {r.weekNow && r.weekNow.extraHours > 0 ? (
                            <span className="block text-xs text-emerald-700 dark:text-emerald-400">
                              +{formatHours(r.weekNow.extraHours)} extra that week
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {contracted ? (
                            <span className="font-medium text-foreground">
                              New {formatHours(r.requestedContractedWeeklyHours)}
                            </span>
                          ) : (
                            <span className={overCap ? 'font-semibold text-destructive' : 'font-medium text-foreground'}>
                              {extraVisit
                                ? `${formatMinutes(extraVisitWeek(r)?.weekMinutes ?? extraVisit.weekMinutes)} that week`
                                : isRotaVisitRequest(r)
                                  ? `${r.projectedWeeklyHours ?? '—'}h that week`
                                  : draftWeek
                                  ? `${formatMinutes(draftWeek.heaviestMinutes)} busiest week`
                                  : `~${r.projectedWeeklyHours ?? '—'}h`}
                            </span>
                          )}
                          {overCap ? (
                            <Badge variant="destructive" size="sm" className="ml-2 align-middle">
                              Over {approvableCap(r)}h
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-700 dark:text-amber-300">
                          {contracted
                            ? change == null
                              ? '—'
                              : `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatHours(Math.abs(change))}`
                            : extraVisit && extraVisitWeek(r)?.limitMinutes != null
                              ? extraVisitWeek(r)!.weekMinutes > extraVisitWeek(r)!.limitMinutes!
                                ? `+${formatMinutes(extraVisitWeek(r)!.weekMinutes - extraVisitWeek(r)!.limitMinutes!)}`
                                : 'Within limit'
                              : draftWeek && draftLimitMinutes != null
                                ? `+${formatMinutes(Math.max(0, draftWeek.heaviestMinutes - draftLimitMinutes))}`
                                : r.weekNow
                                  ? r.weekNow.shortHours > 0
                                    ? `+${formatHours(r.weekNow.shortHours)}`
                                    : 'Within limit'
                                  : r.extraHours != null && r.extraHours <= 0
                                  ? 'Within limit'
                                  : `+${r.extraHours ?? '—'}h`}
                          {contracted && impact ? (
                            <button
                              type="button"
                              className="ml-2 text-xs font-normal text-primary underline-offset-2 hover:underline"
                              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                            >
                              {expandedId === r.id ? 'Hide' : 'Details'}
                            </button>
                          ) : null}
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
                              {canAddExtraHours && isCarerHoursRequest(r) && r.employeeId ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => setExtraHoursTarget(r)}
                                >
                                  <PlusCircle className="h-3.5 w-3.5" aria-hidden />
                                  Add extra hours
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                className="gap-1.5"
                                disabled={approveMut.isPending || rejectMut.isPending || overCap}
                                title={
                                  overCap
                                    ? `Cannot approve — exceeds the ${approvableCap(r)}h weekly maximum. Reduce assigned hours first.`
                                    : undefined
                                }
                                onClick={() =>
                                  contracted || isExtraVisitRequest(r)
                                    ? setApproveContractedTarget(r)
                                    : void handleApprove(r.id, isDraftPlanRequest(r))
                                }
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
                                onClick={() => {
                                  setRejectReason('')
                                  setRejectTarget(r)
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5" aria-hidden />
                                Reject
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                      {contracted && impact && expandedId === r.id ? (
                        <tr className="border-b border-border/70 bg-muted/20">
                          <td colSpan={showActions ? 8 : 7} className="px-4 py-3">
                            {r.reason ? (
                              <p className="mb-2 text-sm text-foreground">
                                <span className="text-muted-foreground">Reason:</span> {r.reason}
                              </p>
                            ) : null}
                            <ContractedHoursImpactSummary impact={impact} pending={r.status === 'PENDING'} />
                          </td>
                        </tr>
                      ) : null}
                      </React.Fragment>
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

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all {STATUS_LABEL[tab].toLowerCase()} requests?</AlertDialogTitle>
            <AlertDialogDescription>
              All {rows.length} {STATUS_LABEL[tab].toLowerCase()} request{rows.length === 1 ? '' : 's'} will be
              deleted permanently. This cannot be undone.
              {tab === 'PENDING'
                ? ' Visits held back for a carer over their hours are no longer held; the next plan save asks again if the carer is still over.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAllMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAllMut.isPending}
              onClick={e => {
                e.preventDefault()
                void handleDeleteAll()
              }}
            >
              {deleteAllMut.isPending ? 'Deleting…' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectTarget != null} onOpenChange={o => !o && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {rejectTarget && isExtraVisitRequest(rejectTarget)
                ? 'Reject extra visit?'
                : rejectTarget && isDraftPlanRequest(rejectTarget)
                ? 'Reject draft visit plan?'
                : rejectTarget && isRotaVisitRequest(rejectTarget)
                ? 'Reject visit over weekly hours?'
                : rejectTarget && rejectTarget.requestType === 'VISIT_PLAN_OVER_HOURS'
                ? 'Reject carer over weekly hours?'
                : rejectTarget && isServiceUserHoursChange(rejectTarget)
                ? 'Reject weekly hours change?'
                : rejectTarget && isContractedChange(rejectTarget)
                  ? 'Reject contracted hours change?'
                  : 'Reject extra hours?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget && isExtraVisitRequest(rejectTarget) ? (
                <>
                  The extra visit for{' '}
                  <span className="font-medium text-foreground">{rejectTarget.serviceUserName}</span>
                  {rejectTarget.requestPayload
                    ? ` on ${formatDate(rejectTarget.requestPayload.date)}, ${rejectTarget.requestPayload.startTime}–${rejectTarget.requestPayload.endTime},`
                    : ''}{' '}
                  will not be added. The person who asked will see your reason.
                </>
              ) : rejectTarget && isDraftPlanRequest(rejectTarget) ? (
                <>
                  <span className="font-medium text-foreground">{rejectTarget.serviceUserName}</span>&apos;s draft
                  visit plan stays as it is and can&apos;t be activated until its visits or the weekly hours are
                  changed and saved again. The person who asked will see your reason.
                </>
              ) : rejectTarget && isServiceUserHoursChange(rejectTarget) ? (
                <>
                  <span className="font-medium text-foreground">{rejectTarget.serviceUserName}</span>&apos;s weekly
                  contracted hours stay at {formatHours(rejectTarget.previousContractedWeeklyHours)}. Nothing else
                  changes.
                </>
              ) : rejectTarget && isContractedChange(rejectTarget) ? (
                <>
                  <span className="font-medium text-foreground">{rejectTarget.employeeName}</span>&apos;s contracted
                  hours stay at {formatHours(rejectTarget.previousContractedWeeklyHours)}. No visits are changed.
                </>
              ) : rejectTarget && isRotaVisitRequest(rejectTarget) && rejectTarget.changes?.some((c) => c.kind === 'EXTRA_EDIT') ? (
                <>
                  The extra visit change is not made: the visit keeps its current time and carers (for every
                  carer this change waited on).
                </>
              ) : rejectTarget && isRotaVisitRequest(rejectTarget) ? (
                <>
                  <span className="font-medium text-foreground">{rejectTarget.employeeName}</span> is not put on
                  the visit; it stays without them so another carer can be chosen.
                </>
              ) : rejectTarget && rejectTarget.rejectAction === 'REMOVE_EXTRA_VISITS' ? (
                <>
                  <span className="font-medium text-foreground">{rejectTarget.employeeName}</span> stays off the
                  visits over their weekly hours on{' '}
                  <span className="font-medium text-foreground">{rejectTarget.serviceUserName}</span>&apos;s plan
                  — the visits held back and, latest first, any they already have until each week fits (a
                  weekday taken off every week is taken off them in the plan). Their other visits stay.
                </>
              ) : rejectTarget ? (
                <>
                  Rejecting will remove <span className="font-medium text-foreground">{rejectTarget.employeeName}</span>{' '}
                  from <span className="font-medium text-foreground">{rejectTarget.serviceUserName}</span>&apos;s visit
                  plan. This cannot be undone from this screen.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {rejectTarget?.changes?.length ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">What this request waits on</p>
              <HoursRequestChanges changes={rejectTarget.changes} />
              {rejectTarget.changes.some((c) => c.kind === 'TIME_CHANGE') ? (
                <p className="mt-1 text-xs text-muted-foreground">Rejecting keeps the current visit time.</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="hours-reject-reason">
              Reason{rejectReasonRequired ? ' *' : ' (optional)'}
            </Label>
            <Textarea
              id="hours-reject-reason"
              rows={2}
              maxLength={1000}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={
                rejectTarget && isDraftPlanRequest(rejectTarget)
                  ? 'Why the draft visit plan is not approved'
                  : rejectReasonRequired
                    ? 'Why the extra visit is not approved'
                    : 'Why this request is rejected'
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rejectMut.isPending || (rejectReasonRequired && !rejectReason.trim())}
              onClick={e => {
                e.preventDefault()
                void handleReject()
              }}
            >
              {rejectMut.isPending
                ? 'Rejecting…'
                : rejectTarget &&
                    (rejectTarget.requestType !== 'VISIT_PLAN_OVER_HOURS' ||
                      rejectTarget.rejectAction === 'REMOVE_EXTRA_VISITS')
                  ? 'Reject'
                  : 'Reject & remove carer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={approveContractedTarget != null}
        onOpenChange={o => !o && setApproveContractedTarget(null)}
      >
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {approveContractedTarget && isExtraVisitRequest(approveContractedTarget)
                ? 'Approve extra visit over weekly hours?'
                : approveContractedTarget && isServiceUserHoursChange(approveContractedTarget)
                  ? 'Approve weekly hours change?'
                  : 'Approve contracted hours change?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {approveContractedTarget && isExtraVisitRequest(approveContractedTarget) ? (
                <>
                  The extra visit for{' '}
                  <span className="font-medium text-foreground">{approveContractedTarget.serviceUserName}</span>
                  {approveContractedTarget.requestPayload ? (
                    <>
                      {' '}
                      on{' '}
                      <span className="font-medium text-foreground">
                        {formatDate(approveContractedTarget.requestPayload.date)},{' '}
                        {approveContractedTarget.requestPayload.startTime}–
                        {approveContractedTarget.requestPayload.endTime}
                      </span>{' '}
                      ({approveContractedTarget.requestPayload.slotLabel})
                    </>
                  ) : null}{' '}
                  is created now and added to the rota.
                  {(() => {
                    const week = extraVisitWeek(approveContractedTarget)
                    const asked = approveContractedTarget.requestPayload?.weekMinutes
                    if (!week || week.limitMinutes == null) return ''
                    const now =
                      week.weekMinutes > week.limitMinutes
                        ? ` That week will have ${formatMinutes(week.weekMinutes)} of ${formatMinutes(week.limitMinutes)} weekly contracted hours.`
                        : ` That week will have ${formatMinutes(week.weekMinutes)} of ${formatMinutes(week.limitMinutes)} — within the weekly contracted hours now.`
                    return asked != null && asked !== week.weekMinutes
                      ? `${now} (It was ${formatMinutes(asked)} when this was asked for.)`
                      : now
                  })()}
                </>
              ) : approveContractedTarget && isServiceUserHoursChange(approveContractedTarget) ? (
                <>
                  <span className="font-medium text-foreground">{approveContractedTarget.serviceUserName}</span>&apos;s
                  weekly contracted hours change from{' '}
                  {formatHours(approveContractedTarget.previousContractedWeeklyHours)} to{' '}
                  <span className="font-medium text-foreground">
                    {formatHours(approveContractedTarget.requestedContractedWeeklyHours)}
                  </span>{' '}
                  now, in DOM Care and on the visit plan.
                  {(approveContractedTarget.requestedContractedWeeklyHours ?? 0) >=
                  (approveContractedTarget.previousContractedWeeklyHours ?? 0)
                    ? ' Visits on the rota are not changed.'
                    : ''}
                </>
              ) : approveContractedTarget ? (
                <>
                  <span className="font-medium text-foreground">{approveContractedTarget.employeeName}</span>&apos;s
                  contracted hours will change now.
                  {contractedImpact(approveContractedTarget)?.isDecrease
                    ? ' The visits below are worked out again at this moment and unassigned; they will show as unassigned on the rota board.'
                    : ' No visits change.'}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {approveContractedTarget &&
          isServiceUserHoursChange(approveContractedTarget) &&
          approveContractedTarget.serviceUserId &&
          approveContractedTarget.requestedContractedWeeklyHours != null &&
          approveContractedTarget.previousContractedWeeklyHours != null &&
          approveContractedTarget.requestedContractedWeeklyHours < approveContractedTarget.previousContractedWeeklyHours ? (
            <ServiceUserHoursDecreaseImpact
              serviceUserId={approveContractedTarget.serviceUserId}
              weeklyHours={approveContractedTarget.requestedContractedWeeklyHours}
            />
          ) : null}
          {approveContractedTarget && contractedImpact(approveContractedTarget) ? (
            <div className="max-h-[50vh] overflow-y-auto">
              <ContractedHoursImpactSummary impact={contractedImpact(approveContractedTarget)!} pending />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approveMut.isPending}
              onClick={e => {
                e.preventDefault()
                void handleApproveContracted()
              }}
            >
              {approveMut.isPending ? 'Approving…' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {extraHoursTarget?.employeeId ? (
        <AddExtraHoursDialog
          open
          onClose={() => setExtraHoursTarget(null)}
          employeeId={extraHoursTarget.employeeId}
          employeeName={extraHoursTarget.employeeName}
          contractedHours={extraHoursTarget.contractedWeeklyHours}
          defaultDate={extraHoursTarget.weekNow?.weekStart ?? null}
        />
      ) : null}
    </div>
  )
}
