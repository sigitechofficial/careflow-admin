import * as React from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { EmployeeLocationRow } from '@/features/settings/location-management/location-management.types'
import { useEmployeeLocations, useUpdateEmployeeLocation } from '@/features/settings/hooks/useLocationManagement'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { MultiSelect } from '@/shared/ui/multi-select'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'

function parentZoneFromLocationName(name: string): string {
  const idx = name.indexOf(' - ')
  if (idx === -1) return name.trim()
  return name.slice(0, idx).trim()
}

export function LocationEmployeeLocationsPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const locationsQuery = useEmployeeLocations()
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
  const locations = locationsQuery.data?.locations ?? []
  const members = locationsQuery.data?.members ?? []

  const filtered = members.filter(m => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.zoneName?.toLowerCase().includes(q) ?? false) ||
      m.floorNames.toLowerCase().includes(q)
    )
  })

  const primaryLocation = locations.find(l => l.id === draftLocationId)
  const parentZone = primaryLocation ? parentZoneFromLocationName(primaryLocation.name) : ''
  const floorOptions = locations
    .filter(l => !parentZone || parentZoneFromLocationName(l.name) === parentZone)
    .map(l => {
      const idx = l.name.indexOf(' - ')
      const label = idx === -1 ? l.name : l.name.slice(idx + 3).trim()
      return { value: l.id, label }
    })

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
          Set each employee&apos;s primary zone (area–branch), floor access within that zone, and
          whether they can access all branches in the zone.
        </p>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <input
        type="search"
        placeholder="Filter by name, zone or floor…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_14rem_1fr_7rem_3rem] gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Employee Name</span>
          <span>Zone Name</span>
          <span>Floor Name</span>
          <span>Access All Zone</span>
          <span className="sr-only">Edit</span>
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((m, i) => (
            <li
              key={m.id}
              className={cn(
                'grid grid-cols-[1fr_14rem_1fr_7rem_3rem] items-center gap-2 px-4 py-3 text-sm',
                i % 2 === 1 && 'bg-muted/15',
              )}
            >
              <span className={cn(!m.isActive && 'text-muted-foreground')}>{m.fullName}</span>
              <span className="truncate" title={m.zoneName ?? undefined}>
                {m.zoneName ?? '—'}
              </span>
              <span className="truncate text-muted-foreground" title={m.floorNames}>
                {m.floorNames || '—'}
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
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">No records found.</li>
          )}
        </ul>
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
                <label className="text-sm font-medium">Zone Name (primary branch)</label>
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
                    <SelectValue placeholder="Select zone / branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="access-all-zone"
                  checked={draftAccessAll}
                  onCheckedChange={v => setDraftAccessAll(v === true)}
                  disabled={!canUpdate || !draftLocationId}
                />
                <label htmlFor="access-all-zone" className="text-sm font-medium">
                  Access All Zone
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Floor Name (branches)</label>
                <MultiSelect
                  options={floorOptions}
                  value={draftFloorIds}
                  onChange={setDraftFloorIds}
                  placeholder="Select one or more floors / branches"
                  disabled={!canUpdate || !draftLocationId || draftAccessAll}
                />
                {draftAccessAll && parentZone && (
                  <p className="text-xs text-muted-foreground">
                    All branches in {parentZone} are included when Access All Zone is enabled.
                  </p>
                )}
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
