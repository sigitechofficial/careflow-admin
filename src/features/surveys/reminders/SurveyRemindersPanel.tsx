import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { BellRing, Info, Phone, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatSurveyDate, formatSurveyDateTime } from '@/features/surveys/survey-datetime'
import {
  describeContactPlan,
  SURVEY_CALL_ROLES,
  useRemindNow,
  useSaveSurveyContactPlan,
  useSurveyContactPlan,
  type SurveyContactChannel,
  type SurveyContactPlan,
  type SurveyContactPlanPayload,
  type SurveyReminderRun,
} from './survey-reminders'

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

type Props = {
  surveyId: string
  /** surveys.manage */
  canEdit: boolean
  /** The survey is open for answers (Remind now). */
  isOpen: boolean
}

/**
 * Reminders and follow-up: up to three reminders to people who have not answered, by the chosen
 * channels outside quiet hours, then (named surveys) a call list for a role. Anonymous surveys say
 * how reminders stay anonymous and have no call list.
 */
export function SurveyRemindersPanel({ surveyId, canEdit, isOpen }: Props) {
  const { data } = useSurveyContactPlan(surveyId)
  const [editing, setEditing] = React.useState(false)
  const remind = useRemindNow(surveyId)
  const headingId = React.useId()
  if (!data) return null

  const remindNow = async () => {
    try {
      const res = await remind.mutateAsync()
      toastSuccess(res.message ?? 'Reminders sent')
    } catch (e) {
      toastApiError(e, 'Reminders not sent')
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby={headingId} data-testid="survey-reminders">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:flex" aria-hidden>
            <BellRing className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className="text-sm font-semibold text-foreground">
              Reminders and follow-up
            </h3>
            <p className="mt-0.5 text-sm text-foreground" data-testid="survey-reminders-summary">
              {describeContactPlan(data.plan)}
            </p>
            {data.inheritedFrom ? (
              <p className="mt-0.5 text-xs text-muted-foreground">This period follows the repeating survey’s reminders.</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.plan?.call && data.callListAvailable ? (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
              <Link to="/surveys/$surveyId/calls" params={{ surveyId }}>
                <Phone className="h-3.5 w-3.5" aria-hidden />
                Call list
              </Link>
            </Button>
          ) : null}
          {canEdit && isOpen ? (
            <Button type="button" size="sm" variant="outline" disabled={remind.isPending} onClick={() => void remindNow()}>
              Remind now
            </Button>
          ) : null}
          {canEdit && !data.inheritedFrom ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              {data.plan ? 'Change' : 'Set up'}
            </Button>
          ) : null}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {data.isAnonymous
            ? 'Anonymous survey: reminders go to everyone who has not answered, with no personal link, and never say who has answered. There is no call list.'
            : 'Reminders go only to people who have not answered, never more than 3 each and at least 2 days apart.'}
          {data.plan?.channels.includes('TEXT') && data.textMessages.provider === 'log'
            ? ' Text messages are not sent yet: until a text message provider is set up they are only noted in the system log.'
            : ''}
        </span>
      </p>

      {data.runs.length ? (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reminders sent</h4>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {data.runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-medium text-foreground">
                  {run.manual ? 'Sent by hand' : `Reminder ${run.step ?? ''}`.trim()}
                </span>
                <span className="text-muted-foreground">{runText(run)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {editing ? <ContactPlanDialog surveyId={surveyId} data={data} onClose={() => setEditing(false)} /> : null}
    </section>
  )
}

function runText(run: SurveyReminderRun): string {
  const when = run.at.length === 10 ? formatSurveyDate(run.at) : formatSurveyDateTime(run.at)
  if (!run.counts) return `${when} · to everyone who had not answered`
  const c = run.counts
  const extra = [
    c.noContact ? `${c.noContact} with no way to reach them` : '',
    c.optedOut ? `${c.optedOut} asked not to be contacted` : '',
  ].filter(Boolean)
  return `${when} · ${c.people} ${c.people === 1 ? 'person' : 'people'} reminded${extra.length ? ` (${extra.join(', ')})` : ''}`
}

const emptyPlan = (data: SurveyContactPlanPayload): SurveyContactPlan =>
  data.suggested ?? {
    reminders: [{ afterDays: 7 }],
    channels: data.channels.filter((c) => c.value !== 'TEXT').map((c) => c.value),
    quietStart: '20:00',
    quietEnd: '09:00',
    weekdaysOnly: false,
    call: null,
  }

function ContactPlanDialog({ surveyId, data, onClose }: { surveyId: string; data: SurveyContactPlanPayload; onClose: () => void }) {
  const [plan, setPlan] = React.useState<SurveyContactPlan>(() => data.plan ?? emptyPlan(data))
  const save = useSaveSurveyContactPlan(surveyId)
  const max = data.limits.maxReminders
  const set = (patch: Partial<SurveyContactPlan>) => setPlan((p) => ({ ...p, ...patch }))

  const problem = (() => {
    for (let i = 0; i < plan.reminders.length; i += 1) {
      const d = plan.reminders[i]?.afterDays ?? Number.NaN
      if (!Number.isInteger(d) || d < 1 || d > 60) return `Reminder ${i + 1}: choose between 1 and 60 days.`
      const before = plan.reminders[i - 1]?.afterDays
      if (before !== undefined && d - before < data.limits.minGapDays) {
        return `Reminder ${i + 1}: leave at least ${data.limits.minGapDays} days after the one before.`
      }
    }
    if (plan.reminders.length && !plan.channels.length) return 'Choose at least one way to send reminders.'
    if (plan.call) {
      const last = plan.reminders[plan.reminders.length - 1]?.afterDays ?? -1
      if (plan.call.afterDays <= last) return 'Start the call list after the last reminder.'
    }
    return null
  })()

  const submit = async (value: SurveyContactPlan | null) => {
    try {
      await save.mutateAsync(value)
      toastSuccess(value ? 'Reminders saved' : 'Reminders turned off')
      onClose()
    } catch (e) {
      toastApiError(e, 'Reminders not saved')
    }
  }

  const toggleChannel = (c: SurveyContactChannel, on: boolean) =>
    set({ channels: on ? [...plan.channels, c] : plan.channels.filter((x) => x !== c) })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reminders and follow-up</DialogTitle>
          <DialogDescription>
            Remind people who have not answered, then{data.callListAvailable ? ' give someone a list to phone.' : ' stop.'} Research
            with older people found that combining reminders with a phone call gets the most answers.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Reminders</legend>
            <p className="text-xs text-muted-foreground">
              Days after each person was sent the survey. Up to {max}, at least {data.limits.minGapDays} days apart.
            </p>
            <ul className="mt-2 space-y-2">
              {plan.reminders.map((r, i) => (
                <li key={i} className="flex items-end gap-2">
                  <label className="block text-sm">
                    <span className="text-foreground">Reminder {i + 1}, days after sending</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className={`${fieldClass} w-32`}
                      value={Number.isNaN(r.afterDays) ? '' : r.afterDays}
                      onChange={(e) =>
                        set({ reminders: plan.reminders.map((x, j) => (j === i ? { afterDays: e.target.valueAsNumber } : x)) })
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove reminder ${i + 1}`}
                    onClick={() => set({ reminders: plan.reminders.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            {plan.reminders.length < max ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 gap-1.5"
                onClick={() =>
                  set({ reminders: [...plan.reminders, { afterDays: (plan.reminders[plan.reminders.length - 1]?.afterDays ?? 0) + 4 }] })
                }
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add a reminder
              </Button>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Send by</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {data.channels.map((c) => {
                const off = c.value === 'TEXT' && !data.textMessages.enabled
                return (
                  <label key={c.value} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      disabled={off}
                      checked={plan.channels.includes(c.value)}
                      onChange={(e) => toggleChannel(c.value, e.target.checked)}
                    />
                    <span>
                      {c.label}
                      {c.value === 'TEXT' ? (
                        <span className="block text-xs text-muted-foreground">
                          {off
                            ? 'Turned off for CareFlow.'
                            : data.textMessages.provider === 'log'
                              ? 'To the mobile number on their record. Not sent until a text message provider is set up.'
                              : 'To the mobile number on their record.'}
                        </span>
                      ) : null}
                      {c.value === 'EMAIL' && data.targetKind === 'SERVICE_USER' && data.isAnonymous ? (
                        <span className="block text-xs text-muted-foreground">Not used on anonymous surveys: it would carry their own link.</span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">People who asked not to be contacted about surveys are never sent anything.</p>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Quiet hours</legend>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <label className="block text-sm">
                <span>Nothing sent from</span>
                <input type="time" className={`${fieldClass} w-32`} value={plan.quietStart} onChange={(e) => set({ quietStart: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span>until</span>
                <input type="time" className={`${fieldClass} w-32`} value={plan.quietEnd} onChange={(e) => set({ quietEnd: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={plan.weekdaysOnly} onChange={(e) => set({ weekdaysOnly: e.target.checked })} />
                Weekdays only
              </label>
            </div>
          </fieldset>

          {data.callListAvailable ? (
            <fieldset>
              <legend className="text-sm font-semibold text-foreground">Phone people who still have not answered</legend>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(plan.call)}
                  onChange={(e) =>
                    set({
                      call: e.target.checked
                        ? { afterDays: (plan.reminders[plan.reminders.length - 1]?.afterDays ?? 0) + 3, roleId: null, ownerKey: 'CARE_COORDINATOR', withinDays: 5 }
                        : null,
                    })
                  }
                />
                Give a role a list of people to phone
              </label>
              {plan.call ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span>Days after sending</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      className={fieldClass}
                      value={Number.isNaN(plan.call.afterDays) ? '' : plan.call.afterDays}
                      onChange={(e) => set({ call: { ...plan.call!, afterDays: e.target.valueAsNumber } })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span>Calls made within (days)</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      className={fieldClass}
                      value={Number.isNaN(plan.call.withinDays) ? '' : plan.call.withinDays}
                      onChange={(e) => set({ call: { ...plan.call!, withinDays: e.target.valueAsNumber } })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span>Who phones</span>
                    <select
                      className={fieldClass}
                      value={plan.call.ownerKey ?? 'CARE_COORDINATOR'}
                      onChange={(e) => set({ call: { ...plan.call!, ownerKey: e.target.value, roleId: null } })}
                    >
                      {SURVEY_CALL_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {problem ? (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {data.plan ? (
            <Button type="button" variant="ghost" disabled={save.isPending} onClick={() => void submit(null)}>
              Turn off
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={save.isPending || Boolean(problem)} onClick={() => void submit(plan)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
