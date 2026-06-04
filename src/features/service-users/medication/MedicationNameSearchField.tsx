import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { MedicationLookupsBundle } from '@/features/service-users/api/service-users.api'
import { searchOpenFdaDrugLabels } from '@/features/service-users/api/medication-openfda.api'
import { openFdaHitToAutofill, type MedicationOpenFdaAutofill } from '@/features/service-users/medication/openfda-lookup-map.util'
import { Input } from '@/shared/ui/input'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { cn } from '@/shared/lib/utils'

export type { MedicationOpenFdaAutofill }

type Props = {
  medicationName: string
  onMedicationNameChange: (value: string) => void
  basicSearch: boolean
  onBasicSearchChange: (value: boolean) => void
  lookups: MedicationLookupsBundle | undefined
  disabled?: boolean
  onAutofill: (fields: MedicationOpenFdaAutofill) => void
}

export function MedicationNameSearchField({
  medicationName,
  onMedicationNameChange,
  basicSearch,
  onBasicSearchChange,
  lookups,
  disabled,
  onAutofill,
}: Props) {
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [listOpen, setListOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(medicationName), 350)
    return () => clearTimeout(t)
  }, [medicationName])

  const searchEnabled = basicSearch && debouncedQuery.trim().length >= 2 && !disabled

  const searchQuery = useQuery({
    queryKey: ['openfda', 'drug-labels', debouncedQuery.trim().toLowerCase()] as const,
    queryFn: () => searchOpenFdaDrugLabels(debouncedQuery.trim(), 8),
    enabled: searchEnabled,
    staleTime: 60_000,
    retry: false,
  })

  const hits = searchQuery.data ?? []
  const searchError =
    searchQuery.error instanceof ApiError
      ? searchQuery.error.message
      : searchQuery.error
        ? 'Medicine search failed'
        : null

  React.useEffect(() => {
    if (!basicSearch) setListOpen(false)
  }, [basicSearch])

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setListOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function selectHit(hit: (typeof hits)[number]) {
    onAutofill(openFdaHitToAutofill(hit, lookups))
    setListOpen(false)
  }

  return (
    <div className="space-y-1 sm:col-span-2" ref={containerRef}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium">
          Medication name <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Basic search</span>
          <NoYesToggle
            value={basicSearch}
            onChange={onBasicSearchChange}
            disabled={disabled}
            activeTone="success"
          />
        </div>
      </div>

      <div className="relative">
        <Input
          value={medicationName}
          onChange={e => {
            onMedicationNameChange(e.target.value)
            if (basicSearch) setListOpen(true)
          }}
          onFocus={() => {
            if (basicSearch && hits.length > 0) setListOpen(true)
          }}
          placeholder={basicSearch ? 'Search medicine name (openFDA)…' : 'Name'}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete={basicSearch ? 'list' : undefined}
          aria-expanded={basicSearch && listOpen && hits.length > 0}
        />
        {basicSearch && searchQuery.isFetching && (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}

        {basicSearch && listOpen && searchEnabled && (
          <ul
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
            role="listbox"
          >
            {searchQuery.isFetching && hits.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground">Searching openFDA…</li>
            ) : null}
            {!searchQuery.isFetching && hits.length === 0 && !searchError ? (
              <li className="px-3 py-2 text-muted-foreground">
                No matches — keep typing or enter manually
              </li>
            ) : null}
            {searchError ? (
              <li className="px-3 py-2 text-destructive" role="alert">
                {searchError}
              </li>
            ) : null}
            {hits.map(hit => (
              <li key={hit.id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-accent',
                    'focus-visible:bg-accent focus-visible:outline-none',
                  )}
                  role="option"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectHit(hit)}
                >
                  <span className="font-medium text-foreground">{hit.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {[hit.genericName, hit.routes.join(', '), hit.dosageFormHint, hit.purpose]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {basicSearch ? (
        <p className="text-xs text-muted-foreground">
          openFDA search can fill medication type, route, dose, and reason when you pick a result.
        </p>
      ) : null}
    </div>
  )
}
