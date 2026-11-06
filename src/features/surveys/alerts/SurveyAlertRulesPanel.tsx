import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { BellRing, Clock, FileText, Pencil, Plus, RotateCcw, Trash2, UserRound, Users } from 'lucide-react'
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
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  OWNER_LABELS,
  RECORD_LABELS,
  ruleTimescaleLabel,
  timescaleLabel,
  useAlertRules,
  useDeleteAlertRule,
  useRestoreLibraryRules,
  useSaveAlertRule,
  useSetNeverRouteTo,
  useSetOwnerRole,
  type AlertOwnerKey,
  type AlertRecordKind,
  type SaveAlertRuleInput,
  type SurveyAlertRule,
  type SurveyAlertRulesPayload,
} from '@/features/surveys/alerts/survey-alerts'

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'text-xs font-medium text-foreground'

/** The role a rule goes to, in words. */
function roleName(rule: SurveyAlertRule): string {
  if (!rule.role) return 'No role found'
  return `${rule.role.name}${rule.ownerLabel && rule.ownerLabel !== rule.role.name && !rule.roleId ? ` (as ${rule.ownerLabel})` : ''}`
}

/** Why a rule's task would go to survey managers instead, or null. */
function roleWarning(rule: SurveyAlertRule): string | null {
  if (!rule.role) return 'Choose a role, or survey managers are told instead.'
  return rule.role.holders === 0 ? 'No one has this role yet, so survey managers are told.' : null
}

/**
 * Alert rules on the survey page: which answers need action, who does it and by when. Tasks go to
 * My tasks and Surveys → Follow-ups.
 */
