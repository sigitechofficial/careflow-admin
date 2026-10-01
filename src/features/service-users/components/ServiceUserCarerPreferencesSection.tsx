import * as React from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import type { EmployeeListRow } from '@/features/employees/types'
import type { ServiceUserDomCareCarerBrief } from '@/features/service-users/types'

export type ServiceUserCarerPreferencesState = {
  preferredCarers: ServiceUserDomCareCarerBrief[]
  blockedCarers: ServiceUserDomCareCarerBrief[]
}

export function emptyCarerPreferences(): ServiceUserCarerPreferencesState {
  return { preferredCarers: [], blockedCarers: [] }
}

export function carerPreferencesFromDomCare(data: {
  preferredCarers: ServiceUserDomCareCarerBrief[]
  blockedCarers: ServiceUserDomCareCarerBrief[]
}): ServiceUserCarerPreferencesState {
  return {
    preferredCarers: [...data.preferredCarers],
    blockedCarers: [...data.blockedCarers],
  }
}

export function toDomCareCarerPayload(state: ServiceUserCarerPreferencesState) {
  return {
    preferredEmployeeIds: state.preferredCarers.map((c) => c.id),
    blockedEmployeeIds: state.blockedCarers.map((c) => c.id),
  }
}

type CarerMap = Record<string, ServiceUserDomCareCarerBrief>

function mergeCarerMap(prev: CarerMap, carers: ServiceUserDomCareCarerBrief[]): CarerMap {
  const next = { ...prev }
  for (const c of carers) next[c.id] = c
  return next
}

function employeeRowToBrief(row: EmployeeListRow): ServiceUserDomCareCarerBrief {
  return {
    id: row.id,
    firstName: row.firstName ?? '',
    lastName: row.lastName ?? '',
  }
}

function CarerMultiField({
  label,
  placeholder,
  excludeIds,
  selectedIds,
  carerMap,
  onAdd,
  onRemove,
  disabled,
  searchEnabled,
  onSearch,
  hits,
  loading,
}: {
  label: string
  placeholder: string
  excludeIds: string[]
  selectedIds: string[]
  carerMap: CarerMap
  onAdd: (c: ServiceUserDomCareCarerBrief) => void
  onRemove: (id: string) => void
  disabled: boolean
  searchEnabled: boolean
  onSearch: (q: string) => void
  hits: ServiceUserDomCareCarerBrief[]
  loading: boolean
}) {
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    onSearch(q)
  }, [q, onSearch])

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const taCls =
    'min-h-[42px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-muted-foreground">{label}</label>
      <div ref={wrapRef} className="relative space-y-2">
        <input
          type="text"
          className={taCls}
          placeholder={placeholder}
          value={q}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
        />
        {open && !disabled && searchEnabled && (
          <div
            className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-popover shadow-md"
            onMouseDown={(e) => e.preventDefault()}
          >
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : hits.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {q.trim().length < 2 ? 'Type at least 2 characters…' : 'No matches'}
              </div>
            ) : (
              hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onAdd(h)
                    setQ('')
                    setOpen(false)
                  }}
                >
                  {h.firstName} {h.lastName}
                </button>
              ))
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const c = carerMap[id]
            const labelText = c ? `${c.firstName} ${c.lastName}`.trim() : id
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium"
              >
                {labelText}
                {!disabled && (
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    onClick={() => onRemove(id)}
                    aria-label={`Remove ${labelText}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type Props = {
  value: ServiceUserCarerPreferencesState
  onChange: (value: ServiceUserCarerPreferencesState) => void
  disabled?: boolean
  className?: string
  heading?: string
  description?: string
}

export function ServiceUserCarerPreferencesSection({
  value,
  onChange,
  disabled = false,
  className,
  heading = 'Carer preferences',
  description = 'Preferred carers are suggested first when scheduling visits. Blocked carers cannot be assigned to this service user.',
}: Props) {
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 280)
    return () => window.clearTimeout(t)
  }, [search])

  const employeesQuery = useEmployees(
    { search: debouncedSearch.trim(), limit: 20 },
    debouncedSearch.trim().length >= 2,
  )

  const [carerMap, setCarerMap] = React.useState<CarerMap>(() =>
    mergeCarerMap({}, [...value.preferredCarers, ...value.blockedCarers]),
  )

  React.useEffect(() => {
    setCarerMap((prev) => mergeCarerMap(prev, [...value.preferredCarers, ...value.blockedCarers]))
  }, [value.preferredCarers, value.blockedCarers])

  const preferredIds = value.preferredCarers.map((c) => c.id)
  const blockedIds = value.blockedCarers.map((c) => c.id)

  const hits = React.useMemo(() => {
    const exclude = new Set([...blockedIds, ...preferredIds])
    return (employeesQuery.data?.rows ?? [])
      .map(employeeRowToBrief)
      .filter((r) => !exclude.has(r.id))
  }, [employeesQuery.data?.rows, blockedIds, preferredIds])

  const handleSearch = React.useCallback((q: string) => {
    setSearch(q)
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-primary">{heading}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CarerMultiField
          label="Preferred carers"
          placeholder="Search employee…"
          excludeIds={blockedIds}
          selectedIds={preferredIds}
          carerMap={carerMap}
          disabled={disabled}
          searchEnabled={debouncedSearch.trim().length >= 2}
          onSearch={handleSearch}
          hits={hits}
          loading={employeesQuery.isFetching}
          onAdd={(c) => {
            setCarerMap((m) => mergeCarerMap(m, [c]))
            onChange({
              preferredCarers: value.preferredCarers.some((x) => x.id === c.id)
                ? value.preferredCarers
                : [...value.preferredCarers, c],
              blockedCarers: value.blockedCarers.filter((x) => x.id !== c.id),
            })
          }}
          onRemove={(id) => {
            onChange({
              ...value,
              preferredCarers: value.preferredCarers.filter((x) => x.id !== id),
            })
          }}
        />
        <CarerMultiField
          label="Blocked carers"
          placeholder="Search employee…"
          excludeIds={preferredIds}
          selectedIds={blockedIds}
          carerMap={carerMap}
          disabled={disabled}
          searchEnabled={debouncedSearch.trim().length >= 2}
          onSearch={handleSearch}
          hits={hits}
          loading={employeesQuery.isFetching}
          onAdd={(c) => {
            setCarerMap((m) => mergeCarerMap(m, [c]))
            onChange({
              blockedCarers: value.blockedCarers.some((x) => x.id === c.id)
                ? value.blockedCarers
                : [...value.blockedCarers, c],
              preferredCarers: value.preferredCarers.filter((x) => x.id !== c.id),
            })
          }}
          onRemove={(id) => {
            onChange({
              ...value,
              blockedCarers: value.blockedCarers.filter((x) => x.id !== id),
            })
          }}
        />
      </div>
    </div>
  )
}
