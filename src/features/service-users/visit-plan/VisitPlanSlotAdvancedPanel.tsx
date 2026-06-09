import { Info } from 'lucide-react'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type { VisitPlanSlot, VisitPlanSlotCode } from '@/features/service-users/visit-plan/types'
import {
  VISIT_PLAN_ANALYSIS_AREAS,
  VISIT_PLAN_SCHEDULE_FREQUENCIES,
} from '@/features/service-users/visit-plan/visit-plan-constants'
import { VisitPlanMonthlyDaySection } from '@/features/service-users/visit-plan/VisitPlanMonthlyDaySection'
import { VisitPlanWeeklyDaySection } from '@/features/service-users/visit-plan/VisitPlanWeeklyDaySection'

function repeatUnitForFrequency(freq: VisitPlanSlot['scheduleFrequency']): VisitPlanSlot['repeatUnit'] {
  if (freq === 'MONTHLY') return 'MONTHS'
  if (freq === 'WEEKLY') return 'WEEKS'
  return 'DAYS'
}

function repeatUnitLabel(freq: VisitPlanSlot['scheduleFrequency']): string {
  if (freq === 'MONTHLY') return 'Months'
  if (freq === 'WEEKLY') return 'Weeks'
  return 'Days'
}

function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-sky-600 hover:text-sky-800 dark:text-sky-400"
            aria-label="More information"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function YesNoRow({
  id,
  checked,
  disabled,
  onChange,
  label,
  help,
}: {
  id: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  label: string
  help?: string
}) {
  return (
    <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        <span className="text-sm text-foreground">{label}</span>
        {help ? <FieldHelp text={help} /> : null}
      </div>
      <NoYesToggle
        id={id}
        value={checked}
        disabled={disabled}
        onChange={onChange}
        labelOff="NO"
        labelOn="YES"
        className="shrink-0"
      />
    </div>
  )
}

type Props = {
  slotCode: VisitPlanSlotCode
  slotLabel: string
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (patch: Partial<VisitPlanSlot>) => void
}

export function VisitPlanSlotAdvancedPanel({
  slotLabel,
  slot,
  disabled,
  onChange,
}: Props) {
  const unitLabel = repeatUnitLabel(slot.scheduleFrequency)

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configure: {slotLabel}
        </Label>
      </div>

      <section className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">When do you want to schedule the visit?</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">
              How often do you want to schedule the visits? <span className="text-red-600">*</span>
            </Label>
            <Select
              value={slot.scheduleFrequency}
              disabled={disabled}
              onValueChange={(v) => {
                const scheduleFrequency = v as VisitPlanSlot['scheduleFrequency']
                onChange({
                  scheduleFrequency,
                  repeatUnit: repeatUnitForFrequency(scheduleFrequency),
                })
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_PLAN_SCHEDULE_FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">
              Repeat every <span className="text-red-600">*</span>
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                disabled={disabled}
                value={slot.repeatEvery}
                onChange={(e) => onChange({ repeatEvery: Number(e.target.value) || 1 })}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">{unitLabel}</span>
            </div>
          </div>
        </div>

        {slot.scheduleFrequency === 'MONTHLY' ? (
          <VisitPlanMonthlyDaySection slot={slot} disabled={disabled} onChange={onChange} />
        ) : slot.scheduleFrequency === 'WEEKLY' ? (
          <VisitPlanWeeklyDaySection slot={slot} disabled={disabled} onChange={onChange} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Daily visits use the weekday checkboxes in the <strong>Call pattern</strong> grid above.
            Use &quot;Repeat every&quot; for every N days.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <YesNoRow
            id="time-critical"
            checked={slot.timeCritical}
            disabled={disabled}
            onChange={(timeCritical) => onChange({ timeCritical })}
            label="Time critical?"
            help="When enabled, visits should start within the tolerance window for compliance reporting."
          />
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Time tolerance (minutes)</Label>
              <FieldHelp text="Allowed minutes before/after the planned window before the visit is flagged." />
            </div>
            <Input
              type="number"
              min={0}
              max={240}
              disabled={disabled || !slot.timeCritical}
              value={slot.timeToleranceMinutes}
              onChange={(e) => onChange({ timeToleranceMinutes: Number(e.target.value) || 0 })}
              className="mt-1 w-24"
            />
          </div>
        </div>

        <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Link care plans and assign carers for each call in the <strong className="font-medium">Call pattern</strong>{' '}
          section above — morning, lunch, tea, and other visits can have separate carers.
        </p>

        <div>
          <Label className="text-xs text-muted-foreground">Time required</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            From / To are set in the call pattern grid above. Set expected visit duration here.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={480}
              placeholder="duration"
              disabled={disabled}
              value={slot.durationMinutes ?? ''}
              onChange={(e) =>
                onChange({
                  durationMinutes: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">Min</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted/10 p-4 space-y-1">
        <h4 className="mb-2 text-sm font-semibold text-foreground">Additional details</h4>

        <YesNoRow
          id="notes-required"
          checked={slot.notesRequired}
          disabled={disabled}
          onChange={(notesRequired) => onChange({ notesRequired })}
          label="Do you want to make the recording of notes mandatory?"
        />
        <YesNoRow
          id="photos-allowed"
          checked={slot.photoAllowed}
          disabled={disabled}
          onChange={(photoAllowed) => onChange({ photoAllowed })}
          label="Are photos allowed for this action?"
        />
        <YesNoRow
          id="share-family"
          checked={slot.shareOutcomeWithFamily}
          disabled={disabled}
          onChange={(shareOutcomeWithFamily) => onChange({ shareOutcomeWithFamily })}
          label="Do you want to share the outcome with the family?"
        />

        <div className="pt-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">
              Do you want this as part of an analysis area report?
            </Label>
            <FieldHelp text="Groups visit outcomes into the selected analysis report category." />
          </div>
          <Select
            value={slot.analysisArea ?? '__none__'}
            disabled={disabled}
            onValueChange={(v) => onChange({ analysisArea: v === '__none__' ? null : v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select analysis area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select analysis area</SelectItem>
              {VISIT_PLAN_ANALYSIS_AREAS.filter((a) => a.value).map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>
    </div>
  )
}
