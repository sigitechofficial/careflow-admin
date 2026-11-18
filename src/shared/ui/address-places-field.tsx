import * as React from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { MapView, type MapLocation } from '@/shared/ui/map'
import { formatAddressLines } from '@/shared/lib/parse-osm-address'
import { isGoogleMapsConfigured, loadGoogleMapsPlaces, type GoogleGeocodeResult } from '@/shared/lib/google-maps'
import type { PickedAddress } from '@/shared/lib/address-lookup'
import { AddressFinder } from '@/shared/ui/address-finder'
import { pickedFromGoogle } from '@/shared/ui/google-address-search'

export type AddressPlacesValue = {
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  country: string
  postcode: string
  latitude: string
  longitude: string
}

type Props = {
  value: AddressPlacesValue
  onChange: (patch: Partial<AddressPlacesValue>) => void
  disabled?: boolean
  /** Label for the postcode field. Default: "Postcode". */
  postcodeLabel?: string
  /** ISO country code for Google search and map lookups (e.g. 'gb'). Default: UK. */
  countryRestriction?: string
  coordinatesReadOnly?: boolean
  className?: string
  children?: React.ReactNode
}

function coordsFromValue(value: AddressPlacesValue): { lat: number; lng: number } | null {
  // Empty boxes are no position (Number('') is 0, which would put the address in the Atlantic).
  if (!String(value.latitude ?? '').trim() || !String(value.longitude ?? '').trim()) return null
  const lat = Number(value.latitude)
  const lng = Number(value.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null
  return { lat, lng }
}

export function AddressPlacesField({
  value,
  onChange,
  disabled,
  postcodeLabel = 'Postcode',
  countryRestriction = 'gb',
  coordinatesReadOnly,
  className,
  children,
}: Props) {
  const configured = isGoogleMapsConfigured()
  const [geocoding, setGeocoding] = React.useState(false)
  const [mapError, setMapError] = React.useState<string | null>(null)
  const [showMap, setShowMap] = React.useState(false)

  const pick = (a: PickedAddress) => {
    onChange({
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2,
      town: a.town,
      county: a.county,
      country: a.country,
      postcode: a.postcode,
      latitude: a.latitude != null ? String(a.latitude) : '',
      longitude: a.longitude != null ? String(a.longitude) : '',
    })
    setMapError(null)
    if (a.latitude != null && a.longitude != null) setShowMap(true)
  }

  /** Typed by hand: find it on the map with Google. */
  const geocodeCurrentAddress = async () => {
    const query = formatAddressLines(value)
    if (!query.trim()) return
    if (!configured) {
      setMapError('Google Maps isn’t set up here, so a typed address can’t be placed on the map. Use Find by postcode instead.')
      return
    }
    setGeocoding(true)
    setMapError(null)
    try {
      const google = await loadGoogleMapsPlaces()
      if (!google.maps.Geocoder) throw new Error('Google Geocoding is unavailable for this key')
      new google.maps.Geocoder().geocode(
        { address: query, componentRestrictions: { country: countryRestriction } },
        (results: GoogleGeocodeResult[] | null, status: string) => {
          setGeocoding(false)
          if (status !== 'OK' || !results?.[0]) {
            setMapError('Could not find that address on the map')
            return
          }
          const found = pickedFromGoogle(results[0], value.postcode)
          onChange({ latitude: found.latitude != null ? String(found.latitude) : '', longitude: found.longitude != null ? String(found.longitude) : '' })
          setShowMap(true)
        },
      )
    } catch (e) {
      setGeocoding(false)
      setMapError(e instanceof Error ? e.message : 'Could not find that address on the map')
    }
  }

  const coords = coordsFromValue(value)
  const mapLocations: MapLocation[] = coords
    ? [
        {
          id: 'address-preview',
          name: 'Service address',
          address: formatAddressLines(value),
          lat: coords.lat,
          lng: coords.lng,
          type: 'service-user',
        },
      ]
    : []

  const setField =
    (key: keyof AddressPlacesValue) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [key]: e.target.value })
    }

  return (
    <div className={cn('space-y-4', className)}>
      <AddressFinder
        onPick={pick}
        disabled={disabled}
        initialPostcode={value.postcode}
        countryRestriction={countryRestriction}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || geocoding || !formatAddressLines(value).trim()}
          onClick={() => void geocodeCurrentAddress()}
        >
          {geocoding ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-2 h-3.5 w-3.5" />}
          Show on map
        </Button>
        {coords ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setShowMap(v => !v)}>
            {showMap ? 'Hide map' : 'View map'}
          </Button>
        ) : null}
      </div>
      {mapError ? <p className="text-xs text-destructive">{mapError}</p> : null}

      {showMap && coords ? (
        <MapView locations={mapLocations} selectedId="address-preview" showList={false} overlayOnMap={false} height={480} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label className="text-sm font-medium">Address line 1</Label>
          <Input
            data-testid="service-user-address-line1"
            className="mt-1.5"
            value={value.addressLine1}
            onChange={setField('addressLine1')}
            disabled={disabled}
            autoComplete="address-line1"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-sm font-medium">Address line 2</Label>
          <Input
            className="mt-1.5"
            value={value.addressLine2}
            onChange={setField('addressLine2')}
            disabled={disabled}
            autoComplete="address-line2"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Town</Label>
          <Input
            data-testid="service-user-town"
            className="mt-1.5"
            value={value.town}
            onChange={setField('town')}
            disabled={disabled}
            autoComplete="address-level2"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">County</Label>
          <Input
            className="mt-1.5"
            value={value.county}
            onChange={setField('county')}
            disabled={disabled}
            autoComplete="address-level1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Country</Label>
          <Input
            className="mt-1.5"
            value={value.country}
            onChange={setField('country')}
            disabled={disabled}
            autoComplete="country-name"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">{postcodeLabel}</Label>
          <Input
            data-testid="service-user-postcode"
            className="mt-1.5"
            value={value.postcode}
            onChange={setField('postcode')}
            disabled={disabled}
            autoComplete="postal-code"
          />
        </div>
        {coords ? (
          <div className="md:col-span-2 text-xs text-muted-foreground">
            Map coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </div>
        ) : null}
        <div>
          <Label className="text-sm font-medium">Latitude</Label>
          <Input
            className="mt-1.5"
            inputMode="decimal"
            placeholder="e.g. 51.454514"
            value={value.latitude}
            onChange={setField('latitude')}
            disabled={disabled || coordinatesReadOnly}
            readOnly={coordinatesReadOnly}
            autoComplete="off"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Longitude</Label>
          <Input
            className="mt-1.5"
            inputMode="decimal"
            placeholder="e.g. -2.587910"
            value={value.longitude}
            onChange={setField('longitude')}
            disabled={disabled || coordinatesReadOnly}
            readOnly={coordinatesReadOnly}
            autoComplete="off"
          />
        </div>
      </div>

      {children}
    </div>
  )
}

export function emptyAddressPlacesValue(): AddressPlacesValue {
  return {
    addressLine1: '',
    addressLine2: '',
    town: '',
    county: '',
    country: '',
    postcode: '',
    latitude: '',
    longitude: '',
  }
}
