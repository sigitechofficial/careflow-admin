import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ExternalLink, Loader2, Pencil } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useGeneralSettings, useUpdateGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { GeneralSettingsCard, SettingsNoYesToggle, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import {
  describeSchedule,
  REVIEW_AUDIENCE_LABELS,
  setReviewSchedule,
  setSupervisionForm,
  type ReviewAudience,
  type ReviewSchedule,
  type ReviewScheduleKind,
  type SupervisionFormsOverview,
  type SupervisionSettings,
} from '@/features/supervision/api'
import { supervisionKeys, useSupervisionForms } from '@/features/supervision/hooks'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDate } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { DayChips, NumberWithUnit, ReminderExample, UnitInput } from '@/features/settings/components/SupervisionReminderControls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const DEFAULTS: SupervisionSettings = {
  requireCarerSignature: true,
  allowCarerDisagree: true,
  confidentialNotesEnabled: true,
  requireFormAnswers: true,
  remindersEnabled: true,
  reminderHour: 8,
  dueSoonDays: 14,
  reminderDaysBefore: [14, 7, 1, 0],
  reminderDaysAfter: [1, 7, 14],
  escalateAfterDays: 7,
  notifySupervisor: true,
  notifyCarer: true,
  managersOnAllReminders: false,
  emailReminders: true,
  autoScheduleNext: false,
}

type BoolKey = { [K in keyof SupervisionSettings]: SupervisionSettings[K] extends boolean ? K : never }[keyof SupervisionSettings]

const SESSION_ROWS: Array<{ key: BoolKey; label: string; hint: string }> = [
  {
    key: 'requireCarerSignature',
    label: 'Carer must sign before a session is completed',
    hint: 'Yes: the session stays "Awaiting carer sign-off" until every carer has signed or commented.\nNo: it completes when the supervisor signs.',
  },
  {
    key: 'allowCarerDisagree',
    label: 'Carer can record that they disagree',
    hint: 'Lets the carer say they do not agree with the record, with a comment, instead of signing.',
  },
  {
    key: 'requireFormAnswers',
    label: 'Required questions must be answered before signing',
    hint: 'Questions marked required on the Care Pathway form must be answered before the supervisor can sign.',
  },
  {
    key: 'confidentialNotesEnabled',
    label: 'Confidential notes section',
    hint: 'Private notes (e.g. health or personal matters) visible only to roles with "supervision confidential" access.',
  },
  {
    key: 'autoScheduleNext',
    label: 'Book the next session when one is completed',
    hint: 'Completing a one-to-one books the next one on its due date (same time of day), with the carer\'s named supervisor. Group sessions are not booked.',
  },
]

const REMINDER_ROWS: Array<{ key: BoolKey; label: string; hint: string }> = [
  {
    key: 'notifySupervisor',
    label: "The carer's named supervisor",
    hint: 'In-app notification (and email when on). Carers with no named supervisor: branch managers are reminded instead.',
  },
  {
    key: 'notifyCarer',
    label: 'The carer, on their phone',
    hint: 'A push notification to the carer\'s phone so they know a supervision is due.',
  },
  {
    key: 'managersOnAllReminders',
    label: 'Branch managers, on every reminder',
    hint: 'No: managers are told only when no supervisor is named, or when a supervision is overdue past the escalation point.\nYes: managers get every reminder.',
  },
  {
    key: 'emailReminders',
    label: 'Email staff as well as notify',
    hint: 'Supervisors and managers also get an email, as well as the in-app notification.',
  },
]

const HOURS = Array.from({ length: 24 }, (_, h) => h)

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="border-t border-border pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h4>
}

/** A setting whose control sits under its label (chips need the width). */
function StackedSetting({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      </div>
      {children}
    </div>
  )
}

/**
 * Settings → Supervision: when each review type is due (Review types), the rules for sessions, and
 * who is reminded when. One draft for the rules and reminders, saved from one bar.
 */
