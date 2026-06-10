import * as React from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { MapView, type MapLocation } from '@/shared/ui/map'
import {
  countryRestrictionForRegion,
  PHOTON_SEARCH_REGION_OPTIONS,
  searchPhotonAddresses,
  type PhotonFeature,
  type PhotonSearchRegion,
} from '@/shared/lib/osm-photon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  formatAddressLines,
  parsePhotonFeature,
  type ParsedPostalAddress,
} from '@/shared/lib/parse-osm-address'

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
  /** Initial search region. Default: UK. */
  defaultSearchRegion?: PhotonSearchRegion
  /** When set, locks search to this country (hides region selector). */
  countryRestriction?: string | string[]
  className?: string
  children?: React.ReactNode
}

function coordsFromValue(value: AddressPlacesValue): { lat: number; lng: number } | null {
  const lat = Number(value.latitude)
  const lng = Number(value.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function featureLabel(feature: PhotonFeature): string {
  return parsePhotonFeature(feature).formattedAddress
}

function initialSearchRegion(
  defaultSearchRegion: PhotonSearchRegion | undefined,
  countryRestriction: string | string[] | undefined,
): PhotonSearchRegion {
  if (defaultSearchRegion) return defaultSearchRegion
  if (!countryRestriction) return 'gb'
  const code = (Array.isArray(countryRestriction) ? countryRestriction[0] : countryRestriction)
    ?.trim()
    .toLowerCase()
  if (code === 'ie') return 'ie'
  if (code === 'gb' || code === 'uk') return 'gb'
  return 'all'
}

export function AddressPlacesField({
  value,
  onChange,
  disabled,
  defaultSearchRegion,
  countryRestriction: lockedCountryRestriction,
  className,
  children,
}: Props) {
  const searchWrapRef = React.useRef<HTMLDivElement>(null)
  const regionLocked = lockedCountryRestriction != null
  const [searchRegion, setSearchRegion] = React.useState<PhotonSearchRegion>(() =>
    initialSearchRegion(defaultSearchRegion, lockedCountryRestriction),
  )
  const activeCountryRestriction = regionLocked
    ? lockedCountryRestriction
    : countryRestrictionForRegion(searchRegion)
  const regionLabel =
    PHOTON_SEARCH_REGION_OPTIONS.find((o) => o.id === searchRegion)?.label ?? 'United Kingdom'

  const [searchText, setSearchText] = React.useState('')
  const [suggestions, setSuggestions] = React.useState<PhotonFeature[]>([])
  const [searching, setSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)
  const [geocoding, setGeocoding] = React.useState(false)
  const [showMap, setShowMap] = React.useState(false)
  const [listOpen, setListOpen] = React.useState(false)

  const applyParsed = React.useCallback(
    (parsed: ParsedPostalAddress) => {
      onChange({
        addressLine1: parsed.addressLine1,
        addressLine2: parsed.addressLine2,
        town: parsed.town,
        county: parsed.county,
        country: parsed.country,
        postcode: parsed.postcode,
        latitude: parsed.latitude != null ? String(parsed.latitude) : '',
        longitude: parsed.longitude != null ? String(parsed.longitude) : '',
      })
      if (parsed.latitude != null && parsed.longitude != null) {
        setShowMap(true)
      }
    },
    [onChange],
  )

  const selectFeature = React.useCallback(
    (feature: PhotonFeature) => {
      const parsed = parsePhotonFeature(feature)
      applyParsed(parsed)
      setSearchText(parsed.formattedAddress)
      setSuggestions([])
      setListOpen(false)
      setSearchError(null)
    },
    [applyParsed],
  )

  React.useEffect(() => {
    if (disabled) return
    const q = searchText.trim()
    if (q.length < 3) {
      setSuggestions([])
      setSearching(false)
      return
    }

    setSearching(true)
    setSearchError(null)
    const timer = window.setTimeout(() => {
      void searchPhotonAddresses(q, { countryRestriction: activeCountryRestriction, limit: 8 })
        .then((hits) => {
          setSuggestions(hits)
          setListOpen(hits.length > 0)
        })
        .catch((e: unknown) => {
          setSuggestions([])
          setSearchError(e instanceof Error ? e.message : 'Address search failed')
        })
        .finally(() => setSearching(false))
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchText, disabled, activeCountryRestriction])

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setListOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const geocodeCurrentAddress = async () => {
    const query = formatAddressLines(value)
    if (!query.trim()) return
    setGeocoding(true)
    setSearchError(null)
    try {
      const hits = await searchPhotonAddresses(query, { countryRestriction: activeCountryRestriction, limit: 1 })
      if (!hits[0]) {
        throw new Error('Could not find that address on the map')
      }
      const parsed = parsePhotonFeature(hits[0])
      applyParsed(parsed)
      setSearchText(parsed.formattedAddress)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Geocoding failed')
    } finally {
      setGeocoding(false)
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
      <div className="rounded-lg border border-sky-200/80 bg-sky-50/40 p-4 dark:border-sky-900 dark:bg-sky-950/20">
        <Label htmlFor="address-places-search" className="text-sm font-medium text-foreground">
          Search address
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Search addresses on OpenStreetMap (free). Results are limited to{' '}
          {searchRegion === 'all' ? 'all countries' : regionLabel} so suggestions stay relevant for care
          visits. Pick a result, then confirm on the map.
        </p>
        {!regionLocked ? (
          <div className="mt-3 max-w-xs">
            <Label className="text-xs text-muted-foreground">Search region</Label>
            <Select
              value={searchRegion}
              onValueChange={(v) => setSearchRegion(v as PhotonSearchRegion)}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTON_SEARCH_REGION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div ref={searchWrapRef} className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="address-places-search"
            className="pl-9"
            placeholder="Search street address or postcode…"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setListOpen(true)
            }}
            onFocus={() => suggestions.length > 0 && setListOpen(true)}
            disabled={disabled}
            autoComplete="off"
            role="combobox"
            aria-expanded={listOpen}
            aria-autocomplete="list"
            data-testid="address-places-search"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
          {listOpen && suggestions.length > 0 ? (
            <ul
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
              role="listbox"
            >
              {suggestions.map((feature, index) => (
                <li key={`${feature.geometry.coordinates.join(',')}-${index}`} role="option">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectFeature(feature)}
                  >
                    {featureLabel(feature)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {searchText.trim().length > 0 && searchText.trim().length < 3 ? (
          <p className="mt-2 text-xs text-muted-foreground">Type at least 3 characters to search.</p>
        ) : null}
        {searchText.trim().length >= 3 && !searching && suggestions.length === 0 && !searchError ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No {searchRegion === 'all' ? '' : `${regionLabel} `}address matches — try a full street name
            or postcode
            {searchRegion === 'all' ? ', or change search region above' : ''}.
          </p>
        ) : null}
        {searchError ? <p className="mt-2 text-xs text-destructive">{searchError}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || geocoding || !formatAddressLines(value).trim()}
            onClick={() => void geocodeCurrentAddress()}
          >
            {geocoding ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-3.5 w-3.5" />
            )}
            Show on map
          </Button>
          {coords ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setShowMap((v) => !v)}
            >
              {showMap ? 'Hide map' : 'View map'}
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          © OpenStreetMap contributors · Search via{' '}
          <a
            href="https://photon.komoot.io/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Photon
          </a>
        </p>
      </div>

      {showMap && coords ? (
        <MapView
          locations={mapLocations}
          selectedId="address-preview"
          showList={false}
          overlayOnMap={false}
          height={480}
        />
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
          <Label className="text-sm font-medium">Postcode</Label>
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
