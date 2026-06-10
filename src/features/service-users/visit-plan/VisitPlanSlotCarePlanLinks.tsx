import { Checkbox } from '@/shared/ui/toggle-controls'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { cn } from '@/shared/lib/utils'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

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
      <p className="text-sm text-muted-foreground">
        Accept care plans on initial assessment to select services for this visit.
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
    <ul className="space-y-2">
      {acceptedCarePlans.map((cp) => {
        const checked = selected.has(cp.formId)
        return (
          <li
            key={cp.formId}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2.5',
              checked ? 'border-teal-300 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20' : 'border-border',
            )}
          >
            <Checkbox
              id={`${slot.slotCode}-cp-${cp.formId}`}
              checked={checked}
              disabled={disabled}
              onCheckedChange={() => toggle(cp.formId)}
            />
            <label
              htmlFor={`${slot.slotCode}-cp-${cp.formId}`}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
            >
              <StandardIconImage
                src={cp.pictureUrl}
                label={cp.formName}
                className="h-10 w-10 shrink-0"
                imgClassName="h-10 w-10"
              />
              <span className="text-sm font-medium">{cp.formName}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
