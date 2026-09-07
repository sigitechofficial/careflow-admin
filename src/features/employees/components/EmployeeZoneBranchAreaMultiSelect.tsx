import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useEmployeeLocations } from '@/features/settings/hooks/useLocationManagement'
import { MultiSelect } from '@/shared/ui/multi-select'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'

export type EmployeeZoneBranchAreaValue = {
  zoneIds: string[]
  /** Location ids (branches). First is treated as primary employment location. */
  locationIds: string[]
  serviceUserAreaIds: string[]
}

type Props = {
  value: EmployeeZoneBranchAreaValue
  onChange: (next: EmployeeZoneBranchAreaValue, meta?: { source: 'user' | 'hydrate' }) => void
  disabled?: boolean
  className?: string
}

type ZoneTree = Array<{
  id: string
  name: string
  branches: Array<{
    id: string
    name: string
    areas?: Array<{ id: string; name: string; postcodes?: string[] }>
  }>
}>

export function zoneIdsForLocations(zones: ZoneTree, locationIds: string[]): string[] {
  const set = new Set<string>()
  for (const locId of locationIds) {
    for (const zone of zones) {
      if (zone.branches.some(b => b.id === locId)) set.add(zone.id)
    }
  }
  return [...set]
}

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every(id => set.has(id))
}

function withOrphanOptions(
  options: Array<{ value: string; label: string }>,
  selectedIds: string[],
  labelFor?: (id: string) => string | undefined,
): Array<{ value: string; label: string }> {
  const known = new Set(options.map(o => o.value))
  const extras = selectedIds
    .filter(id => id && !known.has(id))
    .map(id => ({ value: id, label: labelFor?.(id) || id }))
  return extras.length ? [...options, ...extras] : options
}

/**
 * Multi zone → branch → service area picker for employee employment.
 * Uses employee location-management tree so edit/add work with employees.read.
 */
