import { Label } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { carePlanSuggestedForSlot } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'

type Props = {
  slot: VisitPlanSlot
  acceptedCarePlans: AcceptedCarePlanItem[]
  disabled?: boolean
  onChange: (linkedCarePlanFormIds: string[]) => void
}

export function VisitPlanSlotCarePlanLinks({
  slot,
  acceptedCarePlans,
  disabled,
  onChange,
}: Props) {
  if (acceptedCarePlans.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Accept care plans on initial assessment to link them to this visit.
      </p>
    )
  }

  const selected = new Set(slot.linkedCarePlanFormIds ?? [])

  const toggle = (formId: string) => {
    const next = new Set(selected)
    if (next.has(formId)) next.delete(formId)
    else next.add(formId)
    onChange([...next])
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-background p-4">
      <Label className="text-sm font-medium text-foreground">
        Which care plans are delivered on this visit?
      </Label>
      <p className="text-xs text-muted-foreground">
        Tick the clinical care plans carers should work through during this call. Leave all unchecked to use
        suggested links from the assessment.
      </p>
      <ul className="mt-2 space-y-2">
        {acceptedCarePlans.map((cp) => {
          const checked = selected.has(cp.formId)
          const suggested = carePlanSuggestedForSlot(cp, slot)
          return (
            <li
              key={cp.formId}
              className={cn(
                'flex items-start gap-3 rounded-md border px-3 py-2',
                checked ? 'border-teal-300 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20' : 'border-border',
              )}
            >
              <Checkbox
                id={`${slot.slotCode}-cp-${cp.formId}`}
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => toggle(cp.formId)}
                className="mt-0.5"
              />
              <label htmlFor={`${slot.slotCode}-cp-${cp.formId}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="text-sm font-medium">{cp.formName}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{cp.carePlanArea}</span>
                {!checked && suggested ? (
                  <span className="mt-1 inline-block text-[11px] text-sky-700 dark:text-sky-300">
                    Suggested for this call
                  </span>
                ) : null}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
