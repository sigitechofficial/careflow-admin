import * as React from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useGeneralSettings, useUpdateGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { GeneralSettingsCard, SettingsNoYesToggle, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import type {
  AssessmentIntervalOverride,
  ComplianceReminderStage,
  ReviewSettings,
} from '@/features/settings/api/general-settings-api'
import { useAssessmentReviewSchedules } from '@/features/service-users/assessments/hooks/useServiceUserAssessments'
import { serviceUserAssessmentKeys } from '@/features/service-users/assessments/keys'
import type { AssessmentReviewScheduleRow } from '@/features/service-users/assessments/types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

const STAGES: Array<{ id: ComplianceReminderStage; label: string }> = [
  { id: 'EXPIRY_90_DAYS', label: '90 days before' },
  { id: 'EXPIRY_60_DAYS', label: '60 days before' },
  { id: 'EXPIRY_30_DAYS', label: '30 days before' },
  { id: 'EXPIRY_7_DAYS', label: '7 days before' },
  { id: 'EXPIRED', label: 'Once expired' },
]

type IntervalField = keyof AssessmentIntervalOverride

/** Whole-number input; empty = no value (placeholder shows the default). */
function DaysInput({
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled,
  label,
  unit = 'days',
}: {
  value: number | undefined
  onChange: (n: number | undefined) => void
  min: number
  max: number
  placeholder?: string
  disabled?: boolean
  label: string
  unit?: string
}) {
  const [text, setText] = React.useState(value == null ? '' : String(value))
  React.useEffect(() => setText(value == null ? '' : String(value)), [value])
  return (
    <span className="inline-flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        aria-label={label}
        className="h-9 w-20 text-center tabular-nums"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => {
          setText(e.target.value)
          if (!e.target.value.trim()) return onChange(undefined)
          const n = Number(e.target.value)
          if (Number.isInteger(n) && n >= min && n <= max) onChange(n)
        }}
        onBlur={() => setText(value == null ? '' : String(value))}
      />
      <span className="text-sm text-muted-foreground">{unit}</span>
    </span>
  )
}

function RequiredDays(props: {
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  disabled?: boolean
  label: string
  unit?: string
}) {
  return <DaysInput {...props} onChange={n => n != null && props.onChange(n)} />
}

