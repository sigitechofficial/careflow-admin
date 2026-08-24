import { cn } from '@/shared/lib/utils'

const PRIMARY_GREEN = 'hsl(160 100% 25%)'

/**
 * Compact NO/YES pill with sliding knob (legacy Care layout).
 * ON (YES): green track, "YES" on the left, white knob on the right.
 * OFF (NO): white track, white knob on the left, "NO" on the right.
 * Unanswered (`null`/`undefined`): neither side selected.
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
  value: boolean | null | undefined
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
  const unanswered = value == null

  if (unanswered) {
    return (
      <div
        id={id}
        role="group"
        aria-label="Yes or No"
        data-state="unanswered"
        data-testid="no-yes-toggle-unanswered"
        className={cn('inline-flex h-8 overflow-hidden rounded-full border border-border', className)}
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={false}
          className={cn(
            'min-w-[36px] px-2.5 text-[11px] font-bold text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          onClick={() => {
            if (!disabled) onChange(false)
          }}
        >
          {labelOff}
        </button>
        <span className="w-px self-stretch bg-border" aria-hidden />
        <button
          type="button"
          disabled={disabled}
          aria-pressed={false}
          className={cn(
            'min-w-[36px] px-2.5 text-[11px] font-bold text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          onClick={() => {
            if (!disabled) onChange(true)
          }}
        >
          {labelOn}
        </button>
      </div>
    )
  }

  const trackClass = isOn
    ? activeTone === 'success'
      ? '!border-success !bg-success !text-success-foreground'
      : '!border-[hsl(160,100%,25%)] !bg-[hsl(160,100%,25%)] !text-white'
    : '!border-border !bg-white !text-[hsl(220,8%,46%)] dark:!border-border dark:!bg-card dark:!text-[hsl(210,10%,55%)]'

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
            ? { backgroundColor: '#ffffff', color: 'hsl(220 8% 46%)' }
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
          <span className="truncate pl-1.5">{labelOn}</span>
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-white/40 bg-white shadow-sm"
            aria-hidden
          />
        </>
      ) : (
        <>
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-border/80 bg-white shadow-sm"
            aria-hidden
          />
          <span className="truncate pr-1.5">{labelOff}</span>
        </>
      )}
    </button>
  )
}
