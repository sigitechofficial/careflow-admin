import { Checkbox } from '@/shared/ui/toggle-controls'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { cn } from '@/shared/lib/utils'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'

type Props = {
  options: AcceptedCarePlanItem[]
  selectedIds: string[]
  disabled?: boolean
  onChange: (selectedIds: string[]) => void
}

export function ScheduleJobDeliveredCarePlans({
  options,
  selectedIds,
  disabled,
  onChange,
}: Props) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No accepted care plans for this service user. Accept recommendations on initial assessment
        or link plans on the visit plan.
      </p>
    )
  }

  const selected = new Set(selectedIds)

  const toggle = (formId: string) => {
    const next = new Set(selected)
    if (next.has(formId)) next.delete(formId)
    else next.add(formId)
    onChange([...next])
  }

  return (
    <ul className="space-y-2">
      {options.map((cp) => {
        const checked = selected.has(cp.formId)
        return (
          <li
            key={cp.formId}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2.5',
              checked
                ? 'border-teal-300 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20'
                : 'border-border',
            )}
          >
            <Checkbox
              id={`schedule-complete-cp-${cp.formId}`}
              checked={checked}
              disabled={disabled}
              onCheckedChange={() => toggle(cp.formId)}
            />
            <label
              htmlFor={`schedule-complete-cp-${cp.formId}`}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
            >
              <StandardIconImage
                src={cp.pictureUrl}
                label={cp.formName}
                className="h-10 w-10 shrink-0"
                imgClassName="h-10 w-10"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{cp.formName}</span>
                {cp.carePlanArea ? (
                  <span className="block text-xs text-muted-foreground">{cp.carePlanArea}</span>
                ) : null}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
