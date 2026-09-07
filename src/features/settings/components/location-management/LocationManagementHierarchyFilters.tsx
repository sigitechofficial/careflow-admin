import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { LocationManagementHierarchyState } from '@/features/settings/hooks/useLocationManagementHierarchyFilters'

const ALL = '__all__'

type Props = {
  filters: LocationManagementHierarchyState
  areaDisabled?: boolean
}

export function LocationManagementHierarchyFilters({ filters, areaDisabled = false }: Props) {
  const {
    headerLocked,
    zoneId,
    branchLocationId,
    areaId,
    setZoneId,
    setBranchLocationId,
    setAreaId,
    zoneOptions,
    branchOptions,
    areaOptions,
  } = filters

  return (
    <div
      className="grid gap-3 sm:grid-cols-3"
      data-testid="location-management-hierarchy-filters"
    >
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="lm-filter-zone">
          Zone
        </label>
        <Select
          value={zoneId || ALL}
          onValueChange={v => setZoneId(v === ALL ? '' : v)}
          disabled={headerLocked}
        >
          <SelectTrigger
            id="lm-filter-zone"
            data-testid="location-management-filter-zone"
            title={headerLocked ? 'Controlled by the header location selector' : undefined}
          >
            <SelectValue placeholder="All zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All zones</SelectItem>
            {zoneOptions.map(z => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {headerLocked ? (
          <p className="text-xs text-muted-foreground">Controlled by the header location selector</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="lm-filter-branch">
          Branch
        </label>
        <Select
          value={branchLocationId || ALL}
          onValueChange={v => setBranchLocationId(v === ALL ? '' : v)}
          disabled={headerLocked}
        >
          <SelectTrigger
            id="lm-filter-branch"
            data-testid="location-management-filter-branch"
            title={headerLocked ? 'Controlled by the header location selector' : undefined}
          >
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All branches</SelectItem>
            {branchOptions.map(b => (
              <SelectItem key={b.locationId} value={b.locationId}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {headerLocked ? (
          <p className="text-xs text-muted-foreground">Controlled by the header location selector</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="lm-filter-area">
          Area
        </label>
        <Select
          value={areaDisabled ? ALL : areaId || ALL}
          onValueChange={v => setAreaId(v === ALL ? '' : v)}
          disabled={areaDisabled || !branchLocationId}
        >
          <SelectTrigger id="lm-filter-area" data-testid="location-management-filter-area">
            <SelectValue placeholder={areaDisabled ? 'Not used' : 'All areas'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{areaDisabled ? 'Not used' : 'All areas'}</SelectItem>
            {!areaDisabled
              ? areaOptions.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))
              : null}
          </SelectContent>
        </Select>
        {areaDisabled ? (
          <p className="text-xs text-muted-foreground">employees are not assigned to areas</p>
        ) : null}
      </div>
    </div>
  )
}
