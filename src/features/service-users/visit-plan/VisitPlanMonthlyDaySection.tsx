import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import {
  VISIT_PLAN_MONTHLY_ORDINALS,
  VISIT_PLAN_WEEKDAY_NAMES,
} from '@/features/service-users/visit-plan/visit-plan-constants'

type Props = {
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (patch: Partial<VisitPlanSlot>) => void
}

export function VisitPlanMonthlyDaySection({ slot, disabled, onChange }: Props) {
  const toggleDom = (dom: number) => {
    const has = slot.monthlyDaysOfMonth.includes(dom)
    const monthlyDaysOfMonth = has
      ? slot.monthlyDaysOfMonth.filter((d) => d !== dom)
      : [...slot.monthlyDaysOfMonth, dom].sort((a, b) => a - b)
    onChange({ monthlyDaysOfMonth })
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground">On which days of the month?</p>

      <RadioGroup
        value={slot.monthlyDayMode}
        disabled={disabled}
        onValueChange={(v) => onChange({ monthlyDayMode: v as VisitPlanSlot['monthlyDayMode'] })}
        className="flex flex-wrap gap-6"
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <RadioGroupItem value="BY_DATE" id={`${slot.slotCode}-by-date`} />
          Select by day?
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <RadioGroupItem value="BY_PATTERN" id={`${slot.slotCode}-by-pattern`} />
          Select by pattern?
        </label>
      </RadioGroup>

      {slot.monthlyDayMode === 'BY_DATE' ? (
        <div>
          <Label className="text-xs text-muted-foreground">
            Click dates to include (e.g. 1st and 15th each month)
          </Label>
          <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-10">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((dom) => {
              const selected = slot.monthlyDaysOfMonth.includes(dom)
              return (
                <button
                  key={dom}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleDom(dom)}
                  className={cn(
                    'h-9 rounded border text-xs font-medium transition-colors',
                    selected
                      ? 'border-slate-600 bg-slate-500 text-white'
                      : 'border-border bg-muted/40 text-foreground hover:bg-muted',
                    disabled && 'opacity-50',
                  )}
                  aria-pressed={selected}
                >
                  {String(dom).padStart(2, '0')}
                </button>
              )
            })}
          </div>
          {slot.monthlyDaysOfMonth.length === 0 ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Select at least one day of the month before saving or generating rota.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Selected: {slot.monthlyDaysOfMonth.map((d) => String(d).padStart(2, '0')).join(', ')}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Occurrence</Label>
            <Select
              value={slot.monthlyPatternOrdinal ?? 'FIRST'}
              disabled={disabled}
              onValueChange={(v) =>
                onChange({ monthlyPatternOrdinal: v as VisitPlanSlot['monthlyPatternOrdinal'] })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_PLAN_MONTHLY_ORDINALS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Day of week</Label>
            <Select
              value={String(slot.monthlyPatternWeekday ?? 1)}
              disabled={disabled}
              onValueChange={(v) => onChange({ monthlyPatternWeekday: Number(v) })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_PLAN_WEEKDAY_NAMES.map((name, index) => (
                  <SelectItem key={name} value={String(index)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            e.g. First Monday, Last Friday of each repeat month.
          </p>
        </div>
      )}
    </div>
  )
}
