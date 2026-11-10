import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

/** Stands in for an empty value ("All branches", "First branch…"): the shared Select cannot use "". */
const EMPTY = '__none__'

export type ReferralSelectOption = { value: string; label: string }

/**
 * The project's Select for the referral inbox settings, used like a native select: string values,
 * and "" allowed for the "all / none" choice.
 */
export function ReferralSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  className,
  triggerClassName,
}: {
  value: string
  onChange: (value: string) => void
  options: ReferralSelectOption[]
  ariaLabel: string
  disabled?: boolean
  /** Text colour etc. for the chosen value (e.g. the outcome colours on the Rules tab). */
  className?: string
  triggerClassName?: string
}) {
  return (
    <Select value={value === '' ? EMPTY : value} onValueChange={(v) => onChange(v === EMPTY ? '' : v)} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className={cn('h-8 w-auto min-w-[10rem] gap-2 text-sm', triggerClassName, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || EMPTY} value={o.value === '' ? EMPTY : o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
