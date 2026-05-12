import { cn } from '@/lib/utils'

/**
 * Compact NO/YES pill with sliding knob (matches scheduling reports and service-user patterns).
 */
export function NoYesToggle({
  value,
  onChange,
  labelOff = 'NO',
  labelOn = 'YES',
  id,
  disabled,
  className,
}: {
  value: boolean
  onChange: (v: boolean) => void
  labelOff?: string
  labelOn?: string
  id?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!value)
      }}
      className={cn(
        'h-8 w-[62px] shrink-0 rounded-full border border-border px-1',
        'flex items-center justify-between text-[11px] font-bold transition-colors',
        value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {value ? (
        <>
          <span className="h-6 w-6 shrink-0 rounded-full bg-white/90 shadow-sm" aria-hidden />
          <span className="pr-1">{labelOn}</span>
        </>
      ) : (
        <>
          <span className="pl-1">{labelOff}</span>
          <span className="h-6 w-6 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
        </>
      )}
    </button>
  )
}
