import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'

export type ServiceUserZoneBranchAreaValue = {
  locationId: string
  serviceUserAreaId: string
}

/** Branch + area pickers; the zone follows from the chosen branch. */
export function ServiceUserZoneBranchSelect({
  value,
  areaId = '',
  onChange,
  disabled,
  className,
}: {
  value: string
  areaId?: string
  onChange: (next: ServiceUserZoneBranchAreaValue) => void
  disabled?: boolean
  required?: boolean
  className?: string
}) {
  const locationsQuery = useServiceUserLocations()
  const zones = locationsQuery.data?.zones ?? []
  const loading = locationsQuery.isLoading

  const branches = React.useMemo(
    () => zones.flatMap(zone => zone.branches.map(branch => ({ branch, zone }))),
    [zones],
  )
  const selected = branches.find(b => b.branch.id === value) ?? null
  const areaOptions = selected?.branch.areas ?? []
  const areasRequired = areaOptions.length > 0

  const branchComboOptions: ComboboxOption[] = branches.map(({ branch, zone }) => ({
    value: branch.id,
    label: branch.name,
    description: zone.name,
  }))
  const areaComboOptions: ComboboxOption[] = areaOptions.map(area => ({
    value: area.id,
    label: area.name,
    description: area.postcodes?.length ? area.postcodes.join(', ') : undefined,
  }))

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Branch</label>
          <Combobox
            data-testid="service-user-branch-select"
            options={branchComboOptions}
            value={value}
            onChange={locationId => onChange({ locationId, serviceUserAreaId: '' })}
            placeholder={loading ? 'Loading branches…' : 'Select branch'}
            searchPlaceholder="Search branch or zone…"
            emptyText="No branches found."
            disabled={disabled || loading}
          />
          {selected ? (
            <p className="text-xs text-muted-foreground" data-testid="service-user-zone-auto">
              Zone: <span className="font-medium text-foreground">{selected.zone.name}</span>
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Area{areasRequired ? '' : ' (optional)'}
          </label>
          <Combobox
            data-testid="service-user-area-select"
            options={areaComboOptions}
            value={areaId}
            onChange={serviceUserAreaId => onChange({ locationId: value, serviceUserAreaId })}
            placeholder={!value ? 'Choose branch first' : areasRequired ? 'Select area' : 'No areas yet'}
            searchPlaceholder="Search area or postcode…"
            emptyText="No areas found."
            disabled={disabled || loading || !value || !areasRequired}
          />
        </div>
      </div>

      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading company zones, branches and areas…
        </p>
      ) : null}
    </div>
  )
}
