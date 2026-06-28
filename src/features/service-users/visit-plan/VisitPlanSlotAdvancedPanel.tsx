import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  contentHelperClass,
  contentKickerClass,
  contentOverlineClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
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
import { VISIT_PLAN_SCHEDULE_FREQUENCIES } from '@/features/service-users/visit-plan/visit-plan-constants'
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
        <Label className={contentKickerClass}>
          Configure: {slotLabel}
        </Label>
      </div>

      <section className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
        <h4 className={contentTitleClass}>When do you want to schedule the visit?</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className={contentOverlineClass}>
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
            <Label className={contentOverlineClass}>
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
          <VisitPlanWeeklyDaySection
            slot={slot}
            variant="weekly"
            disabled={disabled}
            onChange={onChange}
          />
        ) : (
          <VisitPlanWeeklyDaySection
            slot={slot}
            variant="daily"
            disabled={disabled}
            onChange={onChange}
          />
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
              <Label className={contentOverlineClass}>Time tolerance (minutes)</Label>
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

        <p className={cn('rounded-md border border-dashed border-border bg-muted/20 px-3 py-2', contentHelperClass)}>
          Link care plans and assign carers in the <strong className="font-medium">Call pattern</strong> table below.
          Recording options are in <strong className="font-medium">Additional details</strong> after the table.
        </p>
      </section>
    </div>
  )
}