export function EmployeeZoneBranchAreaMultiSelect({
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const locationsQuery = useEmployeeLocations()
  const zones = (locationsQuery.data?.zones ?? []) as ZoneTree
  const loading = locationsQuery.isLoading
  const loadError = locationsQuery.isError

  const inferredZoneIds = React.useMemo(
    () => zoneIdsForLocations(zones, value.locationIds),
    [zones, value.locationIds],
  )

  const zoneIds =
    value.zoneIds.length > 0 ? value.zoneIds : inferredZoneIds

  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // On edit, zoneIds start empty — write inferred zones into form once options load.
  React.useEffect(() => {
    if (loading || loadError || zones.length === 0) return
    if (value.locationIds.length === 0) return
    if (inferredZoneIds.length === 0) return
    if (sameIdSet(value.zoneIds, inferredZoneIds)) return
    // Prefer keeping an intentional user zone filter that still covers selected branches.
    if (
      value.zoneIds.length > 0 &&
      inferredZoneIds.every(id => value.zoneIds.includes(id))
    ) {
      return
    }
    onChangeRef.current(
      {
        zoneIds: inferredZoneIds,
        locationIds: value.locationIds,
        serviceUserAreaIds: value.serviceUserAreaIds,
      },
      { source: 'hydrate' },
    )
  }, [
    loading,
    loadError,
    zones.length,
    inferredZoneIds,
    value.zoneIds,
    value.locationIds,
    value.serviceUserAreaIds,
  ])

  const selectedZones = zones.filter(z => zoneIds.includes(z.id))
  const branchOptions = (zoneIds.length ? selectedZones : zones).flatMap(z =>
    z.branches.map(b => ({
      value: b.id,
      label: `${z.name} · ${b.name}`,
      zoneId: z.id,
      areas: b.areas ?? [],
    })),
  )

  const selectedBranches = branchOptions.filter(b => value.locationIds.includes(b.value))
  const areaOptionsBase = (
    value.locationIds.length ? selectedBranches : branchOptions
  ).flatMap(b =>
    b.areas.map(a => ({
      value: a.id,
      label: `${b.label} · ${a.name}${a.postcodes?.length ? ` (${a.postcodes.slice(0, 2).join(', ')})` : ''}`,
    })),
  )

  const areaLabelLookup = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const z of zones) {
      for (const b of z.branches) {
        for (const a of b.areas ?? []) {
          map.set(a.id, `${z.name} · ${b.name} · ${a.name}`)
        }
      }
    }
    return map
  }, [zones])

  const branchLabelLookup = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const z of zones) {
      for (const b of z.branches) {
        map.set(b.id, `${z.name} · ${b.name}`)
      }
    }
    return map
  }, [zones])

  const zoneOptions = withOrphanOptions(
    zones.map(z => ({ value: z.id, label: z.name })),
    zoneIds,
  )
  const branchSelectOptions = withOrphanOptions(
    branchOptions.map(({ value: v, label }) => ({ value: v, label })),
    value.locationIds,
    id => branchLabelLookup.get(id),
  )
  const areaSelectOptions = withOrphanOptions(
    areaOptionsBase,
    value.serviceUserAreaIds,
    id => areaLabelLookup.get(id),
  )

  const emit = (
    patch: Partial<EmployeeZoneBranchAreaValue>,
    source: 'user' | 'hydrate' = 'user',
  ) => {
    onChange(
      {
        zoneIds,
        locationIds: value.locationIds,
        serviceUserAreaIds: value.serviceUserAreaIds,
        ...patch,
      },
      { source },
    )
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="employee-zone-branch-area">
      <div className="space-y-1.5">
        <Label>Zones</Label>
        <p className="text-xs text-muted-foreground">
          Select one or more zones. Branches and areas update from your selection.
        </p>
        <MultiSelect
          options={zoneOptions}
          value={zoneIds}
          onChange={nextZones => {
            const allowedBranchIds = new Set(
              zones
                .filter(z => nextZones.includes(z.id))
                .flatMap(z => z.branches.map(b => b.id)),
            )
            const nextLocations = value.locationIds.filter(id => allowedBranchIds.has(id))
            const allowedAreaIds = new Set(
              zones
                .flatMap(z => z.branches)
                .filter(b => nextLocations.includes(b.id))
                .flatMap(b => (b.areas ?? []).map(a => a.id)),
            )
            onChange(
              {
                zoneIds: nextZones,
                locationIds: nextLocations,
                serviceUserAreaIds: value.serviceUserAreaIds.filter(id =>
                  allowedAreaIds.has(id),
                ),
              },
              { source: 'user' },
            )
          }}
          placeholder={loading ? 'Loading zones…' : 'Select zones'}
          searchPlaceholder="Search zones…"
          disabled={disabled || loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Branches</Label>
        <p className="text-xs text-muted-foreground">
          First selected branch is the primary employment location; others are additional sites.
        </p>
        <MultiSelect
          options={branchSelectOptions}
          value={value.locationIds}
          onChange={nextLocations => {
            const allowedAreaIds = new Set(
              zones
                .flatMap(z => z.branches)
                .filter(b => nextLocations.includes(b.id))
                .flatMap(b => (b.areas ?? []).map(a => a.id)),
            )
            const nextZones = zoneIdsForLocations(zones, nextLocations)
            emit(
              {
                zoneIds: zoneIds.length ? zoneIds : nextZones,
                locationIds: nextLocations,
                serviceUserAreaIds: value.serviceUserAreaIds.filter(id =>
                  allowedAreaIds.has(id),
                ),
              },
              'user',
            )
          }}
          placeholder={
            zoneIds.length === 0
              ? 'Select zones first (or pick any branch)'
              : 'Select branches'
          }
          searchPlaceholder="Search branches…"
          disabled={disabled || loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Service areas</Label>
        <p className="text-xs text-muted-foreground">
          Monitoring areas under the selected branches. An employee can cover many areas.
        </p>
        <MultiSelect
          options={areaSelectOptions}
          value={value.serviceUserAreaIds}
          onChange={nextAreas => emit({ serviceUserAreaIds: nextAreas }, 'user')}
          placeholder={
            value.locationIds.length === 0
              ? 'Select branches first'
              : areaSelectOptions.length
                ? 'Select service areas'
                : 'No service areas on selected branches'
          }
          searchPlaceholder="Search areas…"
          disabled={disabled || loading || value.locationIds.length === 0}
        />
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading zones, branches and areas…
        </p>
      ) : null}
      {loadError ? (
        <p className="text-xs text-destructive" role="alert">
          Could not load location options. Check you have employees.read or lookups.read.
        </p>
      ) : null}
    </div>
  )
}
