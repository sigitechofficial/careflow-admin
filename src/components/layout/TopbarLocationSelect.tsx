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
  const { locationId, setSelectedLocationId, isLocked } = useGlobalLocationScope()
  const assignedLocationIds = useAuthStore((s) => s.user?.assignedLocationIds)
  const assignedLocations = useAuthStore((s) => s.user?.assignedLocations)
  const treeQuery = useLocationManagementTree(assignedLocationIds == null)
  const allOptions = React.useMemo(
    () => flattenLocationOptionsFromTree(treeQuery.data),
    [treeQuery.data],
  )

  const options = React.useMemo(() => {
    // Branch-scoped: prefer auth labels (works even when location is not in the org tree).
    if (assignedLocationIds != null) {
      const fromAuth =
        assignedLocations?.map((l) => ({
          id: l.id,
          label: l.name?.trim() || 'Location',
        })) ?? []
      if (fromAuth.length) return fromAuth

      const allowed = new Set(assignedLocationIds)
      const fromTree = allOptions.filter((o) => allowed.has(o.id))
      if (fromTree.length) return fromTree

      return assignedLocationIds.map((id) => ({ id, label: 'Location' }))
    }
    return allOptions
  }, [allOptions, assignedLocationIds, assignedLocations])

  // Keep header selection inside the user's assigned branches.
  React.useEffect(() => {
    if (assignedLocationIds == null) return
    if (assignedLocationIds.length === 0) {
      if (locationId) setSelectedLocationId(null)
      return
    }
    if (!locationId || !assignedLocationIds.includes(locationId)) {
      setSelectedLocationId(assignedLocationIds[0]!)
    }
  }, [locationId, assignedLocationIds, setSelectedLocationId])

  const selectedLabel = React.useMemo(() => {
    if (!locationId) return assignedLocationIds == null ? 'All locations' : 'No branch'
    const fromOptions = options.find((o) => o.id === locationId)?.label
    if (fromOptions) return fromOptions
    const fromAuth = assignedLocations?.find((l) => l.id === locationId)?.name?.trim()
    return fromAuth || 'Location'
  }, [locationId, options, assignedLocationIds, assignedLocations])

  /** Assigned users cannot pick org-wide "All". */
  const showAllOption = assignedLocationIds == null
  const branchLocked = isLocked || (assignedLocationIds != null && assignedLocationIds.length === 1)

  return (
    <div
      className="hidden sm:flex items-center gap-1.5"
      data-testid="topbar-location-select"
    >
      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
      {branchLocked ? (
        <div
          className="flex h-8 w-[min(14rem,42vw)] items-center rounded-md border border-border/80 bg-muted/40 px-2.5 text-xs font-medium text-foreground"
          title={selectedLabel}
          aria-label={`Branch: ${selectedLabel}`}
          data-testid="topbar-location-locked"
        >
          <span className="truncate">{selectedLabel}</span>
        </div>
      ) : (
        <Select
          value={locationId ?? ALL_VALUE}
          onValueChange={(value) => {
            if (assignedLocationIds != null) {
              if (value === ALL_VALUE) return
              if (!assignedLocationIds.includes(value)) return
            }
            setSelectedLocationId(value === ALL_VALUE ? null : value)
          }}
          disabled={assignedLocationIds == null && treeQuery.isLoading}
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
      )}
    </div>
  )
}
