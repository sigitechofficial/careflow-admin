import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** One address the person picked, from the postcode list or Google. */
export type PickedAddress = {
  summary: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  country: string
  postcode: string
  latitude: number | null
  longitude: number | null
}

export type LookupAddress = PickedAddress & { id: string }

export type PostcodeAddresses = {
  postcode: string
  /** False when the address list isn't set up on the server: the postcode is found, the street is typed. */
  addressListAvailable: boolean
  addresses: LookupAddress[]
  area: { town: string; county: string; country: string; latitude: number | null; longitude: number | null } | null
}

/** How the person fills an address in. Postcode lookup is the default everywhere. */
export type AddressEntryMode = 'postcode' | 'google' | 'manual'

const FULL_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

export function tidyPostcode(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return compact.length < 5 ? compact : `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

export function isFullPostcode(raw: string): boolean {
  return FULL_POSTCODE.test(tidyPostcode(raw))
}

export async function suggestPostcodes(q: string, signal?: AbortSignal): Promise<string[]> {
  const res = await apiJson<ApiEnvelope<string[]>>(`/address-lookup/postcodes?q=${encodeURIComponent(q)}`, { signal })
  return res.data ?? []
}

export async function addressesForPostcode(postcode: string): Promise<PostcodeAddresses> {
  const res = await apiJson<ApiEnvelope<PostcodeAddresses>>(
    `/address-lookup/addresses?postcode=${encodeURIComponent(tidyPostcode(postcode))}`,
  )
  return res.data as PostcodeAddresses
}
