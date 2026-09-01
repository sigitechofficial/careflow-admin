import * as React from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  ServiceUserLocationRow,
} from '@/features/settings/location-management/location-management.types'
import { useUpdateServiceUserLocation, useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
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
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'

function normalizePostcodeKey(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

export function LocationServiceUserLocationsPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const locationsQuery = useServiceUserLocations()
  const updateMutation = useUpdateServiceUserLocation()
  const [saving, setSaving] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const [editing, setEditing] = React.useState<ServiceUserLocationRow | null>(null)
  const [draftZoneKey, setDraftZoneKey] = React.useState('')
  const [draftLocationId, setDraftLocationId] = React.useState<string | null>(null)
  const [draftAreaId, setDraftAreaId] = React.useState<string | null>(null)
  const [draftPostcode, setDraftPostcode] = React.useState<string | null>(null)

  const loading = locationsQuery.isLoading
  const error =
    locationsQuery.error instanceof ApiError
      ? locationsQuery.error.message
      : locationsQuery.error
        ? 'Could not load service users.'
        : null
  const zones = locationsQuery.data?.zones ?? []
  const members = locationsQuery.data?.members ?? []

  const filtered = members.filter(m => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return (
      m.fullName.toLowerCase().includes(q) ||
      (m.zoneName?.toLowerCase().includes(q) ?? false) ||
      (m.roomName?.toLowerCase().includes(q) ?? false) ||
      (m.serviceUserAreaName?.toLowerCase().includes(q) ?? false) ||
      (m.postcode?.toLowerCase().includes(q) ?? false)
    )
  })

  const selectedZone = zones.find(z => z.id === draftZoneKey) ?? null
  const branchOptions = selectedZone?.branches ?? []
  const selectedBranch = branchOptions.find(b => b.id === draftLocationId) ?? null
  const areaOptions = selectedBranch?.areas ?? []
  const selectedArea = areaOptions.find(a => a.id === draftAreaId) ?? null
  const areaPostcodes = selectedArea?.postcodes ?? []

  function openEdit(row: ServiceUserLocationRow) {
    setEditing(row)
    setDraftZoneKey(row.zoneName ?? '')
    setDraftLocationId(row.locationId)
    setDraftAreaId(row.serviceUserAreaId)
    const pcs = row.serviceUserAreaPostcodes ?? []
    const match = row.postcode
      ? pcs.find(p => normalizePostcodeKey(p) === normalizePostcodeKey(row.postcode!))
      : undefined
    setDraftPostcode(match ?? row.postcode)
  }

  function pickPostcodeForArea(areaId: string | null, preferred: string | null) {
    if (!areaId) return null
    const area = areaOptions.find(a => a.id === areaId) ??
      zones
        .flatMap(z => z.branches)
        .flatMap(b => b.areas)
        .find(a => a.id === areaId)
    const pcs = area?.postcodes ?? []
    if (!pcs.length) return preferred
    if (preferred && pcs.some(p => normalizePostcodeKey(p) === normalizePostcodeKey(preferred))) {
      return pcs.find(p => normalizePostcodeKey(p) === normalizePostcodeKey(preferred)) ?? preferred
    }
    return null
  }

  async function onSaveEdit() {
    if (!canUpdate || !editing) return
    setSaving(true)
    try {
      await updateMutation.mutateAsync({
        serviceUserId: editing.id,
        body: {
          locationId: draftLocationId,
          serviceUserAreaId: draftAreaId,
          postcode: draftPostcode,
        },
      })
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
          Assign each service user to a zone, branch, area and postcode. They appear under the
          matching area in the location tree.
        </p>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <input
        type="search"
        placeholder="Filter by name, zone, branch, area or postcode…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_7rem_7rem_7rem_6rem_3rem] gap-2 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Service User Name</span>
          <span>Zone</span>
          <span>Branch</span>
          <span>Area</span>
          <span>Postcode</span>
          <span className="sr-only">Edit</span>
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((m, i) => (
            <li
              key={m.id}
              className={cn(
                'grid grid-cols-[1fr_7rem_7rem_7rem_6rem_3rem] items-center gap-2 px-4 py-3 text-sm',
                i % 2 === 1 && 'bg-muted/15',
              )}
            >
              <span className={cn(!m.isActive && 'text-muted-foreground')}>{m.fullName}</span>
              <span>{m.zoneName ?? '—'}</span>
              <span>{m.roomName ?? '—'}</span>
              <span>{m.serviceUserAreaName ?? '—'}</span>
              <span>{m.postcode ?? '—'}</span>
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
                <label className="text-sm font-medium">Zone</label>
                <Select
                  value={draftZoneKey || '__none__'}
                  onValueChange={v => {
                    const key = v === '__none__' ? '' : v
                    setDraftZoneKey(key)
                    setDraftLocationId(null)
                    setDraftAreaId(null)
                    setDraftPostcode(null)
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
                <label className="text-sm font-medium">Branch</label>
                <Select
                  value={draftLocationId ?? '__none__'}
                  onValueChange={v => {
                    setDraftLocationId(v === '__none__' ? null : v)
                    setDraftAreaId(null)
                    setDraftPostcode(null)
                  }}
                  disabled={!canUpdate || !draftZoneKey}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Area</label>
                <Select
                  value={draftAreaId ?? '__none__'}
                  onValueChange={v => {
                    const nextAreaId = v === '__none__' ? null : v
                    setDraftAreaId(nextAreaId)
                    setDraftPostcode(pickPostcodeForArea(nextAreaId, draftPostcode))
                  }}
                  disabled={!canUpdate || !draftLocationId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        areaOptions.length ? 'Select area' : 'No areas on this branch'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {areaOptions.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Postcode</label>
                <Select
                  value={draftPostcode ?? '__none__'}
                  onValueChange={v => setDraftPostcode(v === '__none__' ? null : v)}
                  disabled={!canUpdate || !draftAreaId || areaPostcodes.length === 0}
                >
                  <SelectTrigger data-testid="service-user-location-postcode-select">
                    <SelectValue
                      placeholder={
                        !draftAreaId
                          ? 'Choose area first'
                          : areaPostcodes.length
                            ? 'Select postcode'
                            : 'No postcodes on this area'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {draftPostcode &&
                    !areaPostcodes.some(
                      p => normalizePostcodeKey(p) === normalizePostcodeKey(draftPostcode),
                    ) ? (
                      <SelectItem value={draftPostcode}>
                        {draftPostcode} (current)
                      </SelectItem>
                    ) : null}
                    {areaPostcodes.map(pc => (
                      <SelectItem key={pc} value={pc}>
                        {pc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draftAreaId && areaPostcodes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add postcodes to this area under the Zones tab first.
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
