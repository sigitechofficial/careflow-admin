import * as React from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Textarea } from '@/shared/ui/form-field'
import {
  isGoogleMapsConfigured,
  normalizePostcode,
  verifyPostcodesExist,
  type PostcodeVerification,
} from '@/shared/lib/google-maps'

function parsePostcodesInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

export type GooglePostcodesValidity = {
  checking: boolean
  configured: boolean
  postcodes: string[]
  results: PostcodeVerification[]
  invalid: string[]
  /** True when every entered postcode was verified, or none entered / Maps not configured. */
  canSubmit: boolean
}

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  /** ISO country code for Geocoder bias (e.g. gb). */
  countryCode?: string
  disabled?: boolean
  placeholder?: string
  rows?: number
  className?: string
  onValidityChange?: (state: GooglePostcodesValidity) => void
}

/**
 * Multi-postcode textarea that verifies each entry against Google Geocoder.
 */
export function GooglePostcodesField({
  id,
  value,
  onChange,
  countryCode = 'gb',
  disabled,
  placeholder = 'One per line or comma-separated\ne.g.\nCR0 1AA\nCR2 6XH',
  rows = 8,
  className,
  onValidityChange,
}: Props) {
  const configured = isGoogleMapsConfigured()
  const [checking, setChecking] = React.useState(false)
  const [results, setResults] = React.useState<PostcodeVerification[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const requestIdRef = React.useRef(0)
  const onValidityChangeRef = React.useRef(onValidityChange)
  onValidityChangeRef.current = onValidityChange

  const postcodes = React.useMemo(() => parsePostcodesInput(value), [value])
  const postcodesKey = postcodes.map(p => normalizePostcode(p)).join('|')

  React.useEffect(() => {
    const emit = (state: GooglePostcodesValidity) => onValidityChangeRef.current?.(state)

    if (!configured) {
      const state: GooglePostcodesValidity = {
        checking: false,
        configured: false,
        postcodes,
        results: [],
        invalid: [],
        canSubmit: true,
      }
      setResults([])
      setChecking(false)
      setError(null)
      emit(state)
      return
    }

    if (postcodes.length === 0) {
      const state: GooglePostcodesValidity = {
        checking: false,
        configured: true,
        postcodes: [],
        results: [],
        invalid: [],
        canSubmit: true,
      }
      setResults([])
      setChecking(false)
      setError(null)
      emit(state)
      return
    }

    const requestId = ++requestIdRef.current
    setChecking(true)
    setError(null)
    emit({
      checking: true,
      configured: true,
      postcodes,
      results: [],
      invalid: [],
      canSubmit: false,
    })

    const timer = window.setTimeout(() => {
      void verifyPostcodesExist(postcodes, countryCode)
        .then(next => {
          if (requestId !== requestIdRef.current) return
          const invalid = next.filter(r => !r.valid).map(r => r.input)
          setResults(next)
          setChecking(false)
          emit({
            checking: false,
            configured: true,
            postcodes,
            results: next,
            invalid,
            canSubmit: invalid.length === 0,
          })
        })
        .catch(err => {
          if (requestId !== requestIdRef.current) return
          setChecking(false)
          setResults([])
          setError(err instanceof Error ? err.message : 'Could not verify postcodes')
          emit({
            checking: false,
            configured: true,
            postcodes,
            results: [],
            invalid: postcodes,
            canSubmit: false,
          })
        })
    }, 450)

    return () => window.clearTimeout(timer)
    // postcodesKey tracks content; postcodes array used inside for labels
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, countryCode, postcodesKey])

  const byNorm = React.useMemo(() => {
    const map = new Map<string, PostcodeVerification>()
    for (const r of results) map.set(normalizePostcode(r.input), r)
    return map
  }, [results])

  return (
    <div className={cn('space-y-2', className)}>
      <Textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />

      {configured ? (
        <p className="text-xs text-muted-foreground">
          Each postcode is checked with Google Maps before you can save.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add <code className="text-[11px]">VITE_GOOGLE_MAPS_API_KEY</code> to verify postcodes with
          Google. Without it, entries are not validated.
        </p>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {configured && postcodes.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {postcodes.map(pc => {
            const status = byNorm.get(normalizePostcode(pc))
            const pending = checking && !status
            const ok = status?.valid === true
            const bad = status?.valid === false
            return (
              <li
                key={`${normalizePostcode(pc)}-${pc}`}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs',
                  ok && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                  bad && 'border-destructive/30 bg-destructive/5 text-destructive',
                  pending && 'border-border bg-muted/40 text-muted-foreground',
                  !ok && !bad && !pending && 'border-border bg-muted/40 text-muted-foreground',
                )}
              >
                {pending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : ok ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : bad ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                <span className="font-medium">{pc}</span>
                {bad ? <span className="opacity-80">not found</span> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
