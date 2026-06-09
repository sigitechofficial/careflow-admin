import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'

type Props = {
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (patch: Partial<VisitPlanSlot>) => void
}

export function VisitPlanWeeklyDaySection({ slot, disabled, onChange }: Props) {
  const toggleDay = (day: number) => {
    const has = slot.daysOfWeek.includes(day)
    const daysOfWeek = has
      ? slot.daysOfWeek.filter((d) => d !== day)
      : [...slot.daysOfWeek, day].sort((a, b) => a - b)
    onChange({ daysOfWeek })
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground">On which days of the week?</p>
      <Label className="text-xs text-muted-foreground">
        Select the weekdays this visit repeats each week (every {slot.repeatEvery}{' '}
        {slot.repeatEvery === 1 ? 'week' : 'weeks'}).
      </Label>

      <div className="mt-2 flex flex-wrap gap-2">
        {VISIT_PLAN_DAY_LABELS.map((label, dayIndex) => {
          const selected = slot.daysOfWeek.includes(dayIndex)
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => toggleDay(dayIndex)}
              className={cn(
                'min-w-[3.25rem] rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                selected
                  ? 'border-slate-600 bg-slate-500 text-white'
                  : 'border-border bg-muted/40 text-foreground hover:bg-muted',
                disabled && 'opacity-50',
              )}
              aria-pressed={selected}
            >
              {label}
            </button>
          )
        })}
      </div>

      {slot.daysOfWeek.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Select at least one weekday before saving or generating rota.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Selected:{' '}
          {slot.daysOfWeek.map((d) => VISIT_PLAN_DAY_LABELS[d]).join(', ')}
        </p>
      )}
    </div>
  )
}
