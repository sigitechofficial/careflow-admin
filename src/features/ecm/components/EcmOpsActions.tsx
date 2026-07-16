import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
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
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { useAuthStore } from '@/features/auth/store'

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function EcmManualAttendanceDialog({
  open,
  onOpenChange,
  jobId,
  carers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  carers: Array<{ employeeId: string; name: string }>
}) {
  const record = useRecordManualAttendance()
  const reasons = useEcmReasonCodes()
  const amendCodes = (reasons.data ?? []).filter(
    c => c.category === 'AMEND' || c.category === 'OTHER',
  )
  const [employeeId, setEmployeeId] = React.useState(carers[0]?.employeeId ?? '')
  const [eventType, setEventType] = React.useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN')
  const [occurredAt, setOccurredAt] = React.useState(() => new Date().toISOString().slice(0, 16))
  const [reasonCode, setReasonCode] = React.useState('')
  const [note, setNote] = React.useState('')
  const [overrideGeofence, setOverrideGeofence] = React.useState(false)

  React.useEffect(() => {
    if (open && carers[0]?.employeeId) setEmployeeId(carers[0].employeeId)
  }, [open, carers])

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
            <span className="text-muted-foreground">Occurred at</span>
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
            onChange={e => setNote(e.target.value)}
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
              const iso = new Date(occurredAt).toISOString()
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
                  onSuccess: () => {
                    toastSuccess('Manual attendance recorded')
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
      <p className="text-xs font-medium text-muted-foreground">
        Notification evidence ({list.data?.length ?? 0})
      </p>
      <ul className="space-y-1.5">
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
            onChange={e => setNotes(e.target.value)}
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
    { outcome: 'CONFIRMED_MISSED', label: 'Confirm missed' },
    { outcome: 'FALSE_ECM_ALERT', label: 'False ECM alert' },
    { outcome: 'DISPUTED', label: 'Mark disputed' },
    { outcome: 'ATTENDANCE_VERIFICATION_PENDING', label: 'Verify pending' },
  ] as const

  return (
    <div className="flex flex-wrap gap-2" data-testid="ecm-missed-triage">
      {actions.map(a => (
        <Button
          key={a.outcome}
          type="button"
          size="sm"
          variant="outline"
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
        >
          {a.label}
        </Button>
      ))}
    </div>
  )
}
