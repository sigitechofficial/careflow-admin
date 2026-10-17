import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { contentHelperClass, contentOverlineClass, contentTitleClass } from '@/shared/ui/content-section'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_MAX_DURATION_MINUTES } from '@/features/service-users/visit-plan/visit-plan-constants'
import {
  formatVisitPlanNightDuty,
  slotAllowsNightDuty,
} from '@/features/service-users/visit-plan/visit-plan-night-duty.util'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'

function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex text-sky-600" aria-label="More information">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function todayIsoDate(): string {
  return operationalTodayIso()
}

type Props = {
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (patch: Partial<VisitPlanSlot>) => void
}

export function VisitPlanSlotLifecyclePanel({ slot, disabled, onChange }: Props) {
  const isOneOff = slot.slotKind === 'ONE_OFF'
  const showNightDuty = slotAllowsNightDuty(slot)

  return (
    <section className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <h4 className={contentTitleClass}>Slot lifecycle & duration</h4>
        <p className={contentHelperClass}>
          When this call is active, how long it lasts, and optional backfill for past-visit catch-up.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {showNightDuty ? (
          <div>
            <Label className={contentOverlineClass}>Night type</Label>
            <p className="mt-2 text-sm text-foreground">{formatVisitPlanNightDuty(slot.nightDuty, 'Normal visit')}</p>
            <p className={cn('mt-1', contentHelperClass)}>Change it with Edit on the visit.</p>
          </div>
        ) : null}

        <div>
          <Label className={contentOverlineClass}>Duration (minutes)</Label>
          <Input
            type="number"
            min={1}
            max={VISIT_PLAN_MAX_DURATION_MINUTES}
            disabled={disabled}
            value={slot.durationMinutes ?? ''}
            placeholder="From start/end times"
            onChange={(e) =>
              onChange({
                durationMinutes: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>

        <div>
          <Label className={cn('flex items-center gap-1', contentOverlineClass)}>
            Start date
            <FieldHelp text="First day this slot generates visits. Defaults to today when first saved." />
          </Label>
          <Input
            type="date"
            disabled={disabled}
            value={slot.slotEffectiveFrom?.slice(0, 10) ?? todayIsoDate()}
            onChange={(e) => onChange({ slotEffectiveFrom: e.target.value || null })}
          />
        </div>

        <div>
          <Label className={cn('flex items-center gap-1', contentOverlineClass)}>
            End date
            <FieldHelp text="Last day this slot is active. Leave empty for open-ended." />
          </Label>
          <Input
            type="date"
            disabled={disabled}
            value={slot.slotEffectiveTo?.slice(0, 10) ?? ''}
            onChange={(e) => onChange({ slotEffectiveTo: e.target.value || null })}
          />
        </div>

        {isOneOff ? (
          <div>
            <Label className={contentOverlineClass}>One-off visit date</Label>
            <Input
              type="date"
              disabled={disabled}
              value={slot.oneOffDate?.slice(0, 10) ?? ''}
              onChange={(e) => onChange({ oneOffDate: e.target.value || null })}
            />
          </div>
        ) : null}

        <div>
          <Label className={cn('flex items-center gap-1', contentOverlineClass)}>
            Max backfill days
            <FieldHelp text="How many days before this call's Start Date may be created via Backfill past visits (0 = none)." />
          </Label>
          <Input
            type="number"
            min={0}
            max={14}
            disabled={disabled}
            value={slot.allowBackfillDays}
            onChange={(e) => onChange({ allowBackfillDays: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

    </section>
  )
}