export function GeneralSettingsSupervisionPanel() {
  const canEditRules = useAuthStore(s => s.can('lookups.manage'))
  const canEditForms = useAuthStore(s => s.can('supervision.settings'))
  const { data: settings, isLoading } = useGeneralSettings()
  const update = useUpdateGeneralSettings()
  const saved = React.useMemo<SupervisionSettings>(
    () => ({ ...DEFAULTS, ...(settings?.supervisionSettings ?? {}) }),
    [settings],
  )
  const [draft, setDraft] = React.useState<SupervisionSettings>(saved)
  React.useEffect(() => setDraft(saved), [saved])
  const set = <K extends keyof SupervisionSettings>(key: K, value: SupervisionSettings[K]) =>
    setDraft(d => ({ ...d, [key]: value }))
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const onSave = async () => {
    try {
      await update.mutateAsync({ supervisionSettings: draft })
      toastSuccess('Saved', 'Supervision settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const remindersOff = !canEditRules || !draft.remindersEnabled

  return (
    <div className="space-y-6" data-testid="general-settings-supervision-panel">
      <ReviewTypesCard canEdit={canEditForms} />

      <GeneralSettingsCard title="Supervision sessions">
        <p className="text-sm text-muted-foreground">
          Rules for sessions held in CareFlow. Signed sessions are never edited; corrections are added as dated
          addenda.
        </p>
        {SESSION_ROWS.map(row => (
          <SettingsRow key={row.key} label={row.label} hint={row.hint}>
            <SettingsNoYesToggle value={draft[row.key]} onChange={v => set(row.key, v)} disabled={!canEditRules} />
          </SettingsRow>
        ))}
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Reminders">
        <p className="text-sm text-muted-foreground">
          So supervisions, spot checks, appraisals and probation reviews happen on time: the people who need to act are
          told before each one is due and again if it is missed. How often each review is due is set in Review types
          above.
        </p>
        <SettingsRow label="Send reminders" hint="Turn all review reminders on or off.">
          <SettingsNoYesToggle value={draft.remindersEnabled} onChange={v => set('remindersEnabled', v)} disabled={!canEditRules} />
        </SettingsRow>
        <SettingsRow label="Time they go out" hint="Organisation time zone (Settings → General).">
          <Select value={String(draft.reminderHour)} onValueChange={v => set('reminderHour', Number(v))} disabled={remindersOff}>
            <SelectTrigger className="w-28" aria-label="Reminder time">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map(h => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, '0')}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SubHeading>When</SubHeading>
        <StackedSetting label="Before it is due" help="Skipped when a session is already booked by the due date.">
          <DayChips
            value={draft.reminderDaysBefore}
            onChange={v => set('reminderDaysBefore', v)}
            presets={[30, 14, 7, 3, 1, 0]}
            min={0}
            when="before"
            disabled={remindersOff}
            label="Remind before it is due"
          />
        </StackedSetting>
        <StackedSetting label="If it is missed" help="Again after the due date while it is still not done.">
          <DayChips
            value={draft.reminderDaysAfter}
            onChange={v => set('reminderDaysAfter', v)}
            presets={[1, 3, 7, 14, 30]}
            min={1}
            when="after"
            disabled={remindersOff}
            label="Remind when overdue"
          />
        </StackedSetting>
        <SettingsRow
          label="Tell branch managers when it is"
          hint="Escalation to Admin, Manager and Branch Admin users of the carer's branch. 0 = never."
        >
          <NumberWithUnit
            value={draft.escalateAfterDays}
            onChange={v => set('escalateAfterDays', v)}
            min={0}
            max={365}
            unit="days late"
            disabled={remindersOff}
            label="Escalate when this many days late"
          />
        </SettingsRow>
        <SettingsRow label='Show as "Due soon" from' hint="On staff records, Review status and the dashboard.">
          <NumberWithUnit
            value={draft.dueSoonDays}
            onChange={v => set('dueSoonDays', v)}
            min={1}
            max={90}
            unit="days before"
            disabled={!canEditRules}
            label="Due soon this many days before"
          />
        </SettingsRow>

        <SubHeading>Who</SubHeading>
        {REMINDER_ROWS.map(row => (
          <SettingsRow key={row.key} label={row.label} hint={row.hint}>
            <SettingsNoYesToggle value={draft[row.key]} onChange={v => set(row.key, v)} disabled={remindersOff} />
          </SettingsRow>
        ))}

        <ReminderExample s={draft} />
      </GeneralSettingsCard>

      {canEditRules && dirty ? (
        <div
          className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 shadow-md dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100"
          data-testid="supervision-settings-save-bar"
        >
          <span>Unsaved changes to sessions and reminders</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft(saved)} disabled={update.isPending}>
              Discard
            </Button>
            <Button type="button" size="sm" onClick={() => void onSave()} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const NO_FORM = '__none__'

type ReviewTypeRow = SupervisionFormsOverview['reviewTypes'][number]

/**
 * Each review type: when it is due (repeating, milestones from the start date, or only when it
 * happens), who it applies to, and the Care Pathway staff form its sessions are recorded on.
 */
function ReviewTypesCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient()
  const query = useSupervisionForms()
  const canOpenBuilder = useAuthStore(s => s.can('care_pathway.read'))
  const [editing, setEditing] = React.useState<ReviewTypeRow | null>(null)
  const save = useMutation({
    mutationFn: (vars: { reviewTypeId: string; formId: string | null }) => setSupervisionForm(vars.reviewTypeId, vars.formId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supervisionKeys.forms() })
      toastSuccess('Saved', 'New sessions use this form; past sessions keep theirs.')
    },
    onError: e => toastApiError(e, 'Could not set the form'),
  })
  const rows = query.data?.reviewTypes ?? []
  const forms = query.data?.forms ?? []

  return (
    <GeneralSettingsCard title="Review types">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          When each review is due and who it is for, and the Care Pathway staff form it is recorded on. Milestones count
          from each carer&apos;s start date (Employment). A session keeps its form as it was when it was set up, so later
          changes never alter a past record.
        </p>
        {canOpenBuilder ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/settings/care-pathway" search={{ tab: 'form-builder' }}>
              <ExternalLink className="mr-1 h-4 w-4" />
              Form builder
            </Link>
          </Button>
        ) : null}
      </div>
      {query.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
      <div className="overflow-x-auto rounded-lg border border-border" data-testid="supervision-review-types">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Review type', 'When due', 'Applies to', 'Form'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const form = row.form
              return (
                <tr key={row.id} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.name}</p>
                    {row.description ? <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">{row.description}</p> : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-1">
                      <span>{describeSchedule(row)}</span>
                      {canEdit ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setEditing(row)}
                          aria-label={`Edit schedule for ${row.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{REVIEW_AUDIENCE_LABELS[row.audience]}</td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <Select
                        value={form?.id ?? NO_FORM}
                        onValueChange={v => save.mutate({ reviewTypeId: row.id, formId: v === NO_FORM ? null : v })}
                        disabled={save.isPending}
                      >
                        <SelectTrigger className="h-8 w-64" aria-label={`Form for ${row.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FORM}>No form (cannot be scheduled)</SelectItem>
                          {forms.map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                              {f.status !== 'PUBLISHED' ? ' (not published)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      (form?.name ?? '—')
                    )}
                    <p className="mt-1 text-xs">
                      {!form ? (
                        <span className="text-amber-700 dark:text-amber-300">No form: sessions cannot be scheduled</span>
                      ) : form.status !== 'PUBLISHED' ? (
                        <span className="text-amber-700 dark:text-amber-300">Unpublished changes: publish it to use it</span>
                      ) : form.lastPublishedAt ? (
                        <span className="text-muted-foreground">Published {formatDate(form.lastPublishedAt)}</span>
                      ) : null}
                    </p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!canEdit ? (
        <p className="text-xs text-muted-foreground">You need the &quot;supervision settings&quot; permission to change review types.</p>
      ) : null}
      <ScheduleDialog row={editing} onClose={() => setEditing(null)} />
    </GeneralSettingsCard>
  )
}

const KIND_LABELS: Record<ReviewScheduleKind, { label: string; hint: string }> = {
  REPEATING: { label: 'Repeating', hint: 'Every set number of days, e.g. supervision every 90 days.' },
  MILESTONES: { label: 'Milestones after starting', hint: 'Set days after the start date, then stops, e.g. probation at 30, 90 and 180 days.' },
  EVENT: { label: 'Only when it happens', hint: 'Not chased until one is recorded, e.g. return to work. Optional follow-up gap.' },
}

function intOrNull(text: string): number | null {
  const n = Number.parseInt(text, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

function ScheduleDialog({ row, onClose }: { row: ReviewTypeRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [kind, setKind] = React.useState<ReviewScheduleKind>('REPEATING')
  const [interval, setInterval] = React.useState('')
  const [firstDue, setFirstDue] = React.useState('')
  const [milestones, setMilestones] = React.useState('')
  const [audience, setAudience] = React.useState<ReviewAudience>('ALL_STAFF')
  React.useEffect(() => {
    if (!row) return
    setKind(row.scheduleKind)
    setInterval(row.defaultIntervalDays ? String(row.defaultIntervalDays) : '')
    setFirstDue(row.firstDueAfterStartDays != null ? String(row.firstDueAfterStartDays) : '')
    setMilestones(row.milestoneDays.join(', '))
    setAudience(row.audience)
  }, [row])

  const milestoneDays = milestones.split(/[,\s]+/).filter(Boolean).map(Number)
  const milestonesValid = milestoneDays.every(d => Number.isInteger(d) && d >= 1 && d <= 3650)
  const schedule: ReviewSchedule = {
    scheduleKind: kind,
    defaultIntervalDays: kind === 'MILESTONES' ? null : intOrNull(interval),
    firstDueAfterStartDays: kind === 'REPEATING' && firstDue.trim() ? Number.parseInt(firstDue, 10) : null,
    milestoneDays: kind === 'MILESTONES' ? [...new Set(milestoneDays)].sort((a, b) => a - b) : [],
    audience,
  }
  const error =
    kind === 'REPEATING' && !schedule.defaultIntervalDays
      ? 'Enter the number of days between reviews.'
      : kind === 'MILESTONES' && (!milestonesValid || !schedule.milestoneDays.length)
        ? 'Enter whole days after the start date, separated by commas.'
        : null

  const save = useMutation({
    mutationFn: () => setReviewSchedule(row!.id, schedule),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supervisionKeys.all() })
      toastSuccess('Schedule saved', 'Due dates and reminders follow it from now on.')
      onClose()
    },
    onError: e => toastApiError(e, 'Could not save the schedule'),
  })

  return (
    <Dialog open={Boolean(row)} onOpenChange={open => (open ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>When is {row?.name} due?</DialogTitle>
          <DialogDescription>Due dates on staff records, reminders and the dashboard all follow this.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2" role="radiogroup" aria-label="Schedule">
            {(Object.keys(KIND_LABELS) as ReviewScheduleKind[]).map(k => (
              <label key={k} className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm has-[:checked]:border-primary">
                <input type="radio" name="schedule-kind" checked={kind === k} onChange={() => setKind(k)} className="mt-1" />
                <span>
                  <span className="font-medium">{KIND_LABELS[k].label}</span>
                  <span className="block text-xs text-muted-foreground">{KIND_LABELS[k].hint}</span>
                </span>
              </label>
            ))}
          </div>
          {kind === 'REPEATING' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Every</span>
                <UnitInput unit="days" min={1} max={3650} value={interval} onChange={e => setInterval(e.target.value)} aria-label="Every how many days" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">First one after starting (optional)</span>
                <UnitInput unit="days" min={0} max={3650} value={firstDue} onChange={e => setFirstDue(e.target.value)} placeholder={interval || 'Same'} aria-label="First due this many days after starting" />
              </label>
            </div>
          ) : null}
          {kind === 'MILESTONES' ? (
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Days after the start date</span>
              <DayChips
                value={milestoneDays.filter(d => Number.isInteger(d) && d > 0)}
                onChange={days => setMilestones([...days].sort((a, b) => a - b).join(', '))}
                presets={[7, 14, 21, 28, 30, 60, 84, 90, 180, 365]}
                min={1}
                when="start"
                disabled={false}
                label="Milestones after the start date"
              />
              <span className="block text-xs text-muted-foreground">
                A review held a little early or late counts for the milestone it was meant for. Nothing is due after the last one.
              </span>
            </label>
          ) : null}
          {kind === 'EVENT' ? (
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Follow up every (optional)</span>
              <UnitInput unit="days" min={1} max={3650} value={interval} onChange={e => setInterval(e.target.value)} placeholder="None" aria-label="Follow up every how many days" className="w-44" />
              <span className="block text-xs text-muted-foreground">
                E.g. a performance plan reviewed every 14 days. Clear the next due date on the record to stop it.
              </span>
            </label>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Applies to</span>
            <Select value={audience} onValueChange={v => setAudience(v as ReviewAudience)}>
              <SelectTrigger aria-label="Applies to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REVIEW_AUDIENCE_LABELS) as ReviewAudience[]).map(a => (
                  <SelectItem key={a} value={a}>
                    {REVIEW_AUDIENCE_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="block text-xs text-muted-foreground">NMC PIN is on the staff record (Employment).</span>
          </label>
          <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Will show as: </span>
            {describeSchedule(schedule)} · {REVIEW_AUDIENCE_LABELS[audience]}
          </p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={Boolean(error) || save.isPending}>
            {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
