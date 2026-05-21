import * as React from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchServiceUserLocations,
  updateServiceUserLocation,
} from '@/features/settings/location-management/location-management.api'
import type {
  LocationLookup,
  LocationZoneOption,
  ServiceUserLocationRow,
} from '@/features/settings/location-management/location-management.types'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

export function LocationServiceUserLocationsPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [zones, setZones] = React.useState<LocationZoneOption[]>([])
  const [locations, setLocations] = React.useState<LocationLookup[]>([])
  const [members, setMembers] = React.useState<ServiceUserLocationRow[]>([])
  const [filter, setFilter] = React.useState('')
  const [editing, setEditing] = React.useState<ServiceUserLocationRow | null>(null)
  const [draftZoneKey, setDraftZoneKey] = React.useState('')
  const [draftLocationId, setDraftLocationId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchServiceUserLocations()
      setZones(data.zones)
      setLocations(data.locations)
      setMembers(data.members)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load service users.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = members.filter(m => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.zoneName?.toLowerCase().includes(q) ?? false) ||
      (m.roomName?.toLowerCase().includes(q) ?? false)
    )
  })

  const selectedZone = zones.find(z => z.id === draftZoneKey) ?? null
  const branchOptions = selectedZone?.branches ?? []

  function openEdit(row: ServiceUserLocationRow) {
    setEditing(row)
    setDraftZoneKey(row.zoneName ?? '')
    setDraftLocationId(row.locationId)
  }

  async function onSaveEdit() {
    if (!canUpdate || !editing) return
    setSaving(true)
    try {
      const updated = await updateServiceUserLocation(editing.id, draftLocationId)
      setMembers(prev => prev.map(m => (m.id === editing.id ? { ...m, ...updated } : m)))
      toastSuccess('Saved', 'Service user location updated.')
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
    <div className="space-y-4" data-testid="location-management-service-users-panel">
      <div>
        <h3 className="text-sm font-semibold text-primary">Service User Location Management</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign each service user to a zone and room (branch). They appear under the matching
          branch in the location tree.
        </p>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <input
        type="search"
        placeholder="Filter by name, zone or room…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_10rem_10rem_3rem] gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Service User Name</span>
          <span>Zone Name</span>
          <span>Room Name</span>
          <span className="sr-only">Edit</span>
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((m, i) => (
            <li
              key={m.id}
              className={cn(
                'grid grid-cols-[1fr_10rem_10rem_3rem] items-center gap-2 px-4 py-3 text-sm',
                i % 2 === 1 && 'bg-muted/15',
              )}
            >
              <span className={cn(!m.isActive && 'text-muted-foreground')}>{m.fullName}</span>
              <span>{m.zoneName ?? '—'}</span>
              <span>{m.roomName ?? '—'}</span>
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
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Edit service user location</DialogTitle>
          </DialogHeader>
          {editing && (
            <DialogBody className="space-y-4">
              <p className="text-sm text-muted-foreground">{editing.fullName}</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Zone Name</label>
                <Select
                  value={draftZoneKey || '__none__'}
                  onValueChange={v => {
                    const key = v === '__none__' ? '' : v
                    setDraftZoneKey(key)
                    setDraftLocationId(null)
                  }}
                  disabled={!canUpdate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {zones.map(z => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Room Name</label>
                <Select
                  value={draftLocationId ?? '__none__'}
                  onValueChange={v => setDraftLocationId(v === '__none__' ? null : v)}
                  disabled={!canUpdate || !draftZoneKey}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {branchOptions.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
