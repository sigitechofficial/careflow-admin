import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import type { AddressEntryMode, PickedAddress } from '@/shared/lib/address-lookup'
import { PostcodeAddressFinder } from '@/shared/ui/postcode-address-finder'
import { GoogleAddressSearch } from '@/shared/ui/google-address-search'

const MODES: { value: AddressEntryMode; label: string }[] = [
  { value: 'postcode', label: 'Find by postcode' },
  { value: 'google', label: 'Search Google' },
  { value: 'manual', label: 'Type it myself' },
]

type Props = {
  onPick: (address: PickedAddress) => void
  disabled?: boolean
  /** Postcode already on the record (the postcode finder starts from it). */
  initialPostcode?: string
  /** Default: postcode lookup. */
  defaultMode?: AddressEntryMode
  countryRestriction?: string | string[]
  /** Heading above the three choices. */
  title?: string
  className?: string
  id?: string
}

/**
 * Every address form starts here: find the address by postcode (default), search Google, or type it.
 * Picking an address fills the form's own address boxes through `onPick`; they stay editable.
 */
export function AddressFinder({
  onPick,
  disabled,
  initialPostcode,
  defaultMode = 'postcode',
  countryRestriction,
  title = 'Find the address',
  className,
  id = 'address-finder',
}: Props) {
  const [mode, setMode] = React.useState<AddressEntryMode>(defaultMode)
  return (
    <div
      className={cn('rounded-lg border border-sky-200/80 bg-sky-50/40 p-3 dark:border-sky-900 dark:bg-sky-950/20', className)}
      data-testid="address-finder"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div role="radiogroup" aria-label="How to enter the address" className="inline-flex rounded-md border border-border bg-background p-0.5">
          {MODES.map(m => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              disabled={disabled}
              onClick={() => setMode(m.value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                mode === m.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2.5">
        {mode === 'postcode' ? (
          <PostcodeAddressFinder id={`${id}-postcode`} onPick={onPick} disabled={disabled} initialPostcode={initialPostcode} />
        ) : mode === 'google' ? (
          <GoogleAddressSearch id={`${id}-google`} onPick={onPick} disabled={disabled} countryRestriction={countryRestriction} />
        ) : (
          <p className="text-xs text-muted-foreground">Type the address in the boxes below.</p>
        )}
      </div>
    </div>
  )
}
