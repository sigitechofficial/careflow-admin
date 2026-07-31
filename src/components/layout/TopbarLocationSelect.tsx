import * as React from 'react'
import { MapPin } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { flattenLocationOptionsFromTree } from '@/features/locations/utils/flatten-location-options.util'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const ALL_VALUE = '__all__'

export function TopbarLocationSelect() {
  const { locationId, setSelectedLocationId } = useGlobalLocationScope()
  const assignedLocationIds = useAuthStore((s) => s.user?.assignedLocationIds)
  const treeQuery = useLocationManagementTree(true)
  const allOptions = React.useMemo(
    () => flattenLocationOptionsFromTree(treeQuery.data),
    [treeQuery.data],
  )

  const options = React.useMemo(() => {
    if (!assignedLocationIds?.length) return allOptions
    const allowed = new Set(assignedLocationIds)
    return allOptions.filter((o) => allowed.has(o.id))
  }, [allOptions, assignedLocationIds])

  // Clear / coerce selection against the user's assigned locations.
  React.useEffect(() => {
    if (!assignedLocationIds?.length) return
    if (locationId && !assignedLocationIds.includes(locationId)) {
      setSelectedLocationId(assignedLocationIds[0]!)
      return
    }
    if (!locationId) {
      setSelectedLocationId(assignedLocationIds[0]!)
    }
  }, [locationId, assignedLocationIds, setSelectedLocationId])

  const selectedLabel = React.useMemo(() => {
    if (!locationId) return 'All locations'
    return options.find((o) => o.id === locationId)?.label ?? 'Location'
  }, [locationId, options])

  /** Assigned users cannot pick org-wide "All" — that would bypass ACL on list APIs. */
  const showAllOption = !assignedLocationIds?.length

  return (
    <div
      className="hidden sm:flex items-center gap-1.5"
      data-testid="topbar-location-select"
    >
      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
      <Select
        value={locationId ?? ALL_VALUE}
        onValueChange={(value) => {
          setSelectedLocationId(value === ALL_VALUE ? null : value)
        }}
        disabled={treeQuery.isLoading}
      >
        <SelectTrigger
          className="h-8 w-[min(14rem,42vw)] border-border/80 bg-muted/40 text-xs"
          aria-label="Filter by location"
          title={selectedLabel}
        >
          <SelectValue placeholder="All locations" />
        </SelectTrigger>
        <SelectContent align="end" className="max-h-72">
          {showAllOption ? (
            <SelectItem value={ALL_VALUE} className="text-xs">
              All locations
            </SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