function AssessmentSchedulesTable({
  rows,
  overrides,
  disabled,
  onChange,
}: {
  rows: AssessmentReviewScheduleRow[]
  overrides: Record<string, AssessmentIntervalOverride>
  disabled: boolean
  onChange: (key: string, next: AssessmentIntervalOverride | undefined) => void
}) {
  const setField = (row: AssessmentReviewScheduleRow, field: IntervalField, n: number | undefined) => {
    const next: AssessmentIntervalOverride = { ...overrides[row.key] }
    // Typing the built-in value back is the same as no override.
    if (n == null || n === row.builtIn[field]) delete next[field]
    else next[field] = n
    onChange(row.key, Object.keys(next).length ? next : undefined)
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] text-sm" aria-label="Assessment review schedules">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Assessment</th>
            <th className="px-3 py-2 font-medium">Review every</th>
            <th className="px-3 py-2 font-medium">When high risk</th>
            <th className="px-3 py-2 font-medium">Due soon from</th>
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const o = overrides[row.key] ?? {}
            const eventDriven = row.schedule.kind === 'event_driven'
            return (
              <tr key={row.key} className="border-t border-border" data-testid={`assessment-schedule-${row.key}`}>
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.schedule.guidanceSource}
                    {row.source === 'care_pathway_form' ? ' · Care Pathway form' : ''}
                  </div>
                </td>
                {eventDriven ? (
                  <td className="px-3 py-2 text-muted-foreground" colSpan={3}>
                    When something changes (no fixed date)
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      <DaysInput
                        value={o.defaultIntervalDays}
                        placeholder={String(row.builtIn.defaultIntervalDays ?? '')}
                        onChange={n => setField(row, 'defaultIntervalDays', n)}
                        min={1}
                        max={730}
                        disabled={disabled}
                        label={`${row.title}: review every`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {row.builtIn.elevatedRiskIntervalDays != null ? (
                        <DaysInput
                          value={o.elevatedRiskIntervalDays}
                          placeholder={String(row.builtIn.elevatedRiskIntervalDays)}
                          onChange={n => setField(row, 'elevatedRiskIntervalDays', n)}
                          min={1}
                          max={730}
                          disabled={disabled}
                          label={`${row.title}: review every, when high risk`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <DaysInput
                        value={o.dueSoonLeadDays}
                        placeholder={String(row.builtIn.dueSoonLeadDays ?? '')}
                        onChange={n => setField(row, 'dueSoonLeadDays', n)}
                        min={0}
                        max={90}
                        disabled={disabled}
                        label={`${row.title}: due soon from`}
                        unit="days before"
                      />
                    </td>
                  </>
                )}
                <td className="px-3 py-2 text-right">
                  {overrides[row.key] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Reset ${row.title} to the built-in schedule`}
                      title="Reset to the built-in schedule"
                      disabled={disabled}
                      onClick={() => onChange(row.key, undefined)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Settings → Reviews & reminders: review and expiry windows outside staff supervision, the
 * assessment review schedules, and the compliance / assessment reminder jobs. The API supplies
 * every value (defaults filled in) and the schedules; this screen only edits them.
 */
export function GeneralSettingsReviewsPanel() {
  const canEdit = useAuthStore(s => s.can('lookups.manage'))
  const qc = useQueryClient()
  const { data: settings, isLoading } = useGeneralSettings()
  const schedulesQuery = useAssessmentReviewSchedules()
  const update = useUpdateGeneralSettings()
  const saved = settings?.reviewSettings
  const [draft, setDraft] = React.useState<ReviewSettings | undefined>(saved)
  React.useEffect(() => setDraft(saved), [saved])

  if (isLoading || !draft || !saved) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const set = <K extends keyof ReviewSettings>(key: K, value: ReviewSettings[K]) =>
    setDraft(d => (d ? { ...d, [key]: value } : d))
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const off = !canEdit

  const onSave = async () => {
    try {
      await update.mutateAsync({ reviewSettings: draft })
      await qc.invalidateQueries({ queryKey: serviceUserAssessmentKeys.all() })
      toastSuccess('Saved', 'Review and reminder settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  const toggleStage = (stage: ComplianceReminderStage, on: boolean) => {
    const next = new Set(draft.complianceReminderStages)
    if (on) next.add(stage)
    else next.delete(stage)
    set(
      'complianceReminderStages',
      STAGES.map(s => s.id).filter(id => next.has(id)),
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-reviews-panel">
      <GeneralSettingsCard title="Reminders">
        <p className="text-sm text-muted-foreground">
          Applies to compliance and DBS expiry, service user assessment reviews and care plan reviews. Staff
          supervision has its own reminders under Supervision.
        </p>
        <SettingsRow label="Time they go out" hint="Organisation time zone (Settings → General). Care plan reminders go out each morning.">
          <Select value={String(draft.reminderHour)} onValueChange={v => set('reminderHour', Number(v))} disabled={off}>
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
        <SettingsRow
          label="Remind about an overdue review again every"
          hint="Care plans and assessments: one reminder when a review becomes due soon, one on the first overdue day, then again at this interval until it is done."
        >
          <RequiredDays value={draft.reminderRepeatDays} onChange={n => set('reminderRepeatDays', n)} min={1} max={90} disabled={off} label="Repeat overdue reminders every" />
        </SettingsRow>
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Compliance and DBS expiry">
        <SettingsRow label="Send expiry reminders" hint="To the employee's named supervisor and their branch managers.">
          <SettingsNoYesToggle value={draft.complianceRemindersEnabled} onChange={v => set('complianceRemindersEnabled', v)} disabled={off} />
        </SettingsRow>
        <div className="space-y-2">
          <span className="text-sm text-foreground">When</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label="Compliance reminder stages">
            {STAGES.map(stage => {
              const id = `compliance-stage-${stage.id}`
              return (
                <label key={stage.id} htmlFor={id} className="inline-flex items-center gap-2 text-sm">
                  <Checkbox
                    id={id}
                    checked={draft.complianceReminderStages.includes(stage.id)}
                    onCheckedChange={v => toggleStage(stage.id, v === true)}
                    disabled={off || !draft.complianceRemindersEnabled}
                  />
                  {stage.label}
                </label>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Each is sent once per expiry date. A record added close to its expiry gets only the latest one.
          </p>
        </div>
        <SettingsRow label="Remind the employee too (push to the carer app)">
          <SettingsNoYesToggle
            value={draft.complianceNotifyEmployee}
            onChange={v => set('complianceNotifyEmployee', v)}
            disabled={off || !draft.complianceRemindersEnabled}
          />
        </SettingsRow>
        <SettingsRow label="Email staff reminders too" hint="Supervisors and managers also get an email as well as the in-app notification.">
          <SettingsNoYesToggle
            value={draft.complianceEmailReminders}
            onChange={v => set('complianceEmailReminders', v)}
            disabled={off || !draft.complianceRemindersEnabled}
          />
        </SettingsRow>
        <p className="text-xs text-muted-foreground">
          The expiry date a new record starts with comes from each type's validity period (Compliance types, Skill
          types, Certification types).
        </p>
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Assessment reviews">
        <SettingsRow label="Send assessment review reminders" hint="To the service user's key worker, named nurse and branch managers.">
          <SettingsNoYesToggle value={draft.assessmentRemindersEnabled} onChange={v => set('assessmentRemindersEnabled', v)} disabled={off} />
        </SettingsRow>
        <p className="text-sm text-muted-foreground">
          Built-in intervals follow CQC / NICE guidance and show greyed out. Type a number to use your own; reviews are
          a reminder only and never stop staff completing an assessment early.
        </p>
        {schedulesQuery.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : schedulesQuery.data ? (
          <AssessmentSchedulesTable
            rows={schedulesQuery.data}
            overrides={draft.assessmentIntervals}
            disabled={off}
            onChange={(key, next) => {
              const all = { ...draft.assessmentIntervals }
              if (next) all[key] = next
              else delete all[key]
              set('assessmentIntervals', all)
            }}
          />
        ) : (
          <p className="text-sm text-destructive">Could not load the assessment schedules.</p>
        )}
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Care plans">
        <p className="text-sm text-muted-foreground">
          How often each care plan is reviewed is set on its form (Care Pathway → Form builder → Review frequency).
        </p>
        <SettingsRow label='Show a care plan as "Due soon" from' hint="On the care plan, the review queue and reminders.">
          <RequiredDays value={draft.carePlanDueSoonDays} onChange={n => set('carePlanDueSoonDays', n)} min={1} max={180} disabled={off} label="Care plan due soon from" unit="days before" />
        </SettingsRow>
        <SettingsRow label="Service user list: amber care plan icon from" hint="The care plan icon on the service user list turns amber when a review is due within this many days.">
          <RequiredDays value={draft.carePlanListDueWithinDays} onChange={n => set('carePlanListDueWithinDays', n)} min={1} max={90} disabled={off} label="Care plan list amber from" unit="days before" />
        </SettingsRow>
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Initial assessment risks">
        <p className="text-sm text-muted-foreground">First review date of a risk, by its level. Staff can change it on each risk.</p>
        {(['HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
          <SettingsRow key={level} label={`${level.charAt(0)}${level.slice(1).toLowerCase()} risk: review after`}>
            <RequiredDays
              value={draft.riskReviewDays[level]}
              onChange={n => set('riskReviewDays', { ...draft.riskReviewDays, [level]: n })}
              min={1}
              max={365}
              disabled={off}
              label={`${level} risk review after`}
            />
          </SettingsRow>
        ))}
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Visit plans">
        <SettingsRow label="First review of a plan made from an initial assessment" hint="The review date set on a visit plan drafted from an approved initial assessment.">
          <RequiredDays value={draft.visitPlanFirstReviewDays} onChange={n => set('visitPlanFirstReviewDays', n)} min={1} max={365} disabled={off} label="Visit plan first review after" />
        </SettingsRow>
        <SettingsRow label="Review a suspended plan after" hint='Default "Review suspension by" date when a visit plan is paused.'>
          <RequiredDays value={draft.visitPlanSuspensionReviewDays} onChange={n => set('visitPlanSuspensionReviewDays', n)} min={1} max={90} disabled={off} label="Suspension review after" />
        </SettingsRow>
      </GeneralSettingsCard>

      <GeneralSettingsCard title="Medication dashboard">
        <SettingsRow label="Courses ending and pack reviews within">
          <RequiredDays value={draft.medicationDueSoonDays} onChange={n => set('medicationDueSoonDays', n)} min={1} max={90} disabled={off} label="Medication due soon within" />
        </SettingsRow>
        <SettingsRow label="Medication reviews due soon within">
          <RequiredDays value={draft.medicationReviewDueSoonDays} onChange={n => set('medicationReviewDueSoonDays', n)} min={1} max={180} disabled={off} label="Medication review due soon within" />
        </SettingsRow>
      </GeneralSettingsCard>

      {canEdit ? (
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card/95 py-3 backdrop-blur">
          <Button type="button" variant="outline" disabled={!dirty || update.isPending} onClick={() => setDraft(saved)}>
            Discard changes
          </Button>
          <Button type="button" disabled={!dirty || update.isPending} onClick={() => void onSave()}>
            {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      ) : null}
    </div>
  )
}
