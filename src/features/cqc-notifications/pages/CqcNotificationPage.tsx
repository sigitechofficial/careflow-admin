import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Hash,
  Link2,
  Lock,
  RotateCcw,
  Send,
  Users,
  XCircle,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { feedbackSelectClass, feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { EmployeePicker, ServiceUserPicker } from '@/features/complaints/components/FeedbackPickers'
import { FieldWithInfo, InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import type {
  CqcDetailField,
  CqcDetailValue,
  CqcFieldOption,
  CqcNotificationDetail,
  CqcNotificationFieldsInput,
  CqcNotificationTypeSpec,
} from '../types'
import {
  useCqcBranchOptions,
  useCqcNotification,
  useCqcNotificationTypes,
  useMarkCqcNotificationReady,
  useReopenCqcNotification,
  useUpdateCqcNotification,
} from '../hooks'
import { METHOD_LABEL, STATUS_LABEL, formatDateTime, fromLocalInput, statusVariant, toLocalInput } from '../labels'
import { AcknowledgeDialog, CloseDialog, SubmitDialog } from '../components/StatusDialogs'
import { HELP } from '../help'
import { Section } from '../components/SectionCard'
import { SupportingPoliciesSection } from '../components/SupportingPoliciesSection'

type FormState = {
  locationId: string
  serviceUser: { id: string; name: string } | null
  eventOccurredAt: string
  becameAwareAt: string
  summary: string
  actionsTaken: string
  othersInformed: string[]
  details: Record<string, CqcDetailValue>
}

function initialForm(n: CqcNotificationDetail): FormState {
  return {
    locationId: n.location.id,
    serviceUser: n.serviceUser ? { id: n.serviceUser.id, name: n.serviceUser.name ?? 'Service user' } : null,
    eventOccurredAt: toLocalInput(n.eventOccurredAt),
    becameAwareAt: toLocalInput(n.becameAwareAt),
    summary: n.summary ?? '',
    actionsTaken: n.actionsTaken ?? '',
    othersInformed: n.othersInformed,
    details: n.details ?? {},
  }
}

function toPayload(f: FormState): CqcNotificationFieldsInput {
  return {
    locationId: f.locationId,
    serviceUserId: f.serviceUser?.id ?? null,
    eventOccurredAt: fromLocalInput(f.eventOccurredAt),
    becameAwareAt: fromLocalInput(f.becameAwareAt) ?? undefined,
    summary: f.summary,
    actionsTaken: f.actionsTaken,
    othersInformed: f.othersInformed,
    details: f.details,
  }
}

/** A staff member from the list, or a typed name and role for someone outside the service. Saved as text. */
function StaffOrNameInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (v: string | null) => void
}) {
  const [outside, setOutside] = React.useState(false)
  return (
    <div className="space-y-1.5">
      {outside ? (
        <Input
          id={id}
          value={value}
          placeholder='Name and role, e.g. "Dr Patel, GP"'
          onChange={e => onChange(e.target.value)}
          data-testid={`${id}-text`}
        />
      ) : (
        <EmployeePicker
          value={value ? { id: `typed:${value}`, name: value } : null}
          onChange={v => onChange(v?.name ?? null)}
          placeholder="Search carers and staff…"
          testId={`${id}-staff`}
        />
      )}
      <button
        type="button"
        className="text-xs text-primary hover:underline"
        onClick={() => setOutside(o => !o)}
      >
        {outside ? 'Choose from staff instead' : 'Someone outside the service (e.g. GP, A&E doctor)'}
      </button>
    </div>
  )
}

