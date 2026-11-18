import * as React from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPin, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import {
  extractPostcodeFromText,
  isGoogleMapsConfigured,
  loadGoogleMapsPlaces,
  parseGooglePlaceFormatted,
  type GoogleAutocompletePrediction,
  type GoogleGeocodeResult,
  type GooglePlaceResult,
} from '@/shared/lib/google-maps'
import type { PickedAddress } from '@/shared/lib/address-lookup'

type Services = {
  autocomplete: {
    getPlacePredictions: (
      request: { input: string; types?: string[]; componentRestrictions?: { country: string | string[] } },
      callback: (predictions: GoogleAutocompletePrediction[] | null, status: string) => void,
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
      request: { address?: string; componentRestrictions?: { country: string | string[] } },
      callback: (results: GoogleGeocodeResult[] | null, status: string) => void,
    ) => void
  } | null
}

export function pickedFromGoogle(place: GooglePlaceResult | GoogleGeocodeResult, fallbackPostcode = ''): PickedAddress {
  const p = parseGooglePlaceFormatted(place)
  return {
    summary: p.formattedAddress,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    town: p.city,
    county: p.county,
    country: p.country,
    postcode: p.postcode || fallbackPostcode,
    latitude: p.lat ?? null,
    longitude: p.lng ?? null,
  }
}

type Props = {
  onPick: (address: PickedAddress) => void
  disabled?: boolean
  countryRestriction?: string | string[]
  id?: string
}

/** Google Places search (street or place name). The list floats in a portal so it works inside dialogs. */
export function GoogleAddressSearch({ onPick, disabled, countryRestriction = 'gb', id = 'google-address-search' }: Props) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const inputWrapRef = React.useRef<HTMLDivElement>(null)
  const attrRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const servicesRef = React.useRef<Services | null>(null)
  const configured = isGoogleMapsConfigured()
  const [ready, setReady] = React.useState(false)
  const [text, setText] = React.useState('')
  const [predictions, setPredictions] = React.useState<GoogleAutocompletePrediction[]>([])
  const [highlight, setHighlight] = React.useState(0)
  const [searching, setSearching] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const country = React.useMemo(
    () => (Array.isArray(countryRestriction) ? countryRestriction.map(c => c.toLowerCase()) : String(countryRestriction).toLowerCase()),
    [countryRestriction],
  )

  const updateMenuPos = React.useCallback(() => {
    const rect = inputWrapRef.current?.getBoundingClientRect()
    if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [])

  React.useEffect(() => {
    if (!configured || disabled) return
    let cancelled = false
    void loadGoogleMapsPlaces()
      .then(google => {
        if (cancelled) return
        servicesRef.current = {
          autocomplete: new google.maps.places.AutocompleteService(),
          places: new google.maps.places.PlacesService(attrRef.current ?? document.createElement('div')),
          geocoder: google.maps.Geocoder ? new google.maps.Geocoder() : null,
        }
        setReady(true)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Google search is unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [configured, disabled])

  React.useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const t = event.target as Node
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  React.useEffect(() => {
    if (!open) return
    updateMenuPos()
    window.addEventListener('resize', updateMenuPos)
    window.addEventListener('scroll', updateMenuPos, true)
    return () => {
      window.removeEventListener('resize', updateMenuPos)
      window.removeEventListener('scroll', updateMenuPos, true)
    }
  }, [open, updateMenuPos])

  const debounced = React.useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    return (input: string) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const svc = servicesRef.current?.autocomplete
        if (!svc || input.trim().length < 3) {
          setPredictions([])
          setOpen(false)
          return
        }
        setSearching(true)
        svc.getPlacePredictions({ input: input.trim(), types: ['geocode'], componentRestrictions: { country } }, (results, status) => {
          setSearching(false)
          const list = status === 'OK' && results?.length ? results : []
          setPredictions(list)
          setHighlight(0)
          setOpen(list.length > 0)
        })
      }, 220)
    }
  }, [country])

  const select = (prediction: GoogleAutocompletePrediction) => {
    const svc = servicesRef.current
    const hintPc = extractPostcodeFromText(`${prediction.description} ${prediction.structured_formatting?.secondary_text ?? ''}`) ?? ''
    setOpen(false)
    setPredictions([])
    setText(prediction.description)
    if (!svc) return
    setSearching(true)
    svc.places.getDetails(
      { placeId: prediction.place_id, fields: ['address_components', 'formatted_address', 'geometry', 'name'] },
      (place, status) => {
        if (status !== 'OK' || !place) {
          setSearching(false)
          setError('Could not load that address. Try another, or type it.')
          return
        }
        const picked = pickedFromGoogle(place, hintPc)
        setError(null)
        // Google sometimes leaves the postcode out of place details: look the address up once more.
        if (picked.postcode || !svc.geocoder) {
          setSearching(false)
          onPick(picked)
          return
        }
        svc.geocoder.geocode({ address: picked.summary || prediction.description, componentRestrictions: { country } }, (results, geoStatus) => {
          setSearching(false)
          onPick(geoStatus === 'OK' && results?.[0] ? { ...picked, postcode: pickedFromGoogle(results[0]).postcode } : picked)
        })
      },
    )
  }

  if (!configured) {
    return (
      <p className="text-xs text-muted-foreground">
        Google search isn&apos;t set up here (no Google Maps key). Use the postcode, or type the address.
      </p>
    )
  }

  const menu =
    open && predictions.length > 0 && menuPos
      ? createPortal(
          <ul
            ref={listRef}
            role="listbox"
            className="z-[200] max-h-56 overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-lg"
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, pointerEvents: 'auto' }}
          >
            {predictions.map((p, index) => (
              <li key={p.place_id} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  className={cn('flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted', index === highlight && 'bg-muted')}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => select(p)}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.structured_formatting?.main_text ?? p.description}</span>
                    {p.structured_formatting?.secondary_text ? (
                      <span className="block truncate text-xs text-muted-foreground">{p.structured_formatting.secondary_text}</span>
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
    <div ref={wrapRef} className="space-y-1.5">
      <div ref={attrRef} className="hidden" aria-hidden />
      <div ref={inputWrapRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          className="pl-9"
          placeholder="Search a street, place or postcode…"
          value={text}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onChange={e => {
            setText(e.target.value)
            if (ready && !disabled) debounced(e.target.value)
          }}
          onFocus={() => predictions.length && setOpen(true)}
          onKeyDown={e => {
            if (!open || !predictions.length) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight(h => (h + 1) % predictions.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight(h => (h - 1 + predictions.length) % predictions.length)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const item = predictions[highlight]
              if (item) select(item)
            } else if (e.key === 'Escape') setOpen(false)
          }}
          data-testid="google-address-search"
        />
        {(!ready && !error) || searching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {menu}
      {error ? <p className="text-xs text-destructive">{error}</p> : <p className="text-[10px] text-muted-foreground">Powered by Google</p>}
    </div>
  )
}
