import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { VisitPlanSlot, VisitPlanSlotExceptionType } from '@/features/service-users/visit-plan/types'
import { Button } from '@/shared/ui/button'
import { contentHelperClass, contentOverlineClass, contentTitleClass } from '@/shared/ui/content-section'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'

function todayIsoDate(): string {
  return operationalTodayIso()
}

type Props = {
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (patch: Partial<VisitPlanSlot>) => void
}

export function VisitPlanSlotExceptionsPanel({ slot, disabled, onChange }: Props) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className={contentTitleClass}>Date exceptions for {slot.label}</h4>
          <p className={contentHelperClass}>
            Skip or add this visit on specific dates only — other slots (e.g. Evening) on the same day are not
            affected.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onChange({
              exceptions: [
                ...slot.exceptions,
                {
                  exceptionDate: todayIsoDate(),
                  exceptionType: 'SKIP' as VisitPlanSlotExceptionType,
                  notes: '',
                },
              ],
            })
          }
        >
          Add exception
        </Button>
      </div>

      {slot.exceptions.length === 0 ? (
        <p className={contentHelperClass}>
          No exceptions — this visit follows the normal day pattern above.
        </p>
      ) : (
        <ul className="space-y-2">
          {slot.exceptions.map((ex, index) => (
            <li key={`${ex.exceptionDate}-${ex.exceptionType}-${index}`} className="flex flex-wrap items-end gap-2">
              <div>
                <Label className={contentOverlineClass}>Date</Label>
                <Input
                  type="date"
                  className="w-36"
                  disabled={disabled}
                  value={ex.exceptionDate}
                  onChange={(e) => {
                    const next = [...slot.exceptions]
                    next[index] = { ...ex, exceptionDate: e.target.value }
                    onChange({ exceptions: next })
                  }}
                />
              </div>
              <div>
                <Label className={contentOverlineClass}>Type</Label>
                <Select
                  value={ex.exceptionType}
                  disabled={disabled}
                  onValueChange={(v) => {
                    const next = [...slot.exceptions]
                    next[index] = { ...ex, exceptionType: v as VisitPlanSlotExceptionType }
                    onChange({ exceptions: next })
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKIP">Skip visit</SelectItem>
                    <SelectItem value="EXTRA">Extra visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange({ exceptions: slot.exceptions.filter((_, i) => i !== index) })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
