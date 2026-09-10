import { Checkbox } from '@/shared/ui/toggle-controls'

type Props = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
}

/** Planner control: whether the carer must add a body-map mark before completing this task. */
export function VisitTaskBodyMapRequiredField({ checked, onCheckedChange, id }: Props) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
    >
      <Checkbox
        id={id}
        checked={checked}
        className="mt-0.5"
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-foreground">Body map required</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
          If ticked, the carer must mark the body map before this task can be saved. If not,
          the task can complete with or without a body-map mark.
        </span>
      </span>
    </label>
  )
}
