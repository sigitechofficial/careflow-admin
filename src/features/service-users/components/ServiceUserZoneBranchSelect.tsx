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

function findZoneIdForLocation(
  zones: Array<{ id: string; branches: Array<{ id: string }> }>,
  locationId: string,
): string {
  for (const zone of zones) {
    if (zone.branches.some(branch => branch.id === locationId)) return zone.id
  }
  return ''
}

export function ServiceUserZoneBranchSelect({
  value,
  onChange,
  disabled,
  required,
  className,
}: {
  value: string
  onChange: (locationId: string) => void
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
  const loading = locationsQuery.isLoading

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Zone</label>
          <Select
            value={zoneKey || '__none__'}
            onValueChange={next => {
              const key = next === '__none__' ? '' : next
              setZoneKey(key)
              onChange('')
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
            onValueChange={next => onChange(next === '__none__' ? '' : next)}
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
      </div>
      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading company zones and branches…
        </p>
      ) : null}
    </div>
  )
}
