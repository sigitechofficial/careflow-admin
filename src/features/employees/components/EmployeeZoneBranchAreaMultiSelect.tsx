import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
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
  onChange: (next: EmployeeZoneBranchAreaValue) => void
  disabled?: boolean
  className?: string
}

function zoneIdsForLocations(
  zones: Array<{ id: string; branches: Array<{ id: string }> }>,
  locationIds: string[],
): string[] {
  const set = new Set<string>()
  for (const locId of locationIds) {
    for (const zone of zones) {
      if (zone.branches.some(b => b.id === locId)) set.add(zone.id)
    }
  }
  return [...set]
}

/**
 * Multi zone → branch → service area picker for employee employment.
 */
export function EmployeeZoneBranchAreaMultiSelect({
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const locationsQuery = useServiceUserLocations()
  const zones = locationsQuery.data?.zones ?? []
  const loading = locationsQuery.isLoading

  const zoneIds =
    value.zoneIds.length > 0
      ? value.zoneIds
      : zoneIdsForLocations(zones, value.locationIds)

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
  const areaOptions = (
    value.locationIds.length
      ? selectedBranches
      : branchOptions
  ).flatMap(b =>
    b.areas.map(a => ({
      value: a.id,
      label: `${b.label} · ${a.name}${a.postcodes?.length ? ` (${a.postcodes.slice(0, 2).join(', ')})` : ''}`,
    })),
  )

  const emit = (patch: Partial<EmployeeZoneBranchAreaValue>) => {
    onChange({
      zoneIds,
      locationIds: value.locationIds,
      serviceUserAreaIds: value.serviceUserAreaIds,
      ...patch,
    })
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="employee-zone-branch-area">
      <div className="space-y-1.5">
        <Label>Zones</Label>
        <p className="text-xs text-muted-foreground">
          Select one or more zones. Branches and areas update from your selection.
        </p>
        <MultiSelect
          options={zones.map(z => ({ value: z.id, label: z.name }))}
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
            onChange({
              zoneIds: nextZones,
              locationIds: nextLocations,
              serviceUserAreaIds: value.serviceUserAreaIds.filter(id => allowedAreaIds.has(id)),
            })
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
          options={branchOptions.map(({ value: v, label }) => ({ value: v, label }))}
          value={value.locationIds}
          onChange={nextLocations => {
            const allowedAreaIds = new Set(
              branchOptions
                .filter(b => nextLocations.includes(b.value))
                .flatMap(b => b.areas.map(a => a.id)),
            )
            const inferredZones = zoneIdsForLocations(zones, nextLocations)
            emit({
              zoneIds: zoneIds.length ? zoneIds : inferredZones,
              locationIds: nextLocations,
              serviceUserAreaIds: value.serviceUserAreaIds.filter(id => allowedAreaIds.has(id)),
            })
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
          options={areaOptions}
          value={value.serviceUserAreaIds}
          onChange={nextAreas => emit({ serviceUserAreaIds: nextAreas })}
          placeholder={
            value.locationIds.length === 0
              ? 'Select branches first'
              : areaOptions.length
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
    </div>
  )
}