export function SurveyAlertRulesPanel({ surveyId, canEdit }: { surveyId: string; canEdit: boolean }) {
  const { data, isLoading, isError } = useAlertRules(surveyId)
  const [editing, setEditing] = React.useState<SurveyAlertRule | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<SurveyAlertRule | null>(null)
  const [rolesOpen, setRolesOpen] = React.useState(false)
  const del = useDeleteAlertRule(data?.surveyId ?? surveyId)
  const restore = useRestoreLibraryRules(data?.surveyId ?? surveyId)
  const headingId = React.useId()

  if (isLoading) return null
  if (isError || !data) {
    return (
      <p className="mb-5 text-sm text-muted-foreground" role="status">
        Alert rules could not be loaded.
      </p>
    )
  }
  const onPeriod = Boolean(data.editedOnSurveyId)
  const editable = canEdit && !onPeriod

  const restoreButton = data.fromLibrary && editable ? (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="gap-1.5"
      disabled={restore.isPending}
      onClick={() =>
        void restore
          .mutateAsync()
          .then(() => toastSuccess('Ready-made alerts restored'))
          .catch((e: unknown) => toastApiError(e, 'Could not restore the alerts'))
      }
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      Restore ready-made alerts
    </Button>
  ) : null
  const count = data.rules.length
  const chip = 'inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground'

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-labelledby={headingId} data-testid="survey-alert-rules">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground sm:flex" aria-hidden>
            <BellRing className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={headingId} className="text-sm font-semibold text-foreground">
                Alerts: answers that need action
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground" data-testid="alert-count">
                {count === 0 ? 'No alerts' : `${count} alert${count === 1 ? '' : 's'}`}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chosen answers give a task to a role, due by a timescale, in their My tasks and on{' '}
              <Link to="/surveys/follow-ups" className="font-medium text-primary underline-offset-2 hover:underline">
                Survey follow-ups
              </Link>
              .
            </p>
          </div>
        </div>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setRolesOpen(true)}>
              <Users className="h-3.5 w-3.5" aria-hidden />
              Who handles alerts
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setEditing('new')}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add alert
            </Button>
          </div>
        ) : null}
      </div>

      {onPeriod ? (
        <p className="mt-3 text-xs text-muted-foreground">
          This period uses the repeating survey’s alerts.{' '}
          <Link
            to="/surveys/$surveyId"
            params={{ surveyId: data.editedOnSurveyId! }}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Change them there
          </Link>
          .
        </p>
      ) : null}

      {data.anonymityNote ? (
        <p className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
          {data.anonymityNote}
        </p>
      ) : null}

      {count === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border px-4 py-6 text-center" data-testid="alerts-empty">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
            <BellRing className="h-5 w-5" />
          </span>
          <p className="mt-2 text-sm font-medium text-foreground">No alerts yet</p>
          <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
            An alert turns an answer that needs someone to act, such as a complaint or a safety worry, into a task with
            a deadline.
            {restoreButton ? ' This ready-made survey comes with suggested alerts you can put back.' : ''}
          </p>
          {restoreButton ? <div className="mt-2">{restoreButton}</div> : null}
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {data.rules.map(rule => (
              <li key={rule.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5" data-testid="alert-rule">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={`text-sm font-medium ${rule.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                      {rule.title}
                    </p>
                    {rule.urgent ? <Badge variant="destructive">Urgent</Badge> : null}
                    {rule.contactRequest ? <Badge variant="outline">Contact me</Badge> : null}
                    {rule.fromLibrary ? <Badge variant="outline">Ready-made</Badge> : null}
                    {!rule.isActive ? <Badge variant="outline">Off</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">When:</span> {rule.whenText}
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className={chip}>
                      <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="sr-only">Task for: </span>
                      {roleName(rule)}
                    </span>
                    <span className={chip}>
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="sr-only">Due: </span>
                      {ruleTimescaleLabel(rule)}
                    </span>
                    {rule.recordKind ? (
                      <span className={chip}>
                        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                        May need a {RECORD_LABELS[rule.recordKind].toLowerCase()}
                      </span>
                    ) : null}
                  </p>
                  {roleWarning(rule) ? <p className="mt-1 text-xs text-destructive">{roleWarning(rule)}</p> : null}
                  {rule.problems.length ? (
                    <p className="mt-1 text-xs text-destructive" role="note">
                      This alert cannot fire: {rule.problems[0]}
                    </p>
                  ) : null}
                </div>
                {editable ? (
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Change alert: ${rule.title}`} onClick={() => setEditing(rule)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" aria-label={`Remove alert: ${rule.title}`} onClick={() => setRemoving(rule)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {restoreButton ? <div className="mt-2 flex justify-end">{restoreButton}</div> : null}
        </>
      )}

      {data.manualChecks.length ? (
        <details className="mt-3 rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-foreground">
            Checked by a person ({data.manualChecks.length}): written answers CareFlow cannot read for you
          </summary>
          <ul className="mt-2 space-y-2">
            {data.manualChecks.map((m, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{m.when}</span> {m.action}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {editing ? (
        <AlertRuleDialog
          payload={data}
          rule={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {rolesOpen ? <AlertRolesDialog payload={data} onClose={() => setRolesOpen(false)} /> : null}

      <AlertDialog open={removing != null} onOpenChange={o => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this alert?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removing?.title}” will no longer raise tasks. Tasks it already raised are kept.
              {removing?.fromLibrary ? ' You can put ready-made alerts back with Restore ready-made alerts.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={del.isPending}
              onClick={e => {
                e.preventDefault()
                if (!removing) return
                void del
                  .mutateAsync(removing.id)
                  .then(() => {
                    toastSuccess('Alert removed')
                    setRemoving(null)
                  })
                  .catch((err: unknown) => toastApiError(err, 'Could not remove the alert'))
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

type ConditionDraft = { questionKey: string; answers: string[]; not?: boolean }

function AlertRuleDialog({
  payload,
  rule,
  onClose,
}: {
  payload: SurveyAlertRulesPayload
  rule: SurveyAlertRule | null
  onClose: () => void
}) {
  const save = useSaveAlertRule(payload.surveyId)
  const [title, setTitle] = React.useState(rule?.title ?? '')
  const [actionText, setActionText] = React.useState(rule?.actionText ?? '')
  const [whenText, setWhenText] = React.useState(rule?.fromLibrary ? rule.whenText : '')
  const [conditions, setConditions] = React.useState<ConditionDraft[]>(
    rule?.conditions.map(c => ({ questionKey: c.questionKey, answers: c.answers, ...(c.not ? { not: true } : {}) })) ?? [
      { questionKey: '', answers: [] },
    ],
  )
  const mixed = rule?.match === 'mixed'
  const [match, setMatch] = React.useState<'any' | 'all'>(rule?.match === 'all' ? 'all' : 'any')
  const [minimumAnswers, setMinimumAnswers] = React.useState(rule?.minimumAnswers ? String(rule.minimumAnswers) : '')
  const unlinkedPossible = payload.isAnonymous || payload.offersAnswerWithoutName
  const minInvalid = minimumAnswers.trim() !== '' && (!Number.isInteger(Number(minimumAnswers)) || Number(minimumAnswers) < 5 || Number(minimumAnswers) > 100)
  const [ownerKey, setOwnerKey] = React.useState<AlertOwnerKey | ''>(rule?.ownerKey ?? 'REGISTERED_MANAGER')
  const [roleId, setRoleId] = React.useState(rule?.roleId ?? '')
  const [days, setDays] = React.useState(rule?.dueCalendarDays ?? rule?.dueWorkingDays ?? 0)
  const [unit, setUnit] = React.useState<'working' | 'calendar'>(rule?.dueCalendarDays != null ? 'calendar' : 'working')
  const [urgent, setUrgent] = React.useState(rule?.urgent ?? false)
  const [recordKind, setRecordKind] = React.useState<AlertRecordKind | ''>(rule?.recordKind ?? '')
  const [contactRequest, setContactRequest] = React.useState(rule?.contactRequest ?? false)
  const [isActive, setIsActive] = React.useState(rule?.isActive ?? true)
  const id = React.useId()
  const questionByKey = new Map(payload.questions.map(q => [q.key, q]))
  const only = conditions.length === 1 ? conditions[0] : undefined
  const contactShape =
    !!only &&
    questionByKey.get(only.questionKey)?.contactRequest === true &&
    only.answers.length === 1 &&
    only.answers[0] === 'Yes'
  const complete = mixed || conditions.every(c => c.questionKey && c.answers.length > 0)
  const valid = title.trim().length >= 3 && actionText.trim().length >= 3 && complete && conditions.length > 0 && !minInvalid

  const setCondition = (i: number, next: ConditionDraft) => setConditions(cs => cs.map((c, j) => (j === i ? next : c)))

  const submit = async () => {
    const input: SaveAlertRuleInput = {
      title: title.trim(),
      whenText: whenText.trim() || undefined,
      actionText: actionText.trim(),
      conditions,
      match,
      ...(mixed ? { keepConditions: true } : {}),
      minimumAnswers: minimumAnswers.trim() ? Number(minimumAnswers) : null,
      ownerKey: ownerKey || null,
      roleId: roleId || null,
      ...(unit === 'working' ? { dueWorkingDays: days } : { dueCalendarDays: Math.max(1, days) }),
      urgent,
      recordKind: recordKind || null,
      contactRequest: contactRequest && contactShape && !payload.isAnonymous,
      isActive,
    }
    try {
      await save.mutateAsync({ id: rule?.id, input })
      toastSuccess(rule ? 'Alert saved' : 'Alert added')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save the alert')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? 'Change alert' : 'Add alert'}</DialogTitle>
          <DialogDescription>Choose the answers that need action, who does it and by when.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label className={labelClass} htmlFor={`${id}-title`}>
              Task title
            </label>
            <input
              id={`${id}-title`}
              className={fieldClass}
              value={title}
              maxLength={80}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Feels unsafe with care workers"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className={labelClass}>When these answers are given</legend>
            {mixed ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" data-testid="alert-mixed-conditions">
                This ready-made alert combines its questions in a way this screen cannot change: {rule?.whenText} You
                can still change who it goes to, the timescale and the wording, or remove it and add your own.
              </p>
            ) : (
              <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label="How the questions combine">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`${id}-match`} checked={match === 'any'} onChange={() => setMatch('any')} />
                  Any one of them
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`${id}-match`} checked={match === 'all'} onChange={() => setMatch('all')} />
                  All of them together
                </label>
              </div>
            )}
            {mixed ? null : conditions.map((c, i) => {
              const q = questionByKey.get(c.questionKey)
              return (
                <div key={i} className="rounded-md border border-border p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <label className="sr-only" htmlFor={`${id}-q-${i}`}>
                        Question {i + 1}
                      </label>
                      <select
                        id={`${id}-q-${i}`}
                        className={fieldClass}
                        value={c.questionKey}
                        onChange={e => setCondition(i, { questionKey: e.target.value, answers: [] })}
                      >
                        <option value="">Choose a question…</option>
                        {payload.questions.map(opt => (
                          <option key={opt.key} value={opt.key}>
                            {opt.questionText}
                          </option>
                        ))}
                      </select>
                    </div>
                    {conditions.length > 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove question ${i + 1} from this alert`}
                        onClick={() => setConditions(cs => cs.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                  {q ? (
                    <fieldset className="mt-2">
                      <legend className="sr-only">Answers to question {i + 1}</legend>
                      <label className="text-xs text-muted-foreground" htmlFor={`${id}-not-${i}`}>
                        Fires when
                      </label>{' '}
                      <select
                        id={`${id}-not-${i}`}
                        className="rounded-md border border-input bg-background px-1.5 py-0.5 text-xs"
                        value={c.not ? 'not' : 'is'}
                        onChange={e => setCondition(i, { ...c, not: e.target.value === 'not' || undefined })}
                      >
                        <option value="is">one of these is chosen</option>
                        <option value="not">it is answered but none of these is chosen</option>
                      </select>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {q.answers.map(a => (
                          <label key={a} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={c.answers.includes(a)}
                              onChange={e =>
                                setCondition(i, {
                                  ...c,
                                  answers: e.target.checked ? [...c.answers, a] : c.answers.filter(x => x !== a),
                                })
                              }
                            />
                            {a}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                </div>
              )
            })}
            {mixed ? null : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setConditions(cs => [...cs, { questionKey: '', answers: [] }])}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {match === 'all' ? 'And another question' : 'Or another question'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Only chosen answers can raise an alert. Written answers need a person to read them.
            </p>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`${id}-owner`}>
                Task for
              </label>
              <select
                id={`${id}-owner`}
                className={fieldClass}
                value={ownerKey}
                onChange={e => setOwnerKey(e.target.value as AlertOwnerKey | '')}
              >
                {payload.owners.map(o => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                    {o.role ? ` (${o.role.name})` : ' (no role found)'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={`${id}-role`}>
                Or a role just for this alert
              </label>
              <select id={`${id}-role`} className={fieldClass} value={roleId} onChange={e => setRoleId(e.target.value)}>
                <option value="">Use the organisation’s role</option>
                {payload.roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={`${id}-days`}>
                Time to do it in
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id={`${id}-days`}
                  type="number"
                  min={unit === 'calendar' ? 1 : 0}
                  max={unit === 'calendar' ? 365 : 60}
                  className="w-24 rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={days}
                  onChange={e => setDays(Math.max(0, Math.min(unit === 'calendar' ? 365 : 60, Number(e.target.value) || 0)))}
                  aria-describedby={`${id}-days-hint`}
                />
                <label className="sr-only" htmlFor={`${id}-unit`}>
                  Day type
                </label>
                <select
                  id={`${id}-unit`}
                  className="flex-1 rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                  value={unit}
                  onChange={e => setUnit(e.target.value as 'working' | 'calendar')}
                >
                  <option value="working">working days</option>
                  <option value="calendar">calendar days</option>
                </select>
              </div>
              <p id={`${id}-days-hint`} className="mt-0.5 text-xs text-muted-foreground">
                {unit === 'calendar'
                  ? `${ruleTimescaleLabel({ dueWorkingDays: 0, dueCalendarDays: Math.max(1, days) })}, as a policy says it. Due on the last working day on or before.`
                  : `${timescaleLabel(days)} (0 = the same working day). Weekends and bank holidays are not counted.`}
              </p>
            </div>
            <div>
              <label className={labelClass} htmlFor={`${id}-record`}>
                May need a record
              </label>
              <select
                id={`${id}-record`}
                className={fieldClass}
                value={recordKind}
                onChange={e => setRecordKind(e.target.value as AlertRecordKind | '')}
              >
                <option value="">None</option>
                {(Object.keys(RECORD_LABELS) as AlertRecordKind[]).map(k => (
                  <option key={k} value={k}>
                    {RECORD_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {unlinkedPossible ? (
            <div>
              <label className={labelClass} htmlFor={`${id}-minimum`}>
                Answers given without a name: raise only if at least this many answered (optional)
              </label>
              <input
                id={`${id}-minimum`}
                type="number"
                min={5}
                max={100}
                className={fieldClass}
                value={minimumAnswers}
                onChange={e => setMinimumAnswers(e.target.value)}
                placeholder="The survey’s threshold (at least 5)"
                aria-describedby={`${id}-minimum-hint`}
                aria-invalid={minInvalid || undefined}
              />
              <p id={`${id}-minimum-hint`} className={`mt-0.5 text-xs ${minInvalid ? 'text-destructive' : 'text-muted-foreground'}`}>
                Grouped alerts from answers without a name come only when the survey closes. Use 10 for abuse,
                harassment or equality questions.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} />
              Urgent: tell the role straight away with a high-priority notification
            </label>
            {!payload.isAnonymous ? (
              <label className={`flex items-center gap-2 text-sm ${contactShape ? '' : 'text-muted-foreground'}`}>
                <input
                  type="checkbox"
                  checked={contactRequest && contactShape}
                  disabled={!contactShape}
                  onChange={e => setContactRequest(e.target.checked)}
                />
                Put it on the contact-me list (for “Would you like someone to contact you…” answered Yes)
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Alert is on
            </label>
          </div>

          <div>
            <label className={labelClass} htmlFor={`${id}-action`}>
              What to do (the task instructions)
            </label>
            <textarea
              id={`${id}-action`}
              rows={4}
              maxLength={4000}
              className={fieldClass}
              value={actionText}
              onChange={e => setActionText(e.target.value)}
              placeholder="e.g. Call the person within 5 working days to agree what we will do, and record any complaint the same day."
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${id}-when`}>
              When it applies, in words (optional)
            </label>
            <textarea
              id={`${id}-when`}
              rows={2}
              maxLength={2000}
              className={fieldClass}
              value={whenText}
              onChange={e => setWhenText(e.target.value)}
              placeholder="Left empty, CareFlow writes it from the questions and answers above."
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid || save.isPending} onClick={() => void submit()}>
            {save.isPending ? 'Saving…' : rule ? 'Save alert' : 'Add alert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Which role does each ready-made alert role's work in this organisation. */
function AlertRolesDialog({ payload, onClose }: { payload: SurveyAlertRulesPayload; onClose: () => void }) {
  const setRole = useSetOwnerRole()
  const setNever = useSetNeverRouteTo(payload.surveyId)
  const id = React.useId()
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Who handles survey alerts</DialogTitle>
          <DialogDescription>
            Ready-made surveys name roles like “Safeguarding lead”. Choose the role in your organisation that does
            each one. This applies to every survey; one alert can still be given to another role.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {payload.owners.map(o => (
            <div key={o.key} className="grid items-center gap-1 sm:grid-cols-[12rem_1fr]">
              <label className={labelClass} htmlFor={`${id}-${o.key}`}>
                {OWNER_LABELS[o.key]}
              </label>
              <div>
                <select
                  id={`${id}-${o.key}`}
                  className={fieldClass}
                  value={o.chosen ? (o.role?.id ?? '') : ''}
                  disabled={setRole.isPending}
                  onChange={e =>
                    void setRole
                      .mutateAsync({ ownerKey: o.key, roleId: e.target.value || null })
                      .then(() => toastSuccess('Saved'))
                      .catch((err: unknown) => toastApiError(err, 'Could not save'))
                  }
                >
                  <option value="">{!o.chosen && o.role ? `Usual role: ${o.role.name}` : 'Usual role (none found)'}</option>
                  {payload.roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {o.role && o.role.holders === 0 ? (
                  <p className="mt-0.5 text-xs text-destructive">No one has this role yet: survey managers are told instead.</p>
                ) : null}
              </div>
            </div>
          ))}
          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium text-foreground">This survey’s alerts never go to</legend>
            <p className="text-xs text-muted-foreground">
              Tick a role this survey asks people to rate (for example Care Coordinators on a survey about the
              rota). Its alerts then go to the next role up.
            </p>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {payload.owners.map(o => (
                <label key={o.key} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={payload.neverRouteTo.includes(o.key)}
                    disabled={setNever.isPending}
                    onChange={e =>
                      void setNever
                        .mutateAsync(
                          e.target.checked ? [...payload.neverRouteTo, o.key] : payload.neverRouteTo.filter(k => k !== o.key),
                        )
                        .then(() => toastSuccess('Saved'))
                        .catch((err: unknown) => toastApiError(err, 'Could not save'))
                    }
                  />
                  {OWNER_LABELS[o.key]}
                </label>
              ))}
            </div>
          </fieldset>
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