function DetailInput({
  field,
  value,
  onChange,
}: {
  field: CqcDetailField
  value: CqcDetailValue | undefined
  onChange: (v: CqcDetailValue) => void
}) {
  const id = `cqcn-detail-${field.key}`
  const label = `${field.label}${field.required ? '' : ' (optional)'}`
  const control =
    field.kind === 'select' ? (
      <select
        id={id}
        className={feedbackSelectClass}
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">Choose…</option>
        {(field.options ?? []).map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : field.kind === 'boolean' ? (
      <select
        id={id}
        className={`${feedbackSelectClass} max-w-[10rem]`}
        value={value === true ? 'yes' : value === false ? 'no' : ''}
        onChange={e => onChange(e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
      >
        <option value="">Not said</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    ) : field.kind === 'datetime' ? (
      <Input
        id={id}
        type="datetime-local"
        value={toLocalInput(typeof value === 'string' ? value : null)}
        onChange={e => onChange(fromLocalInput(e.target.value))}
      />
    ) : field.kind === 'staff' ? (
      <StaffOrNameInput id={id} value={typeof value === 'string' ? value : ''} onChange={onChange} />
    ) : field.kind === 'longText' ? (
      <textarea
        id={id}
        className={feedbackTextareaClass}
        rows={3}
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
      />
    ) : (
      <Input id={id} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} />
    )
  if (field.help) {
    return (
      <FieldWithInfo id={id} label={label} help={field.help}>
        {control}
      </FieldWithInfo>
    )
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {control}
    </div>
  )
}

function NotificationForm({
  notification,
  spec,
  othersOptions,
  onDirtyChange,
}: {
  notification: CqcNotificationDetail
  spec: CqcNotificationTypeSpec
  othersOptions: CqcFieldOption[]
  onDirtyChange: (dirty: boolean) => void
}) {
  const branches = useCqcBranchOptions()
  const update = useUpdateCqcNotification(notification.id)
  const [form, setForm] = React.useState(() => initialForm(notification))
  const initial = React.useMemo(() => JSON.stringify(toPayload(initialForm(notification))), [notification])
  const dirty = JSON.stringify(toPayload(form)) !== initial
  React.useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(f => ({ ...f, [key]: value }))
  const toggleOther = (key: string) =>
    set('othersInformed', form.othersInformed.includes(key) ? form.othersInformed.filter(k => k !== key) : [...form.othersInformed, key])

  const onSave = async () => {
    try {
      await update.mutateAsync(toPayload(form))
      toastSuccess('Notification saved')
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }

  return (
    <div className="space-y-4" data-testid="cqcn-form">
      <Section
        icon={<CalendarClock className="h-4 w-4" />}
        title="About the event"
        description="Where and when it happened, and who it is about."
      >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cqcn-form-branch" className="text-xs font-medium text-muted-foreground">
            Branch
          </label>
          <select
            id="cqcn-form-branch"
            className={feedbackSelectClass}
            value={form.locationId}
            onChange={e => set('locationId', e.target.value)}
          >
            {branches.some(b => b.id === form.locationId) ? null : (
              <option value={form.locationId}>{notification.location.name ?? 'Current branch'}</option>
            )}
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <FieldWithInfo id="cqcn-form-su" label="Person using the service" help={HELP.serviceUser}>
          <ServiceUserPicker value={form.serviceUser} onChange={v => set('serviceUser', v)} testId="cqcn-form-su" />
        </FieldWithInfo>
        <FieldWithInfo id="cqcn-form-event" label="When it happened" help={HELP.eventOccurred}>
          <Input
            id="cqcn-form-event"
            type="datetime-local"
            value={form.eventOccurredAt}
            onChange={e => set('eventOccurredAt', e.target.value)}
            data-testid="cqcn-form-event"
          />
        </FieldWithInfo>
        <FieldWithInfo id="cqcn-form-aware" label="When the service became aware" help={HELP.becameAware}>
          <Input
            id="cqcn-form-aware"
            type="datetime-local"
            value={form.becameAwareAt}
            onChange={e => set('becameAwareAt', e.target.value)}
          />
        </FieldWithInfo>
      </div>
      </Section>

      <Section
        icon={<FileText className="h-4 w-4" />}
        title="What happened and what was done"
        description="Plain words. Refer to staff and others by role, not by name."
      >
      <div className="space-y-4">
      <FieldWithInfo id="cqcn-form-summary" label="What happened" help={HELP.summary}>
        <textarea
          id="cqcn-form-summary"
          className={feedbackTextareaClass}
          rows={4}
          value={form.summary}
          onChange={e => set('summary', e.target.value)}
          data-testid="cqcn-form-summary"
        />
      </FieldWithInfo>
      <FieldWithInfo id="cqcn-form-actions" label="Action taken" help={HELP.actionsTaken}>
        <textarea
          id="cqcn-form-actions"
          className={feedbackTextareaClass}
          rows={3}
          value={form.actionsTaken}
          onChange={e => set('actionsTaken', e.target.value)}
          data-testid="cqcn-form-actions"
        />
      </FieldWithInfo>
      </div>
      </Section>

      <Section
        icon={<ClipboardList className="h-4 w-4" />}
        title={`${spec.label}: details`}
        description={spec.whenToNotify}
        aside={<Badge size="sm" variant="outline">{spec.regulation}</Badge>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {spec.fields.map(f => (
            <div key={f.key} className={f.kind === 'longText' ? 'sm:col-span-2' : ''}>
              <DetailInput
                field={f}
                value={form.details[f.key]}
                onChange={v => set('details', { ...form.details, [f.key]: v })}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon={<Users className="h-4 w-4" />}
        title="Who else has been told"
        aside={<InfoTip label="who else has been told">{HELP.othersInformed}</InfoTip>}
      >
        <div className="flex flex-wrap gap-2">
          {othersOptions.map(o => {
            const on = form.othersInformed.includes(o.value)
            return (
              <label
                key={o.value}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  on ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted/40',
                )}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border"
                  checked={on}
                  onChange={() => toggleOther(o.value)}
                />
                {o.label}
              </label>
            )
          })}
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
        {dirty ? <span className="mr-auto text-xs font-medium text-warning">Unsaved changes</span> : null}
        <Button variant="outline" disabled={!dirty || update.isPending} onClick={() => setForm(initialForm(notification))}>
          Undo changes
        </Button>
        <Button disabled={!dirty || update.isPending} onClick={() => void onSave()} data-testid="cqcn-form-save">
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

/** A label above its value, for grids of short facts. */
function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

/** Draft → Ready → Submitted → Acknowledged, with when each step happened. */
function ProgressSteps({ n }: { n: CqcNotificationDetail }) {
  const order = ['DRAFT', 'READY', 'SUBMITTED', 'ACKNOWLEDGED'] as const
  const at = { DRAFT: n.createdAt, READY: n.readyAt, SUBMITTED: n.submittedAt, ACKNOWLEDGED: n.acknowledgedAt }
  const current = order.indexOf(n.status as (typeof order)[number])
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Progress" data-testid="cqcn-progress">
      {order.map((step, i) => {
        // Submitted and acknowledged are finished when reached; draft and ready are still being worked on.
        const done = i < current || (i === current && (step === 'SUBMITTED' || step === 'ACKNOWLEDGED'))
        const active = i === current && !done
        return (
          <li key={step} className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                done
                  ? 'border-success bg-success text-white'
                  : active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={cn('block text-sm font-medium', done || active ? 'text-foreground' : 'text-muted-foreground')}>
                {STATUS_LABEL[step]}
              </span>
              <span className="block text-xs text-muted-foreground">
                {at[step] && (done || active) ? formatDateTime(at[step]) : active ? 'In progress' : 'Not yet'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** One headline figure in the summary strip. */
function KeyFact({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  note?: React.ReactNode
  tone?: 'warning' | 'destructive' | 'success'
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-sm font-semibold',
          tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-foreground',
        )}
      >
        {value}
      </div>
      {note ? <div className="mt-0.5 text-xs text-muted-foreground">{note}</div> : null}
    </div>
  )
}

/** Read-only view: what was sent (frozen at submission) or the current answers. */
function NotificationView({
  notification: n,
  spec,
  othersOptions,
}: {
  notification: CqcNotificationDetail
  spec: CqcNotificationTypeSpec | undefined
  othersOptions: CqcFieldOption[]
}) {
  const s = n.submittedSnapshot
  const details: Array<{ label: string; value: string }> = s
    ? s.details
    : (spec?.fields ?? [])
        .filter(f => n.details[f.key] !== undefined && n.details[f.key] !== null && n.details[f.key] !== '')
        .map(f => {
          const v = n.details[f.key]
          return {
            label: f.label,
            value:
              f.kind === 'boolean'
                ? v
                  ? 'Yes'
                  : 'No'
                : f.kind === 'select'
                  ? (f.options?.find(o => o.value === v)?.label ?? String(v))
                  : f.kind === 'datetime'
                    ? formatDateTime(String(v))
                    : String(v),
          }
        })
  const others = s
    ? s.othersInformed
    : n.othersInformed.map(k => othersOptions.find(o => o.value === k)?.label ?? k)
  return (
    <div className="space-y-4" data-testid="cqcn-view">
      {s ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <p>
            <span className="font-medium text-foreground">This is what was sent to the CQC on {formatDateTime(s.submittedAt)}.</span>{' '}
            <span className="text-muted-foreground">It is kept as it was and can no longer be changed.</span>
          </p>
        </div>
      ) : null}

      <Section icon={<CalendarClock className="h-4 w-4" />} title="About the event">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Branch">{(s?.location ?? n.location).name}</Fact>
          <Fact label="Person using the service">
            {n.serviceUser ? (
              <>
                {n.serviceUser.name}
                {n.serviceUser.identifier ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">({n.serviceUser.identifier})</span>
                ) : null}
              </>
            ) : null}
          </Fact>
          <Fact label="When it happened">{formatDateTime(s?.eventOccurredAt ?? n.eventOccurredAt)}</Fact>
          <Fact label="When the service became aware">{formatDateTime(s?.becameAwareAt ?? n.becameAwareAt)}</Fact>
        </dl>
      </Section>

      <Section icon={<FileText className="h-4 w-4" />} title="What happened and what was done">
        <dl className="grid gap-y-4">
          <Fact label="What happened">{s ? s.summary : n.summary}</Fact>
          <Fact label="Action taken">{s ? s.actionsTaken : n.actionsTaken}</Fact>
        </dl>
      </Section>

      <Section
        icon={<ClipboardList className="h-4 w-4" />}
        title={`${n.typeLabel}: details`}
        aside={<Badge size="sm" variant="outline">{n.regulation}</Badge>}
      >
        {details.length ? (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {details.map(d => (
              <Fact key={d.label} label={d.label} wide={d.value.length > 60}>
                {d.value}
              </Fact>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No details recorded.</p>
        )}
      </Section>

      <Section icon={<Users className="h-4 w-4" />} title="Who else has been told">
        {others.length ? (
          <div className="flex flex-wrap gap-2">
            {others.map(o => (
              <Badge key={o} variant="outline">
                {o}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nobody recorded.</p>
        )}
      </Section>
    </div>
  )
}

/** Reference, people and dates for the record, beside the main content. */
function RecordPanel({ n }: { n: CqcNotificationDetail }) {
  const by = (who: { name: string | null } | null, when: string | null) =>
    when ? `${formatDateTime(when)}${who?.name ? ` · ${who.name}` : ''}` : null
  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Record</h2>
        <dl className="space-y-3">
          <Fact label="Reference">
            <span className="font-mono text-[13px]">{n.referenceNumber}</span>
          </Fact>
          <Fact label="Regulation">{n.regulation}</Fact>
          <Fact label="Started">{by(n.createdBy, n.createdAt)}</Fact>
          {n.readyAt ? <Fact label="Marked ready">{by(n.readyBy, n.readyAt)}</Fact> : null}
          {n.submittedAt ? <Fact label="Submission recorded">{by(n.submittedBy, n.submittedAt)}</Fact> : null}
          {n.submissionMethod ? <Fact label="Sent by">{METHOD_LABEL[n.submissionMethod]}</Fact> : null}
          {n.acknowledgedAt ? <Fact label="Acknowledged">{formatDateTime(n.acknowledgedAt)}</Fact> : null}
          {n.closedAt ? <Fact label={n.status === 'CANCELLED' ? 'Cancelled' : 'Marked not required'}>{by(n.closedBy, n.closedAt)}</Fact> : null}
        </dl>
      </section>
      {n.incident || n.safeguardingCase ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Linked records
          </h2>
          <ul className="space-y-2 text-sm">
            {n.incident ? (
              <li>
                <Link to="/incidents/$incidentId" params={{ incidentId: n.incident.id }} className="font-medium text-primary hover:underline">
                  Incident {n.incident.referenceNumber}
                </Link>
              </li>
            ) : null}
            {n.safeguardingCase ? (
              <li>
                <Link
                  to="/safeguarding/$caseId"
                  params={{ caseId: n.safeguardingCase.id }}
                  className="font-medium text-primary hover:underline"
                >
                  Safeguarding {n.safeguardingCase.referenceNumber}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </aside>
  )
}

function Workspace({ notification: n }: { notification: CqcNotificationDetail }) {
  const canManage = useAuthStore(s => s.can('cqc_notifications.manage'))
  const types = useCqcNotificationTypes()
  const spec = types.data?.types.find(t => t.type === n.type)
  const othersOptions = types.data?.othersInformed ?? []
  const ready = useMarkCqcNotificationReady(n.id)
  const reopen = useReopenCqcNotification(n.id)
  const [dirty, setDirty] = React.useState(false)
  const [dialog, setDialog] = React.useState<'submit' | 'ack' | 'NOT_REQUIRED' | 'CANCELLED' | null>(null)
  const isOpen = n.status === 'DRAFT' || n.status === 'READY'
  const closed = n.status === 'NOT_REQUIRED' || n.status === 'CANCELLED'
  const editable = canManage && isOpen

  const run = async (what: 'ready' | 'reopen') => {
    try {
      if (what === 'ready') {
        await ready.mutateAsync()
        toastSuccess('Ready to submit', 'Send it on the CQC provider portal, then record the submission here.')
      } else {
        await reopen.mutateAsync()
        toastSuccess('Moved back to draft')
      }
    } catch (e) {
      toastApiError(e, 'Could not do that')
    }
  }

  const guard = (fn: () => void) => () => {
    if (dirty) {
      toastWarning('Unsaved changes', 'Save or undo your changes first.')
      return
    }
    fn()
  }

  const actions = canManage
    ? [
        ...(n.status === 'DRAFT'
          ? [{ label: 'Mark ready', onClick: guard(() => void run('ready')), icon: <CheckCircle2 className="h-4 w-4" /> }]
          : []),
        ...(n.status === 'READY'
          ? [
              { label: 'Back to draft', onClick: guard(() => void run('reopen')), icon: <RotateCcw className="h-4 w-4" />, variant: 'outline' as const },
              { label: 'Record submission', onClick: guard(() => setDialog('submit')), icon: <Send className="h-4 w-4" /> },
            ]
          : []),
        ...(n.status === 'NOT_REQUIRED'
          ? [{ label: 'Back to draft', onClick: () => void run('reopen'), icon: <RotateCcw className="h-4 w-4" />, variant: 'outline' as const }]
          : []),
        ...(n.status === 'SUBMITTED'
          ? [{ label: 'Record acknowledgement', onClick: () => setDialog('ack'), icon: <CheckCircle2 className="h-4 w-4" /> }]
          : []),
        ...(isOpen
          ? [
              { label: 'Not required', onClick: guard(() => setDialog('NOT_REQUIRED')), icon: <XCircle className="h-4 w-4" />, variant: 'outline' as const },
              { label: 'Cancel', onClick: guard(() => setDialog('CANCELLED')), icon: <XCircle className="h-4 w-4" />, variant: 'outline' as const },
            ]
          : []),
      ]
    : []

  return (
    <div className="flex flex-col gap-4" data-testid="cqcn-page">
      <PageHeader
        title={n.typeLabel}
        description={`${n.referenceNumber} · ${n.location.name ?? 'Branch'} · ${n.regulation}`}
        icon={<Send className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={HELP.listPage}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Governance' },
          { label: 'CQC notifications', href: '/governance/cqc-notifications' },
          { label: n.referenceNumber },
        ]}
        actions={actions}
      />

      <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm" aria-label="Status">
        <div className="flex items-center gap-1.5">
          <Badge variant={statusVariant(n.status)} data-testid="cqcn-status">
            {STATUS_LABEL[n.status]}
          </Badge>
          <InfoTip label="status">{HELP.status}</InfoTip>
        </div>

        {closed ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm" data-testid="cqcn-closed">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p>
              <span className="font-medium text-foreground">
                {n.status === 'CANCELLED' ? 'Cancelled' : 'No notification needed'}:
              </span>{' '}
              {n.closedReason}
            </p>
          </div>
        ) : (
          <ProgressSteps n={n} />
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KeyFact
            icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
            label="24-hour target"
            value={
              n.submittedAt
                ? n.submittedLate
                  ? 'Sent after the target'
                  : 'Sent on time'
                : isOpen
                  ? n.overdue
                    ? 'Overdue'
                    : formatDateTime(n.dueAt)
                  : '—'
            }
            note={
              n.submittedAt
                ? `Due ${formatDateTime(n.dueAt)}`
                : isOpen
                  ? n.overdue
                    ? `Was due ${formatDateTime(n.dueAt)}`
                    : 'Send by this time'
                  : undefined
            }
            tone={n.submittedAt ? (n.submittedLate ? 'warning' : 'success') : n.overdue ? 'destructive' : undefined}
          />
          <KeyFact
            icon={<Send className="h-3.5 w-3.5" aria-hidden />}
            label="Sent to the CQC"
            value={n.submittedAt ? formatDateTime(n.submittedAt) : 'Not yet'}
            note={n.submissionMethod ? METHOD_LABEL[n.submissionMethod] : undefined}
          />
          <KeyFact
            icon={<Hash className="h-3.5 w-3.5" aria-hidden />}
            label="CQC reference"
            value={n.cqcReference ?? 'Not yet'}
            note={n.acknowledgedAt ? `Acknowledged ${formatDateTime(n.acknowledgedAt)}` : undefined}
          />
          <KeyFact
            icon={<Building2 className="h-3.5 w-3.5" aria-hidden />}
            label="Branch"
            value={n.location.name ?? '—'}
            note={n.serviceUser?.name ?? undefined}
          />
        </div>

        {isOpen && n.missing.length ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm" data-testid="cqcn-missing">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-medium text-foreground">Still needed before it is ready: </span>
              {n.missing.join(', ')}
            </p>
          </div>
        ) : null}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          {editable && spec ? (
            <NotificationForm
              key={n.updatedAt}
              notification={n}
              spec={spec}
              othersOptions={othersOptions}
              onDirtyChange={setDirty}
            />
          ) : (
            <NotificationView notification={n} spec={spec} othersOptions={othersOptions} />
          )}
          {closed ? null : <SupportingPoliciesSection notification={n} />}
        </div>
        <RecordPanel n={n} />
      </div>

      <SubmitDialog notification={n} open={dialog === 'submit'} onOpenChange={o => !o && setDialog(null)} />
      <AcknowledgeDialog notification={n} open={dialog === 'ack'} onOpenChange={o => !o && setDialog(null)} />
      <CloseDialog
        notification={n}
        as={dialog === 'CANCELLED' ? 'CANCELLED' : 'NOT_REQUIRED'}
        open={dialog === 'NOT_REQUIRED' || dialog === 'CANCELLED'}
        onOpenChange={o => !o && setDialog(null)}
      />
    </div>
  )
}

/** Governance → CQC notifications → one notification. */
export default function CqcNotificationPage() {
  const { notificationId } = useParams({ strict: false }) as { notificationId: string }
  const query = useCqcNotification(notificationId)
  if (query.isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (query.error || !query.data) {
    return (
      <p className="p-6 text-sm text-destructive">
        {query.error instanceof ApiError ? query.error.message : 'Could not load the notification.'}
      </p>
    )
  }
  return <Workspace notification={query.data} />
}
