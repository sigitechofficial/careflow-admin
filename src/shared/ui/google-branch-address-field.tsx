import * as React from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import type { PickedAddress } from '@/shared/lib/address-lookup'
import { AddressFinder } from '@/shared/ui/address-finder'

export type GoogleBranchAddressMeta = {
  city?: string
  country?: string
  postcode?: string
  addressLine1?: string
  addressLine2?: string
  county?: string
  /** From Google geometry; null when the place has none. */
  lat?: number | null
  lng?: number | null
}

type Props = {
  id?: string
  value: string
  /** `meta` is only passed when an address was picked (postcode list or Google); typing passes none. */
  onChange: (address: string, meta?: GoogleBranchAddressMeta) => void
  /** ISO country code(s) for Google search (e.g. 'gb'). */
  countryRestriction?: string | string[]
  disabled?: boolean
  placeholder?: string
  /** Kept for callers; the finder explains itself. */
  helpText?: string
  className?: string
  /** Postcode already known, for the postcode finder. */
  initialPostcode?: string
}

export function metaFromPicked(a: PickedAddress): GoogleBranchAddressMeta {
  return {
    city: a.town,
    country: a.country,
    postcode: a.postcode,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2,
    county: a.county,
    lat: a.latitude,
    lng: a.longitude,
  }
}

/**
 * One-line address with the address finder above it: find by postcode (default), search Google, or type it.
 * Works inside dialogs (no floating list for the postcode finder; Google's list is portaled).
 */
export function GoogleBranchAddressField({
  id,
  value,
  onChange,
  countryRestriction = 'gb',
  disabled,
  placeholder = 'House number, street, town',
  className,
  initialPostcode,
}: Props) {
  return (
    <div className={cn('space-y-2', className)}>
      <AddressFinder
        id={id ? `${id}-finder` : undefined}
        onPick={a => onChange(a.summary || [a.addressLine1, a.addressLine2, a.town].filter(Boolean).join(', '), metaFromPicked(a))}
        disabled={disabled}
        initialPostcode={initialPostcode}
        countryRestriction={countryRestriction}
      />
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="street-address"
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
