import { cn } from '@/lib/utils'

const PRIMARY_GREEN = 'hsl(160 100% 25%)'
const OFF_TRACK = 'hsl(220 13% 90%)'
const OFF_TEXT = 'hsl(220 8% 46%)'

/**
 * Compact NO/YES pill with sliding knob.
 * ON (YES): primary green track, white knob left, "YES" on the right.
 * OFF (NO): neutral grey track, "NO" on the left, white knob on the right.
 */
export function NoYesToggle({
  value,
  onChange,
  labelOff = 'NO',
  labelOn = 'YES',
  id,
  disabled,
  className,
  activeTone = 'primary',
}: {
  value: boolean
  onChange: (v: boolean) => void
  labelOff?: string
  labelOn?: string
  id?: string
  disabled?: boolean
  className?: string
  /** `primary` = brand green (settings); `success` = brighter accent green. */
  activeTone?: 'primary' | 'success'
}) {
  const isOn = value === true

  const trackClass = isOn
    ? activeTone === 'success'
      ? '!border-success !bg-success !text-success-foreground'
      : '!border-[hsl(160,100%,25%)] !bg-[hsl(160,100%,25%)] !text-white'
    : '!border-border !bg-[hsl(220,13%,90%)] !text-[hsl(220,8%,46%)] dark:!bg-[hsl(220,13%,22%)] dark:!text-[hsl(210,10%,55%)]'

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={isOn}
      data-state={isOn ? 'on' : 'off'}
      aria-label={isOn ? labelOn : labelOff}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!isOn)
      }}
      style={
        isOn && activeTone === 'primary'
          ? { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN, color: '#fff' }
          : !isOn
            ? { backgroundColor: OFF_TRACK, color: OFF_TEXT }
            : undefined
      }
      className={cn(
        'inline-flex h-8 min-w-[62px] shrink-0 items-center justify-between overflow-hidden rounded-full border px-1',
        'text-[11px] font-bold transition-colors',
        trackClass,
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {isOn ? (
        <>
          <span className="h-6 w-6 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
          <span className="truncate pr-1.5">{labelOn}</span>
        </>
      ) : (
        <>
          <span className="truncate pl-1.5">{labelOff}</span>
          <span className="h-6 w-6 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
        </>
      )}
    </button>
  )
}
