import * as React from 'react'
import {
  Download,
  Eye,
  Filter,
  Loader2,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  LocationTreeArea,
  LocationTreeBranch,
  LocationTreeZone,
} from '@/features/settings/location-management/location-management.types'
import {
  citiesForCountry,
  ZONE_COUNTRY_OPTIONS,
} from '@/features/settings/location-management/country-city'
import {
  useCreateLocationBranch,
  useCreateLocationZone,
  useCreateServiceUserArea,
  useDeleteServiceUserArea,
  useLocationManagementTree,
  useUpdateLocationZone,
  useUpdateServiceUserArea,
} from '@/features/settings/hooks/useLocationManagement'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
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
import { GoogleBranchAddressField } from '@/shared/ui/google-branch-address-field'
import {
  GooglePostcodesField,
  type GooglePostcodesValidity,
} from '@/shared/ui/google-postcodes-field'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

function parsePostcodesInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function zoneLookupId(zone: LocationTreeZone): string | null {
  if (zone.lookupZoneId) return zone.lookupZoneId
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(zone.id)) {
    return zone.id
  }
  return null
}

function allPostcodes(zone: LocationTreeZone): string[] {
  return zone.branches.flatMap(b => b.areas.flatMap(a => a.postcodes ?? []))
}

type AreaModalState =
  | { mode: 'create'; zone: LocationTreeZone; branch: LocationTreeBranch }
  | { mode: 'edit'; zone: LocationTreeZone; branch: LocationTreeBranch; area: LocationTreeArea }

type ZoneEditState = { zone: LocationTreeZone }

