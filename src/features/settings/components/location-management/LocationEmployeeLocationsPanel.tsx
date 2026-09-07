import * as React from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { EmployeeLocationRow } from '@/features/settings/location-management/location-management.types'
import { useEmployeeLocations, useUpdateEmployeeLocation } from '@/features/settings/hooks/useLocationManagement'
import {
  formatBranchDisplayName,
  formatLocationOptionLabel,
} from '@/features/settings/location-management/format-service-user-branch-label'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { MultiSelect } from '@/shared/ui/multi-select'
import { formatLocationAuditLine } from '@/features/settings/location-management/location-management-audit'
import type { LocationManagementHierarchyState } from '@/features/settings/hooks/useLocationManagementHierarchyFilters'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'

function displayEmployeeBranches(floorNames: string): string {
  if (!floorNames.trim()) return '—'
  return floorNames
    .split(',')
    .map(part => formatBranchDisplayName(part.trim()))
    .filter(part => part && part !== '—')
    .join(', ')
}

export function LocationEmployeeLocationsPanel({
  filters,
}: {
  filters: LocationManagementHierarchyState
}) {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const locationsQuery = useEmployeeLocations(true, filters.listLocationId)
  const updateMutation = useUpdateEmployeeLocation()
  const [saving, setSaving] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const [editing, setEditing] = React.useState<EmployeeLocationRow | null>(null)
  const [draftLocationId, setDraftLocationId] = React.useState<string | null>(null)
  const [draftFloorIds, setDraftFloorIds] = React.useState<string[]>([])
  const [draftAccessAll, setDraftAccessAll] = React.useState(false)

  const loading = locationsQuery.isLoading
  const error =
    locationsQuery.error instanceof ApiError
      ? locationsQuery.error.message
      : locationsQuery.error
        ? 'Could not load employees.'
        : null
  const zones = locationsQuery.data?.zones ?? []
  const locations = locationsQuery.data?.locations ?? []
  const members = locationsQuery.data?.members ?? []

  const filtered = members.filter(m => {
    if (filters.zoneName && !filters.listLocationId) {
      if ((m.zoneName ?? '').trim().toLowerCase() !== filters.zoneName.trim().toLowerCase()) {
        return false
      }
    }
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.zoneName?.toLowerCase().includes(q) ?? false) ||
      (m.locationName?.toLowerCase().includes(q) ?? false) ||
      m.floorNames.toLowerCase().includes(q)
    )
  })

  const selectedZone =
    zones.find(z => z.branches.some(b => b.id === draftLocationId)) ?? null
  const selectedZoneName = selectedZone?.name ?? ''

  const additionalBranchOptions = selectedZone
    ? selectedZone.branches
        .filter(b => b.id !== draftLocationId)
        .map(b => ({ value: b.id, label: formatBranchDisplayName(b.name) }))
    : locations
        .filter(l => l.id !== draftLocationId)
        .map(l => ({ value: l.id, label: formatLocationOptionLabel(l.name) }))

  function openEdit(row: EmployeeLocationRow) {
    setEditing(row)
    setDraftLocationId(row.locationId)
    setDraftFloorIds(row.floorLocationIds.filter(id => id !== row.locationId))
    setDraftAccessAll(row.accessAllZones)
  }

  async function onSaveEdit() {
    if (!canUpdate || !editing) return
    setSaving(true)
    try {
      const floorLocationIds = draftAccessAll
        ? []
        : [...new Set([...(draftLocationId ? [draftLocationId] : []), ...draftFloorIds])]
      await updateMutation.mutateAsync({
        employeeId: editing.id,
        body: {
          locationId: draftLocationId,
          accessAllZones: draftAccessAll,
          floorLocationIds: draftAccessAll ? undefined : floorLocationIds,
        },
      })
      toastSuccess('Saved', 'Employee location updated.')
      setEditing(null)
    } catch (e) {
      toastApiError(e, 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="location-management-employees-panel">
      <div>
        <h3 className="text-sm font-semibold text-primary">Employee Locations allocation</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set each employee&apos;s zone, primary branch, and additional branches in that zone.
          Employees are not assigned to areas — areas are for service users only.
        </p>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <input
        type="search"
        placeholder="Filter by name, zone or branch…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[40rem]">
          <div className="grid grid-cols-[minmax(12rem,1.3fr)_minmax(7rem,0.7fr)_minmax(10rem,1fr)_6rem_3rem] gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Employee Name</span>
            <span>Zone</span>
            <span>Branch</span>
            <span>Access All</span>
            <span className="sr-only">Edit</span>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((m, i) => {
              const branchLabel = displayEmployeeBranches(m.floorNames)
              return (
                <li
                  key={m.id}
                  className={cn(
                    'grid grid-cols-[minmax(12rem,1.3fr)_minmax(7rem,0.7fr)_minmax(10rem,1fr)_6rem_3rem] items-center gap-2 px-4 py-3 text-sm',
                    i % 2 === 1 && 'bg-muted/15',
                  )}
                >
                  <span className={cn('min-w-0', !m.isActive && 'text-muted-foreground')} title={m.fullName}>
                    <span className="block truncate">{m.fullName}</span>
                    {formatLocationAuditLine(m) ? (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {formatLocationAuditLine(m)}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate" title={m.zoneName ?? undefined}>
                    {m.zoneName ?? '—'}
                  </span>
                  <span className="truncate text-muted-foreground" title={branchLabel}>
                    {branchLabel}
                  </span>
                  <span>{m.accessAllZones ? 'Yes' : 'No'}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!canUpdate}
                    aria-label={`Edit location for ${m.fullName}`}
                    onClick={() => openEdit(m)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">No records found.</li>
            )}
          </ul>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Edit employee location</DialogTitle>
          </DialogHeader>
          {editing && (
            <DialogBody className="space-y-4">
              <p className="text-sm text-muted-foreground">{editing.fullName}</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary branch</label>
                <Select
                  value={draftLocationId ?? '__none__'}
                  onValueChange={v => {
                    const id = v === '__none__' ? null : v
                    setDraftLocationId(id)
                    setDraftFloorIds([])
                  }}
                  disabled={!canUpdate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone and branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {zones.length > 0
                      ? zones.map(zone => (
                          <SelectGroup key={zone.id}>
                            <SelectLabel>{zone.name}</SelectLabel>
                            {zone.branches.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                {formatBranchDisplayName(b.name) === zone.name
                                  ? formatBranchDisplayName(b.name)
                                  : `${zone.name} · ${formatBranchDisplayName(b.name)}`}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))
                      : locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {formatLocationOptionLabel(loc.name)}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="access-all-zone"
                  checked={draftAccessAll}
                  onCheckedChange={v => setDraftAccessAll(v === true)}
                  disabled={!canUpdate || !draftLocationId}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor="access-all-zone" className="text-sm font-medium">
                    Access all branches in this zone
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Employees are not assigned to areas.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional branches</label>
                <MultiSelect
                  options={additionalBranchOptions}
                  value={draftFloorIds}
                  onChange={setDraftFloorIds}
                  placeholder="Select additional branches"
                  disabled={!canUpdate || !draftLocationId || draftAccessAll}
                />
                {draftAccessAll && selectedZoneName ? (
                  <p className="text-xs text-muted-foreground">
                    All branches in {selectedZoneName} are included when access to the whole zone
                    is enabled.
                  </p>
                ) : !draftAccessAll && draftLocationId ? (
                  <p className="text-xs text-muted-foreground">
                    Optional extra branches in the same zone. Leave empty to keep only the primary
                    branch.
                  </p>
                ) : null}
              </div>
            </DialogBody>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSaveEdit()} disabled={!canUpdate || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
