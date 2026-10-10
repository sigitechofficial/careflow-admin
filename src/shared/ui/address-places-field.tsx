import * as React from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPin, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { MapView, type MapLocation } from '@/shared/ui/map'
import { formatAddressLines } from '@/shared/lib/parse-osm-address'
import {
  extractPostcodeFromText,
  isGoogleMapsConfigured,
  loadGoogleMapsPlaces,
  parseGooglePlaceFormatted,
  type GoogleAutocompletePrediction,
  type GoogleGeocodeResult,
  type GooglePlaceResult,
} from '@/shared/lib/google-maps'

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
  /** ISO country code(s) to bias Places (e.g. 'gb'). Default: UK. */
  countryRestriction?: string | string[]
  coordinatesReadOnly?: boolean
  className?: string
  children?: React.ReactNode
}

function coordsFromValue(value: AddressPlacesValue): { lat: number; lng: number } | null {
  const lat = Number(value.latitude)
  const lng = Number(value.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function applyGooglePlace(
  place: GooglePlaceResult | GoogleGeocodeResult,
  onChange: (patch: Partial<AddressPlacesValue>) => void,
  options?: { preserveExistingPostcode?: boolean; existingPostcode?: string },
): { formattedAddress: string; postcode: string } {
  const parsed = parseGooglePlaceFormatted(place)
  const postcode =
    parsed.postcode ||
    (options?.preserveExistingPostcode ? options.existingPostcode?.trim() || '' : '')
  onChange({
    addressLine1: parsed.addressLine1,
    addressLine2: parsed.addressLine2,
    town: parsed.city,
    county: parsed.county,
    country: parsed.country,
    postcode,
    latitude: parsed.lat != null ? String(parsed.lat) : '',
    longitude: parsed.lng != null ? String(parsed.lng) : '',
  })
  return { formattedAddress: parsed.formattedAddress, postcode }
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
  const searchWrapRef = React.useRef<HTMLDivElement>(null)
  const inputWrapRef = React.useRef<HTMLDivElement>(null)
  const placesAttrRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const configured = isGoogleMapsConfigured()
  const [ready, setReady] = React.useState(false)
  const [searchText, setSearchText] = React.useState('')
  const [predictions, setPredictions] = React.useState<GoogleAutocompletePrediction[]>([])
  const [highlight, setHighlight] = React.useState(0)
  const [searching, setSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)
  const [geocoding, setGeocoding] = React.useState(false)
  const [showMap, setShowMap] = React.useState(false)
  const [listOpen, setListOpen] = React.useState(false)
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number; width: number } | null>(
    null,
  )

  const servicesRef = React.useRef<{
    autocomplete: {
      getPlacePredictions: (
        request: {
          input: string
          types?: string[]
          componentRestrictions?: { country: string | string[] }
        },
        callback: (
          predictions: GoogleAutocompletePrediction[] | null,
          status: string,
        ) => void,
      ) => void
    }
    places: {
      getDetails: (
        request: { placeId: string; fields: string[] },
        callback: (place: GooglePlaceResult | null, status: string) => void,
      ) => void
    }
    geocoder: {
      geocode: (
        request: {
          address?: string
          componentRestrictions?: { country: string | string[] }
        },
        callback: (results: GoogleGeocodeResult[] | null, status: string) => void,
      ) => void
    } | null
  } | null>(null)

  const country = React.useMemo(() => {
    if (Array.isArray(countryRestriction)) {
      return countryRestriction.map(c => c.toLowerCase())
    }
    return String(countryRestriction).toLowerCase()
  }, [countryRestriction])

  const updateMenuPos = React.useCallback(() => {
    const el = inputWrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  React.useEffect(() => {
    if (!configured || disabled) return
    let cancelled = false

    void loadGoogleMapsPlaces()
      .then(google => {
        if (cancelled) return
        const attr = placesAttrRef.current ?? document.createElement('div')
        servicesRef.current = {
          autocomplete: new google.maps.places.AutocompleteService(),
          places: new google.maps.places.PlacesService(attr),
          geocoder: google.maps.Geocoder ? new google.maps.Geocoder() : null,
        }
        setReady(true)
        setSearchError(null)
      })
      .catch(err => {
        if (cancelled) return
        setSearchError(err instanceof Error ? err.message : 'Google Places unavailable')
        setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [configured, disabled])

  React.useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (searchWrapRef.current?.contains(target) || listRef.current?.contains(target)) return
      setListOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  React.useEffect(() => {
    if (!listOpen) return
    updateMenuPos()
    const onScroll = () => updateMenuPos()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [listOpen, predictions.length, updateMenuPos])

  const fetchPredictions = React.useCallback(
    (input: string) => {
      const svc = servicesRef.current?.autocomplete
      if (!svc || input.trim().length < 3) {
        setPredictions([])
        setListOpen(false)
        return
      }
      setSearching(true)
      setSearchError(null)
      svc.getPlacePredictions(
        {
          input: input.trim(),
          // geocode covers streets + postcodes more reliably than address-only
          types: ['geocode'],
          componentRestrictions: { country },
        },
        (results, status) => {
          setSearching(false)
          if (status !== 'OK' || !results?.length) {
            setPredictions([])
            setListOpen(false)
            return
          }
          setPredictions(results)
          setHighlight(0)
          setListOpen(true)
          requestAnimationFrame(updateMenuPos)
        },
      )
    },
    [country, updateMenuPos],
  )

  const debouncedFetch = React.useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    return (input: string) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fetchPredictions(input), 220)
    }
  }, [fetchPredictions])

  const selectPrediction = React.useCallback(
    (prediction: GoogleAutocompletePrediction) => {
      const places = servicesRef.current?.places
      const geocoder = servicesRef.current?.geocoder
      // Immediate hint from suggestion text (often includes the postcode).
      const hintPc = extractPostcodeFromText(
        `${prediction.description} ${prediction.structured_formatting?.secondary_text ?? ''}`,
      )
      if (hintPc) onChange({ postcode: hintPc })

      if (!places) {
        setSearchText(prediction.description)
        setListOpen(false)
        setPredictions([])
        return
      }
      setSearching(true)
      places.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        },
        (place, status) => {
          if (status !== 'OK' || !place) {
            setSearching(false)
            setListOpen(false)
            setPredictions([])
            setSearchText(prediction.description)
            setSearchError('Could not load that address detail')
            return
          }

          const applied = applyGooglePlace(place, onChange, {
            preserveExistingPostcode: true,
            existingPostcode: hintPc,
          })
          setSearchText(applied.formattedAddress || prediction.description)
          setSearchError(null)
          if (place.geometry?.location) setShowMap(true)

          // Places details sometimes omit postal_code — geocode to fill secondary postcode.
          if (applied.postcode || !geocoder) {
            setSearching(false)
            setListOpen(false)
            setPredictions([])
            return
          }

          const query = applied.formattedAddress || prediction.description
          if (!query.trim()) {
            setSearching(false)
            setListOpen(false)
            setPredictions([])
            return
          }

          geocoder.geocode(
            {
              address: query,
              componentRestrictions: { country },
            },
            (results, geoStatus) => {
              setSearching(false)
              setListOpen(false)
              setPredictions([])
              if (geoStatus !== 'OK' || !results?.[0]) return
              const filled = applyGooglePlace(results[0], onChange, {
                preserveExistingPostcode: true,
                existingPostcode: applied.postcode || hintPc,
              })
              if (filled.formattedAddress) setSearchText(filled.formattedAddress)
              if (results[0].geometry?.location) setShowMap(true)
            },
          )
        },
      )
    },
    [country, onChange],
  )

  const geocodeCurrentAddress = async () => {
    const query = formatAddressLines(value)
    if (!query.trim()) return
    const geocoder = servicesRef.current?.geocoder
    if (!geocoder) {
      setSearchError(
        configured
          ? 'Google Geocoding is unavailable for this API key'
          : 'Add VITE_GOOGLE_MAPS_API_KEY to enable map lookup',
      )
      return
    }
    setGeocoding(true)
    setSearchError(null)
    geocoder.geocode(
      {
        address: query,
        componentRestrictions: { country },
      },
      (results, status) => {
        setGeocoding(false)
        if (status !== 'OK' || !results?.[0]) {
          setSearchError('Could not find that address on the map')
          return
        }
        const formatted = applyGooglePlace(results[0], onChange)
        setSearchText(formatted.formattedAddress)
        setShowMap(true)
      },
    )
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

  const menu =
    listOpen && predictions.length > 0 && menuPos
      ? createPortal(
          <ul
            ref={listRef}
            role="listbox"
            className="z-[200] max-h-56 overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-lg"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              pointerEvents: 'auto',
            }}
          >
            {predictions.map((p, index) => (
              <li key={p.place_id} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted',
                    index === highlight && 'bg-muted',
                  )}
                  onMouseDown={e => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    selectPrediction(p)
                  }}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {p.structured_formatting?.main_text ?? p.description}
                    </span>
                    {p.structured_formatting?.secondary_text ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.structured_formatting.secondary_text}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-lg border border-sky-200/80 bg-sky-50/40 p-4 dark:border-sky-900 dark:bg-sky-950/20">
        <Label htmlFor="address-places-search" className="text-sm font-medium text-foreground">
          Search address
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Search with Google Places (UK). Pick a suggestion to fill the address and{' '}
          {postcodeLabel.toLowerCase()}, then confirm on the map.
        </p>
        <div ref={searchWrapRef} className="relative mt-2">
          <div ref={placesAttrRef} className="hidden" aria-hidden />
          <div ref={inputWrapRef} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="address-places-search"
              className="pl-9"
              placeholder="Search street address or postcode…"
              value={searchText}
              onChange={e => {
                const next = e.target.value
                setSearchText(next)
                if (configured && ready && !disabled) debouncedFetch(next)
              }}
              onFocus={() => {
                if (predictions.length) {
                  updateMenuPos()
                  setListOpen(true)
                }
              }}
              onKeyDown={e => {
                if (!listOpen || predictions.length === 0) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHighlight(h => (h + 1) % predictions.length)
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlight(h => (h - 1 + predictions.length) % predictions.length)
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const item = predictions[highlight]
                  if (item) selectPrediction(item)
                } else if (e.key === 'Escape') {
                  setListOpen(false)
                }
              }}
              disabled={disabled}
              autoComplete="off"
              role="combobox"
              aria-expanded={listOpen}
              aria-autocomplete="list"
              data-testid="address-places-search"
            />
            {(configured && !ready && !searchError) || searching ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {menu}
        </div>
        {searchText.trim().length > 0 && searchText.trim().length < 3 ? (
          <p className="mt-2 text-xs text-muted-foreground">Type at least 3 characters to search.</p>
        ) : null}
        {!configured ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add <code className="text-[11px]">VITE_GOOGLE_MAPS_API_KEY</code> to enable address
            autocomplete. You can still type the address fields manually.
          </p>
        ) : null}
        {configured && searchText.trim().length >= 3 && !searching && predictions.length === 0 && !searchError ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No address matches — try a fuller street name or postcode.
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
              onClick={() => setShowMap(v => !v)}
            >
              {showMap ? 'Hide map' : 'View map'}
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Powered by Google Places</p>
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