export function LocationManagementZonesPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const treeQuery = useLocationManagementTree()
  const createZoneMutation = useCreateLocationZone()
  const updateZoneMutation = useUpdateLocationZone()
  const createBranchMutation = useCreateLocationBranch()
  const createAreaMutation = useCreateServiceUserArea()
  const updateAreaMutation = useUpdateServiceUserArea()
  const deleteAreaMutation = useDeleteServiceUserArea()

  const [search, setSearch] = React.useState('')
  const [zoneOpen, setZoneOpen] = React.useState(false)
  const [zoneEdit, setZoneEdit] = React.useState<ZoneEditState | null>(null)
  const [branchOpen, setBranchOpen] = React.useState(false)
  const [viewZone, setViewZone] = React.useState<LocationTreeZone | null>(null)
  const [postcodesZone, setPostcodesZone] = React.useState<LocationTreeZone | null>(null)
  const [areaModal, setAreaModal] = React.useState<AreaModalState | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [zoneName, setZoneName] = React.useState('')
  const [zoneCountry, setZoneCountry] = React.useState('United Kingdom')
  const [zoneCity, setZoneCity] = React.useState('')

  const [branchZoneId, setBranchZoneId] = React.useState('')
  const [branchName, setBranchName] = React.useState('')
  const [branchAddress, setBranchAddress] = React.useState('')

  const [areaName, setAreaName] = React.useState('')
  const [areaPostcodes, setAreaPostcodes] = React.useState('')
  const [areaPostcodesValidity, setAreaPostcodesValidity] =
    React.useState<GooglePostcodesValidity | null>(null)

  const loading = treeQuery.isLoading
  const error =
    treeQuery.error instanceof ApiError
      ? treeQuery.error.message
      : treeQuery.error
        ? 'Could not load location tree.'
        : null
  const zones = treeQuery.data?.zones ?? []

  const cityOptions = React.useMemo(() => citiesForCountry(zoneCountry), [zoneCountry])

  React.useEffect(() => {
    if (zoneCity && !cityOptions.includes(zoneCity)) {
      setZoneCity('')
    }
  }, [cityOptions, zoneCity])

  const stats = React.useMemo(() => {
    const cities = new Set(
      zones.map(z => z.city?.trim()).filter((c): c is string => Boolean(c)),
    )
    const branches = zones.reduce((n, z) => n + (z.branches?.length ?? 0), 0)
    return {
      cities: cities.size,
      zones: zones.length,
      branches,
    }
  }, [zones])

  const filteredZones = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return zones
    return zones.filter(z => {
      const pcs = allPostcodes(z).join(' ').toLowerCase()
      const branchNames = z.branches.map(b => b.name).join(' ').toLowerCase()
      return (
        z.name.toLowerCase().includes(q) ||
        (z.city ?? '').toLowerCase().includes(q) ||
        (z.country ?? '').toLowerCase().includes(q) ||
        branchNames.includes(q) ||
        pcs.includes(q)
      )
    })
  }, [zones, search])

  const zoneOptions = React.useMemo(
    () =>
      zones
        .map(z => ({ id: zoneLookupId(z), name: z.name }))
        .filter((z): z is { id: string; name: string } => Boolean(z.id)),
    [zones],
  )

  function openCreateZone() {
    setZoneName('')
    setZoneCountry('United Kingdom')
    setZoneCity('')
    setZoneOpen(true)
  }

  function openEditZone(zone: LocationTreeZone) {
    setZoneName(zone.name)
    setZoneCountry(zone.country || 'United Kingdom')
    setZoneCity(zone.city || '')
    setZoneEdit({ zone })
  }

  function openCreateBranch(preselectZoneId?: string | null) {
    setBranchZoneId(preselectZoneId || zoneOptions[0]?.id || '')
    setBranchName('')
    setBranchAddress('')
    setBranchOpen(true)
  }

  function openCreateArea(zone: LocationTreeZone, branch: LocationTreeBranch) {
    setAreaName('')
    setAreaPostcodes('')
    setAreaPostcodesValidity(null)
    setAreaModal({ mode: 'create', zone, branch })
  }

  function openEditArea(zone: LocationTreeZone, branch: LocationTreeBranch, area: LocationTreeArea) {
    setAreaName(area.name)
    setAreaPostcodes((area.postcodes ?? []).join('\n'))
    setAreaPostcodesValidity(null)
    setAreaModal({ mode: 'edit', zone, branch, area })
  }

  async function onCreateZone() {
    if (!canUpdate || !zoneName.trim()) return
    setSaving(true)
    try {
      await createZoneMutation.mutateAsync({
        name: zoneName.trim(),
        country: zoneCountry.trim() || undefined,
        city: zoneCity.trim() || undefined,
      })
      toastSuccess('Created', 'Zone added.')
      setZoneOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not create zone')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveZoneEdit() {
    if (!canUpdate || !zoneEdit || !zoneName.trim()) return
    setSaving(true)
    try {
      await updateZoneMutation.mutateAsync({
        zoneId: zoneEdit.zone.id,
        body: {
          name: zoneName.trim(),
          country: zoneCountry.trim() || null,
          city: zoneCity.trim() || null,
        },
      })
      toastSuccess('Saved', 'Zone updated.')
      setZoneEdit(null)
    } catch (e) {
      toastApiError(e, 'Could not update zone')
    } finally {
      setSaving(false)
    }
  }

  async function onCreateBranch() {
    if (!canUpdate || !branchZoneId || !branchName.trim()) return
    setSaving(true)
    try {
      await createBranchMutation.mutateAsync({
        zoneId: branchZoneId,
        name: branchName.trim(),
        address: branchAddress.trim() || undefined,
      })
      toastSuccess('Created', 'Branch added.')
      setBranchOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not create branch')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveArea() {
    if (!canUpdate || !areaModal || !areaName.trim()) return
    const postcodes = parsePostcodesInput(areaPostcodes)
    if (areaPostcodesValidity?.configured) {
      if (areaPostcodesValidity.checking) {
        toastApiError(new Error('Still verifying postcodes with Google. Please wait.'), 'Please wait')
        return
      }
      if (!areaPostcodesValidity.canSubmit) {
        const bad = areaPostcodesValidity.invalid.join(', ') || 'one or more entries'
        toastApiError(
          new Error(`These postcodes were not found: ${bad}`),
          'Invalid postcode',
        )
        return
      }
    }
    setSaving(true)
    try {
      if (areaModal.mode === 'create') {
        await createAreaMutation.mutateAsync({
          scheduleAreaId: areaModal.branch.scheduleAreaId,
          name: areaName.trim(),
          postcodes,
        })
        toastSuccess('Created', 'Service area created.')
      } else {
        await updateAreaMutation.mutateAsync({
          areaId: areaModal.area.id,
          body: { name: areaName.trim(), postcodes },
        })
        toastSuccess('Saved', 'Service area updated.')
      }
      setAreaModal(null)
      void treeQuery.refetch()
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteArea() {
    if (!canUpdate || areaModal?.mode !== 'edit') return
    if (!window.confirm(`Delete area “${areaModal.area.name}”? Service users must be unassigned first.`)) {
      return
    }
    setSaving(true)
    try {
      await deleteAreaMutation.mutateAsync(areaModal.area.id)
      toastSuccess('Deleted', 'Service area removed.')
      setAreaModal(null)
    } catch (e) {
      toastApiError(e, 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    const header = ['Zone', 'Status', 'Country', 'City', 'Branches', 'Postcodes']
    const lines = filteredZones.map(z => {
      const pcs = allPostcodes(z)
      const status = (z.branches?.length ?? 0) > 0 ? 'Active' : 'Unassigned'
      return [
        z.name,
        status,
        z.country ?? '',
        z.city ?? '',
        String(z.branches?.length ?? 0),
        String(pcs.length),
      ]
        .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    })
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'zones.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const liveViewZone =
    viewZone == null ? null : (zones.find(z => z.id === viewZone.id) ?? viewZone)
  const livePostcodesZone =
    postcodesZone == null ? null : (zones.find(z => z.id === postcodesZone.id) ?? postcodesZone)

  return (
    <div className="space-y-5" data-testid="location-management-zones-panel">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Zones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Service areas, postcodes, and branch locations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          {canUpdate ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => openCreateBranch()}
                disabled={zoneOptions.length === 0}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add branch
              </Button>
              <Button type="button" onClick={openCreateZone}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Zone
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total cities"
          value={stats.cities}
          accent="border-l-violet-500"
          icon={<Users className="h-4 w-4 text-violet-600" />}
        />
        <StatCard
          label="Total zones"
          value={stats.zones}
          accent="border-l-sky-500"
          icon={<MapPinned className="h-4 w-4 text-sky-600" />}
        />
        <StatCard
          label="Total branches"
          value={stats.branches}
          accent="border-l-emerald-500"
          icon={<RefreshCw className="h-4 w-4 text-emerald-600" />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by zone name, city, postcode..."
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" disabled title="Coming soon">
          <Filter className="mr-1.5 h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Postcodes</th>
              <th className="px-4 py-3 font-medium">Branches</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredZones.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No zones match your search.
                </td>
              </tr>
            ) : (
              filteredZones.map(zone => {
                const pcs = allPostcodes(zone)
                const preview = pcs.slice(0, 3).join(', ')
                const extra = pcs.length > 3 ? ` +${pcs.length - 3}` : ''
                const branchCount = zone.branches?.length ?? 0
                const status = branchCount > 0 ? 'Active' : 'Unassigned'
                const lookupId = zoneLookupId(zone)
                return (
                  <tr key={zone.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{zone.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {[zone.city, preview ? `${preview}${extra}` : null]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                        ID {zone.code || zone.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'font-normal',
                          status === 'Unassigned' && 'bg-slate-100 text-slate-700',
                          status === 'Active' && 'bg-emerald-500/10 text-emerald-800',
                        )}
                      >
                        <span
                          className={cn(
                            'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                            status === 'Unassigned' ? 'bg-slate-400' : 'bg-emerald-500',
                          )}
                        />
                        {status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">{zone.city || '—'}</td>
                    <td className="px-4 py-3.5 font-medium">
                      <button
                        type="button"
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-left underline-offset-2',
                          pcs.length > 0
                            ? 'text-primary hover:bg-primary/5 hover:underline'
                            : 'cursor-default text-muted-foreground',
                        )}
                        disabled={pcs.length === 0}
                        onClick={() => setPostcodesZone(zone)}
                        title={pcs.length > 0 ? 'View postcodes' : 'No postcodes'}
                      >
                        {pcs.length} {pcs.length === 1 ? 'code' : 'codes'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium">{branchCount}</div>
                      <div className="text-xs text-muted-foreground">
                        {branchCount === 0 ? '0 Unassigned' : `${zone.branches.reduce((n, b) => n + (b.areas?.length ?? 0), 0)} areas`}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          title="View"
                          onClick={() => setViewZone(zone)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canUpdate ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              title="Edit zone"
                              onClick={() => openEditZone(zone)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {lookupId ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                title="Add branch"
                                onClick={() => openCreateBranch(lookupId)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit zone */}
      <Dialog
        open={zoneOpen || Boolean(zoneEdit)}
        onOpenChange={open => {
          if (!open) {
            setZoneOpen(false)
            setZoneEdit(null)
          }
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{zoneEdit ? 'Edit zone' : 'Add Zone'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="lm-zone-name" className="text-sm font-medium">
                Zone name
              </label>
              <Input
                id="lm-zone-name"
                value={zoneName}
                onChange={e => setZoneName(e.target.value)}
                placeholder="e.g. Croydon"
              />
            </div>
            <CountryCityFields
              country={zoneCountry}
              city={zoneCity}
              onCountryChange={setZoneCountry}
              onCityChange={setZoneCity}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setZoneOpen(false)
                setZoneEdit(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void (zoneEdit ? onSaveZoneEdit() : onCreateZone())}
              disabled={saving || !zoneName.trim()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {zoneEdit ? 'Save' : 'Create zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add branch + Google address */}
      <Dialog open={branchOpen} onOpenChange={setBranchOpen}>
        <DialogContent
          size="md"
          onPointerDownOutside={e => {
            // Keep dialog open when clicking our portaled address suggestions.
            if (e.target instanceof Element && e.target.closest('[role="listbox"]')) {
              e.preventDefault()
            }
          }}
          onInteractOutside={e => {
            if (e.target instanceof Element && e.target.closest('[role="listbox"]')) {
              e.preventDefault()
            }
          }}
          onFocusOutside={e => {
            if (e.target instanceof Element && e.target.closest('[role="listbox"]')) {
              e.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Add branch</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="lm-branch-zone" className="text-sm font-medium">
                Zone
              </label>
              <select
                id="lm-branch-zone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={branchZoneId}
                onChange={e => setBranchZoneId(e.target.value)}
              >
                <option value="">Select zone</option>
                {zoneOptions.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="lm-branch-name" className="text-sm font-medium">
                Branch name
              </label>
              <Input
                id="lm-branch-name"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="e.g. Croydon 1"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lm-branch-address" className="text-sm font-medium">
                Address
              </label>
              <GoogleBranchAddressField
                id="lm-branch-address"
                value={branchAddress}
                onChange={addr => setBranchAddress(addr)}
                countryRestriction={
                  ZONE_COUNTRY_OPTIONS.find(c => c.name === (
                    zones.find(z => zoneLookupId(z) === branchZoneId)?.country ?? 'United Kingdom'
                  ))?.code.toLowerCase() ?? 'gb'
                }
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBranchOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onCreateBranch()}
              disabled={saving || !branchZoneId || !branchName.trim()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View zone detail */}
      <Dialog open={Boolean(liveViewZone)} onOpenChange={open => (!open ? setViewZone(null) : undefined)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{liveViewZone?.name ?? 'Zone'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {liveViewZone ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {[liveViewZone.country, liveViewZone.city].filter(Boolean).join(' · ') ||
                    'No country/city set'}
                </p>
                {canUpdate && zoneLookupId(liveViewZone) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openCreateBranch(zoneLookupId(liveViewZone))}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add branch
                  </Button>
                ) : null}
                {(liveViewZone.branches?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No branches in this zone yet.</p>
                ) : (
                  <div className="space-y-3">
                    {liveViewZone.branches.map(branch => (
                      <div key={branch.id} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{branch.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {branch.address || 'No address'}
                            </p>
                          </div>
                          {canUpdate ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => openCreateArea(liveViewZone, branch)}
                            >
                              + Area
                            </Button>
                          ) : null}
                        </div>
                        {(branch.areas?.length ?? 0) > 0 ? (
                          <ul className="mt-2 space-y-1 border-t border-border pt-2">
                            {branch.areas.map(area => (
                              <li
                                key={area.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPinned className="h-3.5 w-3.5 text-amber-700" />
                                  {area.name}
                                  <span className="text-xs text-muted-foreground">
                                    ({area.postcodes?.length ?? 0} PC)
                                  </span>
                                </span>
                                {canUpdate ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => openEditArea(liveViewZone, branch, area)}
                                  >
                                    <Pencil className="mr-1 h-3 w-3" />
                                    Edit
                                  </Button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">No service areas yet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewZone(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone postcodes (from Postcodes / codes column) */}
      <Dialog
        open={Boolean(livePostcodesZone)}
        onOpenChange={open => (!open ? setPostcodesZone(null) : undefined)}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {livePostcodesZone ? `${livePostcodesZone.name} postcodes` : 'Postcodes'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {livePostcodesZone ? (
              allPostcodes(livePostcodesZone).length === 0 ? (
                <p className="text-sm text-muted-foreground">No postcodes in this zone yet.</p>
              ) : (
                <div className="space-y-3">
                  {livePostcodesZone.branches.map(branch => {
                    const areasWithPcs = (branch.areas ?? []).filter(
                      a => (a.postcodes?.length ?? 0) > 0,
                    )
                    if (areasWithPcs.length === 0) return null
                    return (
                      <div key={branch.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium">{branch.name}</p>
                        <ul className="mt-2 space-y-3">
                          {areasWithPcs.map(area => (
                            <li key={area.id}>
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {area.name}
                                </p>
                                {canUpdate ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      setPostcodesZone(null)
                                      openEditArea(livePostcodesZone, branch, area)
                                    }}
                                  >
                                    <Pencil className="mr-1 h-3 w-3" />
                                    Edit
                                  </Button>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {(area.postcodes ?? []).map(pc => (
                                  <Badge key={pc} variant="secondary" className="font-normal">
                                    {pc}
                                  </Badge>
                                ))}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPostcodesZone(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service area modal */}
      <Dialog open={Boolean(areaModal)} onOpenChange={open => (!open ? setAreaModal(null) : undefined)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {areaModal?.mode === 'edit' ? 'Edit service area' : 'Add service area'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {areaModal ? (
              <p className="text-sm text-muted-foreground">
                {areaModal.zone.name} · {areaModal.branch.name}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="lm-area-name" className="text-sm font-medium">
                Area name
              </label>
              <Input
                id="lm-area-name"
                value={areaName}
                onChange={e => setAreaName(e.target.value)}
                placeholder="e.g. South Croydon"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lm-area-postcodes" className="text-sm font-medium">
                Postcodes
              </label>
              <GooglePostcodesField
                id="lm-area-postcodes"
                value={areaPostcodes}
                onChange={setAreaPostcodes}
                onValidityChange={setAreaPostcodesValidity}
                countryCode={
                  ZONE_COUNTRY_OPTIONS.find(
                    c =>
                      c.name ===
                      (areaModal?.zone.country ?? 'United Kingdom'),
                  )?.code.toLowerCase() ?? 'gb'
                }
                disabled={saving}
              />
            </div>
          </DialogBody>
          <DialogFooter className="justify-between sm:justify-between">
            <div>
              {areaModal?.mode === 'edit' ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void onDeleteArea()}
                  disabled={saving}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setAreaModal(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void onSaveArea()}
                disabled={
                  saving ||
                  !areaName.trim() ||
                  Boolean(areaPostcodesValidity?.configured && !areaPostcodesValidity.canSubmit) ||
                  Boolean(areaPostcodesValidity?.checking)
                }
              >
                {saving || areaPostcodesValidity?.checking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {areaModal?.mode === 'edit' ? 'Save' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CountryCityFields({
  country,
  city,
  onCountryChange,
  onCityChange,
}: {
  country: string
  city: string
  onCountryChange: (v: string) => void
  onCityChange: (v: string) => void
}) {
  const cityOptions = citiesForCountry(country)
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">Country</label>
        <Select
          value={country}
          onValueChange={v => {
            onCountryChange(v)
            onCityChange('')
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {ZONE_COUNTRY_OPTIONS.map(c => (
              <SelectItem key={c.code} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">City</label>
        <Select
          value={city || undefined}
          onValueChange={onCityChange}
          disabled={!country || cityOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={country ? 'Select city' : 'Select country first'} />
          </SelectTrigger>
          <SelectContent>
            {cityOptions.map(c => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: number
  accent: string
  icon: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border border-l-4 bg-card px-4 py-3 shadow-sm',
        accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className="rounded-md bg-muted/60 p-2">{icon}</div>
      </div>
    </div>
  )
}
