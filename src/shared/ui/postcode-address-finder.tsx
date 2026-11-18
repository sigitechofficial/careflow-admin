import * as React from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import {
  addressesForPostcode,
  isFullPostcode,
  suggestPostcodes,
  tidyPostcode,
  type PickedAddress,
  type PostcodeAddresses,
} from '@/shared/lib/address-lookup'

type Props = {
  onPick: (address: PickedAddress) => void
  disabled?: boolean
  /** Postcode already on the record, to start from. */
  initialPostcode?: string
  id?: string
}

function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  return msg && !/^HTTP|fetch/i.test(msg) ? msg : 'The address list is not answering right now. Type the address instead.'
}

/**
 * Type a postcode (suggestions appear as you type), then pick the address from the list.
 * Lists stay in the page flow (no floating menu), so they work inside dialogs too.
 */
export function PostcodeAddressFinder({ onPick, disabled, initialPostcode = '', id = 'postcode-finder' }: Props) {
  const [text, setText] = React.useState(initialPostcode)
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<PostcodeAddresses | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [picked, setPicked] = React.useState<string | null>(null)
  const listId = `${id}-addresses`

  // Postcode suggestions while typing (not once it's a full postcode with its list showing).
  React.useEffect(() => {
    const q = text.trim()
    if (q.length < 2 || result?.postcode === tidyPostcode(q)) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      suggestPostcodes(q, controller.signal)
        .then(list => setSuggestions(list.filter(p => tidyPostcode(p) !== tidyPostcode(q) || !isFullPostcode(q)).slice(0, 8)))
        .catch(() => setSuggestions([]))
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [text, result?.postcode])

  const find = async (postcode: string) => {
    const pc = tidyPostcode(postcode)
    setText(pc)
    setSuggestions([])
    setPicked(null)
    if (!isFullPostcode(pc)) {
      setResult(null)
      setError('Enter the full postcode, for example TW3 2DL.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const found = await addressesForPostcode(pc)
      setResult(found)
      if (!found.addressListAvailable && found.area) {
        // No address list set up: fill what the postcode tells us; the street is typed below.
        onPick({
          summary: pc,
          addressLine1: '',
          addressLine2: '',
          town: found.area.town,
          county: found.area.county,
          country: found.area.country,
          postcode: found.postcode,
          latitude: found.area.latitude,
          longitude: found.area.longitude,
        })
      }
    } catch (e) {
      setResult(null)
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            className="pl-9 uppercase placeholder:normal-case"
            placeholder="Postcode, e.g. TW3 2DL"
            value={text}
            disabled={disabled}
            autoComplete="postal-code"
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={e => {
              setText(e.target.value)
              setError(null)
              if (result && tidyPostcode(e.target.value) !== result.postcode) setResult(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void find(text)
              }
            }}
            data-testid="postcode-finder-input"
          />
        </div>
        <Button type="button" onClick={() => void find(text)} disabled={disabled || loading || !text.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Find address
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Matching postcodes">
          {suggestions.map(p => (
            <button
              key={p}
              type="button"
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
              onClick={() => void find(p)}
              disabled={disabled}
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {result && result.addressListAvailable ? (
        result.addresses.length ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              {result.addresses.length} address{result.addresses.length === 1 ? '' : 'es'} at {result.postcode}. Pick one:
            </p>
            <ul id={listId} role="listbox" aria-label={`Addresses at ${result.postcode}`} className="max-h-60 overflow-auto rounded-md border border-border bg-background">
              {result.addresses.map(a => (
                <li key={a.id} role="option" aria-selected={picked === a.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                      'flex w-full items-start gap-2 border-b border-border/60 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted',
                      picked === a.id && 'bg-primary/10 font-medium',
                    )}
                    onClick={() => {
                      setPicked(a.id)
                      onPick(a)
                    }}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{a.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No addresses are listed at {result.postcode}. Type the address below.</p>
        )
      ) : null}

      {result && !result.addressListAvailable ? (
        <p className="text-xs text-muted-foreground">
          Found {result.postcode}
          {result.area?.town ? ` in ${result.area.town}` : ''}. Type the house number and street below.
        </p>
      ) : null}
    </div>
  )
}
