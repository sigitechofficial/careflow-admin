import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

function findZoneIdForLocation(
  zones: Array<{ id: string; branches: Array<{ id: string }> }>,
  locationId: string,
): string {
  for (const zone of zones) {
    if (zone.branches.some(branch => branch.id === locationId)) return zone.id
  }
  return ''
}

function normalizePostcodeKey(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

export type ServiceUserZoneBranchAreaValue = {
  locationId: string
  serviceUserAreaId: string
}

export function ServiceUserZoneBranchSelect({
  value,
  areaId = '',
  addressPostcode = '',
  onChange,
  onApplyPostcode,
  disabled,
  required,
  className,
}: {
  value: string
  areaId?: string
  /** Current address postcode — used to show match / mismatch vs the selected area. */
  addressPostcode?: string
  onChange: (next: ServiceUserZoneBranchAreaValue) => void
  /** Fill address postcode when the user picks one of the area’s postcodes. */
  onApplyPostcode?: (postcode: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
}) {
  const locationsQuery = useServiceUserLocations()
  const zones = locationsQuery.data?.zones ?? []

  const resolvedZoneId = React.useMemo(
    () => (value ? findZoneIdForLocation(zones, value) : ''),
    [value, zones],
  )

  const [zoneKey, setZoneKey] = React.useState(resolvedZoneId)

  React.useEffect(() => {
    setZoneKey(resolvedZoneId)
  }, [resolvedZoneId])

  const selectedZone = zones.find(zone => zone.id === zoneKey) ?? null
  const branchOptions = selectedZone?.branches ?? []
  const selectedBranch = branchOptions.find(b => b.id === value) ?? null
  const areaOptions = selectedBranch?.areas ?? []
  const selectedArea = areaOptions.find(a => a.id === areaId) ?? null
  const areaPostcodes = selectedArea?.postcodes ?? []
  const areasRequired = areaOptions.length > 0
  const loading = locationsQuery.isLoading

  const addressKey = normalizePostcodeKey(addressPostcode)
  const areaKeys = React.useMemo(
    () => new Set(areaPostcodes.map(normalizePostcodeKey)),
    [areaPostcodes],
  )
  const postcodeMatchesArea = !addressKey || areaKeys.size === 0 || areaKeys.has(addressKey)
  const showMismatch = Boolean(selectedArea && addressKey && areaKeys.size > 0 && !postcodeMatchesArea)

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Zone</label>
          <Select
            value={zoneKey || '__none__'}
            onValueChange={next => {
              const key = next === '__none__' ? '' : next
              setZoneKey(key)
              onChange({ locationId: '', serviceUserAreaId: '' })
            }}
            disabled={disabled || loading}
          >
            <SelectTrigger data-testid="service-user-zone-select">
              <SelectValue placeholder={loading ? 'Loading zones…' : 'Select zone'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{required ? 'Select zone' : '— Unassigned —'}</SelectItem>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Branch</label>
          <Select
            value={value || '__none__'}
            onValueChange={next => {
              const locationId = next === '__none__' ? '' : next
              onChange({ locationId, serviceUserAreaId: '' })
            }}
            disabled={disabled || loading || !zoneKey}
          >
            <SelectTrigger data-testid="service-user-branch-select">
              <SelectValue placeholder={zoneKey ? 'Select branch' : 'Choose zone first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{required ? 'Select branch' : '— Unassigned —'}</SelectItem>
              {branchOptions.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Area{areasRequired ? '' : ' (optional)'}
          </label>
          <Select
            value={areaId || '__none__'}
            onValueChange={next => {
              const serviceUserAreaId = next === '__none__' ? '' : next
              onChange({ locationId: value, serviceUserAreaId })
            }}
            disabled={disabled || loading || !value}
          >
            <SelectTrigger data-testid="service-user-area-select">
              <SelectValue
                placeholder={
                  !value
                    ? 'Choose branch first'
                    : areasRequired
                      ? 'Select area'
                      : 'No areas yet'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                {areasRequired && required ? 'Select area' : '— Unassigned —'}
              </SelectItem>
              {areaOptions.map(area => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                  {area.postcodes?.length ? ` (${area.postcodes.slice(0, 2).join(', ')})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedArea && areaPostcodes.length > 0 ? (
        <div
          className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2"
          data-testid="service-user-area-postcodes"
        >
          <p className="text-xs font-medium text-foreground">
            Postcodes for {selectedArea.name}
            {onApplyPostcode ? (
              <span className="font-normal text-muted-foreground">
                {' '}
                — click one to fill the address postcode
              </span>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {areaPostcodes.map(pc => {
              const selected = addressKey === normalizePostcodeKey(pc)
              const interactive = Boolean(onApplyPostcode) && !disabled
              const ChipTag = interactive ? 'button' : 'span'
              return (
                <ChipTag
                  key={pc}
                  type={interactive ? 'button' : undefined}
                  disabled={interactive ? disabled : undefined}
                  onClick={
                    interactive
                      ? () => {
                          onApplyPostcode?.(pc)
                        }
                      : undefined
                  }
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground',
                    interactive && 'hover:border-primary/60 hover:bg-primary/5',
                  )}
                  data-testid={`service-user-area-postcode-${normalizePostcodeKey(pc)}`}
                >
                  {pc}
                </ChipTag>
              )
            })}
          </div>
          {showMismatch ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400" role="status">
              Address postcode <span className="font-medium">{addressPostcode.trim()}</span> is
              not in this area’s list. You can still save — area is used for monitoring; address
              postcode stays on the home address.
            </p>
          ) : null}
        </div>
      ) : selectedArea ? (
        <p className="mt-2 text-xs text-muted-foreground">
          This area has no postcodes yet. Add them under Settings → Location Management.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading company zones, branches and areas…
        </p>
      ) : null}
    </div>
  )
}
