import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, CheckCircle2, Loader2, UserCog } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import {
  createSupervisionSession,
  personName,
  setEmployeeSupervisor,
  SUPERVISION_FORMAT_LABELS,
  updateSupervisionAction,
  type SupervisionFormat,
} from '@/features/supervision/api'
import {
  supervisionKeys,
  useEmployeeSupervisionSummary,
  useEmployeeSupervisor,
  useOpenSupervisionActions,
  useSupervisionForms,
  useSupervisionSessions,
  useSupervisors,
} from '@/features/supervision/hooks'
import { SupervisionStatusBadge } from '@/features/supervision/components/SupervisionStatusBadge'
import { IncidentStaffMultiSelect, type PickedStaff } from '@/features/incidents/components/IncidentStaffMultiSelect'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDate } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { DictationTextControl } from '@/shared/ui/dictation'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const NO_SUPERVISOR = '__none__'

/**
 * How many of each repeating review this carer had in the last 12 months against what the schedule
 * expects (e.g. supervision every 90 days = at least 4), so nobody has to count numbered forms.
 */
function HeldVsExpected({ employeeId }: { employeeId: string }) {
  const summary = useEmployeeSupervisionSummary(employeeId)
  const types = summary.data?.types ?? []
  if (summary.isLoading || !types.length) return null
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="held-vs-expected">
      {types.map(t => {
        const short = t.heldLast12Months < t.expectedLast12Months
        const newStarter = t.expectedLast12Months < t.expectedPerYear
        const tone =
          t.status === 'OVERDUE'
            ? 'border-destructive/40 bg-destructive/5'
            : short || t.status === 'DUE_SOON'
              ? 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20'
              : 'border-border bg-muted/20'
        return (
          <div key={t.reviewTypeId} className={`rounded-lg border px-3 py-2 text-sm ${tone}`}>
            <p className="font-medium">{t.name}</p>
            <p>
              <span className="text-lg font-semibold tabular-nums">{t.heldLast12Months}</span>
              <span className="text-muted-foreground">
                {' '}
                held in the last 12 months ·{' '}
                {newStarter
                  ? `${t.expectedLast12Months} expected so far (started ${summary.data?.startDate ? formatDate(summary.data.startDate) : 'recently'})`
                  : `at least ${t.expectedPerYear} expected`}{' '}
                (every {t.intervalDays} days)
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Last {t.lastDone ? formatDate(t.lastDone) : 'never'} · next due{' '}
              <span className={t.status === 'OVERDUE' ? 'font-medium text-destructive' : ''}>
                {t.nextDue ? formatDate(t.nextDue) : '—'}
              </span>
              {t.status === 'OVERDUE' ? ' (overdue)' : t.status === 'DUE_SOON' ? ' (due soon)' : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/** The carer's named supervisor: gets their supervision reminders and runs their sessions by default. */
function NamedSupervisor({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const qc = useQueryClient()
  const current = useEmployeeSupervisor(employeeId)
  const supervisors = useSupervisors(canManage)
  const save = useMutation({
    mutationFn: (userId: string | null) => setEmployeeSupervisor(employeeId, userId),
    onSuccess: supervisor => {
      qc.setQueryData(supervisionKeys.employeeSupervisor(employeeId), supervisor)
      toastSuccess(supervisor ? `Supervisor: ${personName(supervisor)}` : 'Supervisor removed')
    },
    onError: e => toastApiError(e, 'Could not set the supervisor'),
  })
  const value = current.data?.id ?? NO_SUPERVISOR
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm" data-testid="named-supervisor">
      <UserCog className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Named supervisor</span>
      {canManage ? (
        <Select
          value={value}
          onValueChange={v => save.mutate(v === NO_SUPERVISOR ? null : v)}
          disabled={save.isPending || current.isLoading}
        >
          <SelectTrigger className="h-8 w-64" aria-label="Named supervisor">
            <SelectValue placeholder="Loading…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SUPERVISOR}>None (branch managers get reminders)</SelectItem>
            {(supervisors.data ?? []).map(u => (
              <SelectItem key={u.id} value={u.id}>
                {personName(u)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="font-medium">{current.data ? personName(current.data) : 'None'}</span>
      )}
      {!current.isLoading && !current.data ? (
        <span className="text-xs text-amber-700 dark:text-amber-300">No one named: reminders go to branch managers.</span>
      ) : null}
    </div>
  )
}

function localDateTimeValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Staff record → Staff Reviews: this carer's supervision sessions and open actions. */
export function SupervisionCarerCard({ employeeId, employeeLabel }: { employeeId: string; employeeLabel: string }) {
  const canRead = useAuthStore(s => s.can('supervision.read'))
  const canManage = useAuthStore(s => s.can('supervision.manage'))
  const sessionsQuery = useSupervisionSessions({ employeeId }, canRead)
  const actionsQuery = useOpenSupervisionActions(employeeId, canRead)
  const qc = useQueryClient()
  const [scheduleOpen, setScheduleOpen] = React.useState(false)

  if (!canRead) return null
  const sessions = sessionsQuery.data ?? []
  const openActions = actionsQuery.data ?? []

  const markDone = async (actionId: string) => {
    try {
      await updateSupervisionAction(actionId, { status: 'DONE' })
      void qc.invalidateQueries({ queryKey: supervisionKeys.all() })
      toastSuccess('Action done')
    } catch (e) {
      toastApiError(e, 'Could not update the action')
    }
  }

  return (
    <div className="space-y-4" data-testid="supervision-carer-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Supervision sessions</h2>
          <p className="text-sm text-muted-foreground">
            Practice-based supervision at least every 3 months (NICE QS123). Completing a session moves the review
            above on.
          </p>
        </div>
        {canManage ? (
          <Button type="button" size="sm" onClick={() => setScheduleOpen(true)} data-testid="schedule-supervision">
            <CalendarPlus className="mr-1 h-4 w-4" />
            Schedule supervision
          </Button>
        ) : null}
      </div>

      <NamedSupervisor employeeId={employeeId} canManage={canManage} />
      <HeldVsExpected employeeId={employeeId} />

      {openActions.length ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="mb-2 text-sm font-medium">Open actions ({openActions.length})</p>
          <ul className="space-y-2">
            {openActions.map(a => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <span>
                  {a.description}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {a.session.reviewType.name} · {formatDate(a.session.heldAt ?? a.session.scheduledAt)}
                    {a.dueDate ? ` · due ${formatDate(a.dueDate)}` : ''}
                  </span>
                </span>
                {canManage ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void markDone(a.id)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Done
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Date', 'Type', 'Format', 'Supervisor', 'Status', 'Open actions'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessionsQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  No supervision sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <Link
                      to="/supervision/sessions/$sessionId"
                      params={{ sessionId: s.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {formatDate(s.heldAt ?? s.scheduledAt)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{s.reviewType.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {SUPERVISION_FORMAT_LABELS[s.format]}
                    {s.attendees.length > 1 ? ` (${s.attendees.length})` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{personName(s.supervisor)}</td>
                  <td className="px-3 py-2.5">
                    <SupervisionStatusBadge status={s.status} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{s.openActions || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <ScheduleSupervisionDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          employeeId={employeeId}
          employeeLabel={employeeLabel}
        />
      ) : null}
    </div>
  )
}

function ScheduleSupervisionDialog({
  open,
  onOpenChange,
  employeeId,
  employeeLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  employeeLabel: string
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const me = useAuthStore(s => s.user?.id)
  const formsQuery = useSupervisionForms(open)
  const supervisors = useSupervisors(open)
  const named = useEmployeeSupervisor(employeeId, open)
  // Only types whose Care Pathway form is published can be scheduled.
  const types = (formsQuery.data?.reviewTypes ?? []).filter(t => t.form?.status === 'PUBLISHED')
  const missingForms = (formsQuery.data?.reviewTypes ?? []).length - types.length
  const [reviewTypeId, setReviewTypeId] = React.useState('')
  const [supervisorUserId, setSupervisorUserId] = React.useState('')
  const [format, setFormat] = React.useState<SupervisionFormat>('ONE_TO_ONE')
  const [when, setWhen] = React.useState(localDateTimeValue())
  const [location, setLocation] = React.useState('')
  const [others, setOthers] = React.useState<PickedStaff[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setWhen(localDateTimeValue())
    setOthers([])
    setFormat('ONE_TO_ONE')
    setLocation('')
    setSupervisorUserId('')
  }, [open])

  React.useEffect(() => {
    if (!reviewTypeId && types.length) {
      setReviewTypeId(types.find(t => t.code === 'SUPERVISION')?.id ?? types[0]?.id ?? '')
    }
  }, [reviewTypeId, types])

  // Default supervisor: the carer's named supervisor, else whoever is scheduling.
  React.useEffect(() => {
    if (!open || supervisorUserId || named.isLoading) return
    const fallback = named.data?.id ?? me ?? ''
    if (fallback) setSupervisorUserId(fallback)
  }, [open, supervisorUserId, named.isLoading, named.data, me])
  const selectedType = types.find(t => t.id === reviewTypeId)

  const onCreate = async () => {
    if (!reviewTypeId || !when) return
    setSaving(true)
    try {
      const employeeIds = [employeeId, ...others.map(o => o.id).filter(id => id !== employeeId)]
      const session = await createSupervisionSession({
        reviewTypeId,
        employeeIds,
        format: employeeIds.length > 1 ? 'GROUP' : format,
        scheduledAt: new Date(when).toISOString(),
        ...(supervisorUserId ? { supervisorUserId } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
      })
      void qc.invalidateQueries({ queryKey: supervisionKeys.all() })
      toastSuccess('Supervision scheduled')
      onOpenChange(false)
      void navigate({ to: '/supervision/sessions/$sessionId', params: { sessionId: session.id } })
    } catch (e) {
      toastApiError(e, 'Could not schedule supervision')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule supervision</DialogTitle>
          <DialogDescription>
            With {employeeLabel}. The session is recorded on the type&apos;s Care Pathway form.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Type</span>
            <Select value={reviewTypeId} onValueChange={setReviewTypeId}>
              <SelectTrigger aria-label="Supervision type">
                <SelectValue placeholder={formsQuery.isLoading ? 'Loading…' : 'Choose a type'} />
              </SelectTrigger>
              <SelectContent>
                {types.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType?.form ? (
              <span className="block text-xs text-muted-foreground">Form: {selectedType.form.name}</span>
            ) : null}
            {missingForms > 0 ? (
              <span className="block text-xs text-amber-700 dark:text-amber-300">
                {missingForms} type{missingForms === 1 ? ' has' : 's have'} no published form; set one in Settings → Supervision.
              </span>
            ) : null}
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Supervisor</span>
            <Select value={supervisorUserId} onValueChange={setSupervisorUserId}>
              <SelectTrigger aria-label="Supervisor">
                <SelectValue placeholder={supervisors.isLoading ? 'Loading…' : 'Choose a supervisor'} />
              </SelectTrigger>
              <SelectContent>
                {(supervisors.data ?? []).map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {personName(u)}
                    {u.id === named.data?.id ? ' (named supervisor)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Format</span>
            <Select value={others.length ? 'GROUP' : format} onValueChange={v => setFormat(v as SupervisionFormat)} disabled={others.length > 0}>
              <SelectTrigger aria-label="Format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SUPERVISION_FORMAT_LABELS) as SupervisionFormat[])
                  .filter(f => f !== 'GROUP' || others.length > 0)
                  .map(f => (
                    <SelectItem key={f} value={f}>
                      {SUPERVISION_FORMAT_LABELS[f]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Date and time</span>
            <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} aria-label="Date and time" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Location (optional)</span>
            <DictationTextControl>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Croydon office" className="pr-9" />
            </DictationTextControl>
          </label>
          <div className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Other carers (group supervision, optional)</span>
            <IncidentStaffMultiSelect
              selected={others}
              onChange={setOthers}
              placeholder="Add carers for a group session…"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onCreate()} disabled={saving || !reviewTypeId || !when}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
