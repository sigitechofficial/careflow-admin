import * as React from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import {
  isGoogleMapsConfigured,
  loadGoogleMapsPlaces,
  parseGooglePlaceFormatted,
  type GoogleAutocompletePrediction,
} from '@/shared/lib/google-maps'

type Props = {
  id?: string
  value: string
  onChange: (address: string, meta?: { city?: string; country?: string; postcode?: string }) => void
  /** ISO country code(s) to bias Places (e.g. 'gb'). */
  countryRestriction?: string | string[]
  disabled?: boolean
  placeholder?: string
  className?: string
}

/**
 * Branch address field using Google Places AutocompleteService + a React dropdown
 * (portaled), so selections work inside Radix dialogs.
 */
export function GoogleBranchAddressField({
  id,
  value,
  onChange,
  countryRestriction = 'gb',
  disabled,
  placeholder = 'Start typing an address…',
  className,
}: Props) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const inputWrapRef = React.useRef<HTMLDivElement>(null)
  const placesAttrRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const [ready, setReady] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [searching, setSearching] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [predictions, setPredictions] = React.useState<GoogleAutocompletePrediction[]>([])
  const [highlight, setHighlight] = React.useState(0)
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number; width: number } | null>(
    null,
  )
  const configured = isGoogleMapsConfigured()

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
        callback: (
          place: Parameters<typeof parseGooglePlaceFormatted>[0] | null,
          status: string,
        ) => void,
      ) => void
    }
  } | null>(null)

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
        }
        setReady(true)
        setError(null)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Google Places unavailable')
        setReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [configured, disabled])

  React.useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (wrapRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  React.useEffect(() => {
    if (!open) return
    updateMenuPos()
    const onScroll = () => updateMenuPos()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, predictions.length, updateMenuPos])

  const country = React.useMemo(() => {
    if (Array.isArray(countryRestriction)) {
      return countryRestriction.map(c => c.toLowerCase())
    }
    return countryRestriction.toLowerCase()
  }, [countryRestriction])

  const fetchPredictions = React.useCallback(
    (input: string) => {
      const svc = servicesRef.current?.autocomplete
      if (!svc || input.trim().length < 2) {
        setPredictions([])
        setOpen(false)
        return
      }
      setSearching(true)
      svc.getPlacePredictions(
        {
          input: input.trim(),
          types: ['geocode'],
          componentRestrictions: { country },
        },
        (results, status) => {
          setSearching(false)
          if (status !== 'OK' || !results?.length) {
            setPredictions([])
            setOpen(false)
            return
          }
          setPredictions(results)
          setHighlight(0)
          setOpen(true)
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
      if (!places) {
        onChange(prediction.description)
        setOpen(false)
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
          setSearching(false)
          setOpen(false)
          setPredictions([])
          if (status !== 'OK' || !place) {
            onChange(prediction.description)
            return
          }
          const parsed = parseGooglePlaceFormatted(place)
          onChange(parsed.formattedAddress || prediction.description, {
            city: parsed.city || undefined,
            country: parsed.country || undefined,
            postcode: parsed.postcode || undefined,
          })
        },
      )
    },
    [onChange],
  )

  const menu =
    open && predictions.length > 0 && menuPos
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
              // Radix modal sets pointer-events:none on body; restore for this portal.
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
    <div ref={wrapRef} className={cn('relative space-y-1.5', className)}>
      <div ref={placesAttrRef} className="hidden" aria-hidden />
      <div ref={inputWrapRef} className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onChange={e => {
            const next = e.target.value
            onChange(next)
            if (configured && ready) debouncedFetch(next)
          }}
          onFocus={() => {
            if (predictions.length) {
              updateMenuPos()
              setOpen(true)
            }
          }}
          onKeyDown={e => {
            if (!open || predictions.length === 0) return
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
              setOpen(false)
            }
          }}
        />
        {(configured && !ready && !error) || searching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {menu}

      {configured ? (
        <p className="text-xs text-muted-foreground">
          Powered by Google Places — pick a suggestion to fill the branch address.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add <code className="text-[11px]">VITE_GOOGLE_MAPS_API_KEY</code> to enable address
          autocomplete. You can still type the address manually.
        </p>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
