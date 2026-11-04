import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/form-field'
import { toastApiError, toastInfo, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useSentHoursRequestsStore } from '@/store/sent-hours-requests.store'
import { approveSentHours, fetchSentPendingHours, type HoursApproval } from '@/features/hours-approvals/api'
import { HoursRequestChanges } from '@/features/hours-approvals/components/HoursRequestChanges'

const h = (n: number | null | undefined) => (n == null ? '—' : `${n}h`)

/** One line per request: who it is for and what goes over. */
function requestLine(r: HoursApproval): { title: string; detail: string } {
  const carer = r.employeeName ?? 'Carer'
  const su = r.serviceUserName ?? 'Service user'
  switch (r.requestType) {
    case 'CONTRACTED_HOURS_CHANGE':
      return {
        title: `${carer} — contracted hours change`,
        detail: `${h(r.previousContractedWeeklyHours)} → ${h(r.requestedContractedWeeklyHours)} a week`,
      }
    case 'SERVICE_USER_WEEKLY_HOURS_CHANGE':
      return {
        title: `${su} — weekly hours change`,
        detail: `${h(r.previousContractedWeeklyHours)} → ${h(r.requestedContractedWeeklyHours)} a week`,
      }
    case 'EXTRA_WEEKLY_HOURS':
      return { title: `${carer} — extra weekly hours`, detail: `+${h(r.extraHours)} on top of ${h(r.contractedWeeklyHours)}` }
    case 'ROTA_VISIT_OVER_HOURS':
    case 'VISIT_PLAN_OVER_HOURS':
      return {
        title: `${carer} — over their weekly hours${r.serviceUserName ? ` (${r.serviceUserName})` : ''}`,
        detail: `${h(r.projectedWeeklyHours)} a week, contracted ${h(r.contractedWeeklyHours)}`,
      }
    default:
      return {
        title: `${su} — over their weekly hours`,
        detail: `${h(r.projectedWeeklyHours)} a week, limit ${h(r.contractedWeeklyHours)}`,
      }
  }
}

/**
 * After a manager (or Super Admin) sends something over a carer's or service user's weekly hours
 * for approval: approve it now, or leave it on Hours approvals.
 */
export function SentHoursRequestsDialog() {
  const ids = useSentHoursRequestsStore(s => s.ids)
  const dismiss = useSentHoursRequestsStore(s => s.dismiss)
  const qc = useQueryClient()
  const [rows, setRows] = useState<HoursApproval[]>([])
  // The ids these rows were looked up for: closing dismisses only them, so a request sent while
  // approving (e.g. the carer on an extra visit once it is made) is offered next.
  const [shownFor, setShownFor] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ids.length) {
      setRows([])
      return
    }
    let cancelled = false
    fetchSentPendingHours(ids)
      .then(list => {
        if (cancelled) return
        if (!list.length) dismiss(ids)
        setShownFor(ids)
        setRows(list)
      })
      .catch(() => {
        if (!cancelled) dismiss(ids)
      })
    return () => {
      cancelled = true
    }
  }, [ids, dismiss])

  const close = () => {
    setReason('')
    dismiss(shownFor)
  }

  const sendForApproval = () => {
    toastSuccess(rows.length === 1 ? 'Sent to Hours approvals' : `${rows.length} requests sent to Hours approvals`)
    close()
  }

  const approveNow = async () => {
    setBusy(true)
    try {
      const { message, results } = await approveSentHours(
        rows.map(r => r.id),
        reason.trim() || undefined,
      )
      const failed = results.filter(r => !r.approved)
      if (!results.length) {
        toastInfo(message ?? 'Already decided on Hours approvals')
      } else if (failed.length) {
        toastWarning(message ?? 'Some requests could not be approved', failed.map(f => f.message).filter(Boolean).join(' · '))
      } else {
        toastSuccess(message ?? 'Approved')
      }
      // Rota, visit plans, hours and Hours approvals all change once approved.
      void qc.invalidateQueries()
      close()
    } catch (e) {
      toastApiError(e, 'Could not approve')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={rows.length > 0} onOpenChange={o => !o && !busy && close()}>
      <AlertDialogContent className="max-w-lg" data-testid="sent-hours-requests-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Over the weekly hours — approve now?</AlertDialogTitle>
          <AlertDialogDescription>
            {rows.length === 1 ? 'This needs' : 'These need'} manager approval (Settings → Dom Rules). You can approve
            now, or send {rows.length === 1 ? 'it' : 'them'} to Hours approvals.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {rows.map(r => {
            const line = requestLine(r)
            return (
              <div key={r.id} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{line.title}</p>
                <p className="text-xs text-muted-foreground">{line.detail}</p>
                {r.changes?.length ? <HoursRequestChanges changes={r.changes} /> : null}
              </div>
            )
          })}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sent-hours-reason">Reason (optional)</Label>
          <Textarea
            id="sent-hours-reason"
            rows={2}
            maxLength={1000}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why it is approved over the weekly hours"
          />
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={sendForApproval}>
            Send for approval
          </Button>
          <Button type="button" disabled={busy} onClick={() => void approveNow()}>
            {busy ? 'Approving…' : 'Approve now'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
