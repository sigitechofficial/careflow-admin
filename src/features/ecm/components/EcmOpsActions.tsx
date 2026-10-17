import * as React from 'react'
import { Loader2, AlertTriangle, CheckCircle2, HelpCircle, Scale, XCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  useCreateEcmNotification,
  useEcmNotifications,
  useEcmReasonCodes,
  useMissedTriage,
  useRecordManualAttendance,
} from '@/features/ecm/hooks/useEcm'
import { toastApiError, toastSuccess, toastWithVariant } from '@/shared/lib/toast'
import { attendancePayNotice } from '@/features/billing/utils/pay-time-outcome.util'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { useAuthStore } from '@/features/auth/store'
import {
  combineOperationalDateAndHm,
  dayKeyInTimeZone,
  formatOpsDateTimeNumeric,
  formatOpsHm,
} from '@/shared/lib/operational-day.util'

function formatWhen(iso: string): string {
  return formatOpsDateTimeNumeric(iso)
}

/** Wall-clock datetime-local value in the organisation operational timezone. */
function toDatetimeLocalValue(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date()
    const day = dayKeyInTimeZone(fallback)
    const hm = formatOpsHm(fallback.toISOString()) || `${pad(fallback.getHours())}:${pad(fallback.getMinutes())}`
    return `${day}T${hm}`
  }
  const day = dayKeyInTimeZone(d)
  const hm = formatOpsHm(d.toISOString())
  if (!hm) {
    return `${day}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }
  return `${day}T${hm}`
}

function fromDatetimeLocalValue(value: string): string {
  const trimmed = value.trim()
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(trimmed)
  if (!match) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
  }
  return combineOperationalDateAndHm(match[1]!, match[2]!) || new Date().toISOString()
}

export function EcmManualAttendanceDialog({
  open,
  onOpenChange,
  jobId,
  carers,
  plannedStart,
  plannedEnd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  carers: Array<{ employeeId: string; name: string }>
  /** Prefer planned visit start for check-in defaults (not "now"). */
  plannedStart?: string | null
  plannedEnd?: string | null
}) {
  const record = useRecordManualAttendance()
  const reasons = useEcmReasonCodes()
  const amendCodes = (reasons.data ?? []).filter(
    c => c.category === 'AMEND' || c.category === 'OTHER',
  )
  const [employeeId, setEmployeeId] = React.useState(carers[0]?.employeeId ?? '')
  const [eventType, setEventType] = React.useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN')
  const [occurredAt, setOccurredAt] = React.useState(() =>
    toDatetimeLocalValue(plannedStart),
  )
  const [reasonCode, setReasonCode] = React.useState('')
  const [note, setNote] = React.useState('')
  const [overrideGeofence, setOverrideGeofence] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (carers[0]?.employeeId) setEmployeeId(carers[0].employeeId)
    setEventType('CHECK_IN')
    setReasonCode('')
    setNote('')
    setOverrideGeofence(false)
  }, [open, carers])

  React.useEffect(() => {
    if (!open) return
    setOccurredAt(
      toDatetimeLocalValue(eventType === 'CHECK_OUT' ? plannedEnd || plannedStart : plannedStart),
    )
  }, [eventType, open, plannedStart, plannedEnd])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual attendance</DialogTitle>
          <DialogDescription>
            Office entry is append-only. Confidence becomes manually verified.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Carer</span>
            <Select value={employeeId || undefined} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select carer" />
              </SelectTrigger>
              <SelectContent>
                {carers.map(c => (
                  <SelectItem key={c.employeeId} value={c.employeeId}>
                    {c.name || c.employeeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Event</span>
            <Select
              value={eventType}
              onValueChange={v => setEventType(v as 'CHECK_IN' | 'CHECK_OUT')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECK_IN">Check-in</SelectItem>
                <SelectItem value="CHECK_OUT">Check-out</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Occurred at (org timezone)</span>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Reason code</span>
            <Select value={reasonCode || undefined} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {amendCodes.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Textarea
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            placeholder="Supporting note"
            className="min-h-[70px]"
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={overrideGeofence}
              onChange={e => setOverrideGeofence(e.target.checked)}
            />
            Geofence override (office authorised)
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={record.isPending || !employeeId || !reasonCode}
            onClick={() => {
              const iso = fromDatetimeLocalValue(occurredAt)
              record.mutate(
                {
                  jobId,
                  employeeId,
                  eventType,
                  occurredAt: iso,
                  reasonCode,
                  note: note || undefined,
                  overrideGeofence,
                },
                {
                  onSuccess: result => {
                    const notice = attendancePayNotice(result)
                    toastWithVariant(notice.variant, notice.title, notice.description)
                    onOpenChange(false)
                  },
                  onError: e => toastApiError(e, 'Could not record attendance'),
                },
              )
            }}
          >
            {record.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EcmNotificationEvidenceForm({ jobId }: { jobId: string }) {
  const canManage = useAuthStore(s => s.can('ecm.exceptions.manage' as never))
  const list = useEcmNotifications(jobId)
  const create = useCreateEcmNotification()
  const [method, setMethod] = React.useState('PHONE')
  const [outcome, setOutcome] = React.useState('ATTEMPTED')
  const [contactName, setContactName] = React.useState('')
  const [etaGiven, setEtaGiven] = React.useState('')
  const [reasonGiven, setReasonGiven] = React.useState('')
  const [notes, setNotes] = React.useState('')

  return (
    <section className="space-y-2" data-testid="ecm-notification-evidence">
      <ul className="space-y-1.5">
        {(list.data ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">No contact attempts recorded yet.</li>
        ) : null}
        {(list.data ?? []).map(row => (
          <li key={row.id} className="rounded-md border border-border px-3 py-2 text-xs">
            <div className="flex flex-wrap gap-1">
              <EcmStatusBadge code={row.method} kind="generic" />
              <EcmStatusBadge code={row.outcome} kind="generic" />
              <span className="text-muted-foreground">{formatWhen(row.attemptedAt)}</span>
            </div>
            <p className="mt-1 text-sm">
              {row.contactName || 'Contact'}
              {row.etaGiven ? ` · ETA ${row.etaGiven}` : ''}
            </p>
          </li>
        ))}
      </ul>
      {canManage ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['PHONE', 'SMS', 'EMAIL', 'IN_APP', 'IN_PERSON', 'OTHER'].map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  'ATTEMPTED',
                  'ANSWERED',
                  'DELIVERED',
                  'NO_ANSWER',
                  'ACCEPTED',
                  'DECLINED',
                  'FAILED',
                ].map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="Contact name / role"
            className="h-9"
          />
          <Input
            value={etaGiven}
            onChange={e => setEtaGiven(e.target.value)}
            placeholder="ETA given to SU/family"
            className="h-9"
          />
          <Input
            value={reasonGiven}
            onChange={e => setReasonGiven(e.target.value)}
            placeholder="Reason given"
            className="h-9"
          />
          <Textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Notes / proof reference"
            className="min-h-[60px]"
          />
          <Button
            type="button"
            size="sm"
            disabled={create.isPending}
            onClick={() => {
              create.mutate(
                {
                  jobId,
                  method,
                  outcome,
                  contactName: contactName || undefined,
                  etaGiven: etaGiven || undefined,
                  reasonGiven: reasonGiven || undefined,
                  notes: notes || undefined,
                },
                {
                  onSuccess: () => {
                    toastSuccess('Contact evidence recorded')
                    setNotes('')
                  },
                  onError: e => toastApiError(e, 'Could not save evidence'),
                },
              )
            }}
          >
            {create.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Record contact
          </Button>
        </div>
      ) : null}
    </section>
  )
}

export function EcmMissedTriageActions({
  jobId,
  missedClassification,
}: {
  jobId: string
  missedClassification: string
}) {
  const canManage = useAuthStore(s => s.can('ecm.exceptions.manage' as never))
  const triage = useMissedTriage()
  if (!canManage) return null
  if (
    missedClassification !== 'POTENTIAL_MISSED' &&
    missedClassification !== 'ATTENDANCE_VERIFICATION_PENDING'
  ) {
    return null
  }

  const actions = [
    {
      outcome: 'CONFIRMED_MISSED',
      label: 'Confirm missed',
      helper: 'The visit did not happen and should be recorded as missed.',
      Icon: XCircle,
    },
    {
      outcome: 'FALSE_ECM_ALERT',
      label: 'False ECM alert',
      helper: 'Monitoring raised a false alarm (visit delivery may already be recorded elsewhere).',
      Icon: CheckCircle2,
    },
    {
      outcome: 'DISPUTED',
      label: 'Mark disputed',
      helper: 'Outcome is contested and needs further investigation.',
      Icon: Scale,
    },
    {
      outcome: 'ATTENDANCE_VERIFICATION_PENDING',
      label: 'Still verifying',
      helper: 'Keep open while you confirm attendance with the carer or family.',
      Icon: HelpCircle,
    },
  ] as const

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-card p-3.5 shadow-sm"
      data-testid="ecm-missed-triage"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" aria-hidden />
        <div>
          <h4 className="text-sm font-semibold text-foreground">What happened?</h4>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose the outcome that matches this visit. This updates the ECM triage.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map(a => (
          <button
            key={a.outcome}
            type="button"
            disabled={triage.isPending}
            onClick={() => {
              triage.mutate(
                { jobId, outcome: a.outcome },
                {
                  onSuccess: () => toastSuccess(`Triage: ${a.label}`),
                  onError: e => toastApiError(e, 'Triage failed'),
                },
              )
            }}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-teal-300 hover:bg-teal-50/40 disabled:opacity-50 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <a.Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {a.label}
            </span>
            <span className="mt-1 block text-xs leading-snug text-muted-foreground">
              {a.helper}
            </span>
          </button>
        ))}
      </div>
      {triage.isPending ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving triage…
        </p>
      ) : null}
    </section>
  )
}
