import * as React from 'react'
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  GitBranch,
  Layers,
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
  LocationAuditFields,
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
import { formatLocationAuditLine } from '@/features/settings/location-management/location-management-audit'
import { filterZonesByHierarchy } from '@/features/settings/location-management/location-management-hierarchy.util'
import type { LocationManagementHierarchyState } from '@/features/settings/hooks/useLocationManagementHierarchyFilters'
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

function branchPostcodes(branch: LocationTreeBranch): string[] {
  return (branch.areas ?? []).flatMap(a => a.postcodes ?? [])
}

function namesEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function zoneHasBranches(zone: LocationTreeZone): boolean {
  return (zone.branches?.length ?? 0) > 0
}

/** Keep zones with branches first; empty / “No branch” zones last. */
function zonesBranchesFirst(zones: LocationTreeZone[]): LocationTreeZone[] {
  const withBranches: LocationTreeZone[] = []
  const empty: LocationTreeZone[] = []
  for (const zone of zones) {
    if (zoneHasBranches(zone)) withBranches.push(zone)
    else empty.push(zone)
  }
  return [...withBranches, ...empty]
}

/** Hide "Haringey" / "Haringey - Haringey" when it repeats the branch name. */
function branchLocationSubtitle(branch: LocationTreeBranch): string | null {
  const raw = branch.locationName?.trim()
  if (!raw) return null
  if (namesEqual(raw, branch.name)) return null
  const parts = raw.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean)
  const first = parts[0]
  if (parts.length >= 2 && first && parts.every(p => namesEqual(p, first))) return null
  return raw
}

const LOCATION_MGMT_VIEW_KEY = 'care-location-mgmt-view'

type LocationMgmtTableView = 'branch' | 'zone'

function readLocationMgmtView(): LocationMgmtTableView {
  try {
    return window.localStorage.getItem(LOCATION_MGMT_VIEW_KEY) === 'zone' ? 'zone' : 'branch'
  } catch {
    return 'branch'
  }
}

function persistLocationMgmtView(view: LocationMgmtTableView) {
  try {
    window.localStorage.setItem(LOCATION_MGMT_VIEW_KEY, view)
  } catch {
    /* ignore quota / private mode */
  }
}

type TreeRow =
  | { kind: 'zone'; key: string; zone: LocationTreeZone }
  | { kind: 'branch'; key: string; zone: LocationTreeZone; branch: LocationTreeBranch }
  | { kind: 'area'; key: string; zone: LocationTreeZone; branch: LocationTreeBranch; area: LocationTreeArea }
  | { kind: 'empty-zone'; key: string; zone: LocationTreeZone }

type AreaModalState =
  | { mode: 'create'; zone: LocationTreeZone; branch: LocationTreeBranch }
  | { mode: 'edit'; zone: LocationTreeZone; branch: LocationTreeBranch; area: LocationTreeArea }

type ZoneEditState = { zone: LocationTreeZone }
type PostcodesViewState = { zone: LocationTreeZone; branch: LocationTreeBranch | null }

export function LocationManagementZonesPanel({
  filters,
}: {
  filters: LocationManagementHierarchyState
}) {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const treeQuery = useLocationManagementTree()
  const createZoneMutation = useCreateLocationZone()
  const updateZoneMutation = useUpdateLocationZone()
  const createBranchMutation = useCreateLocationBranch()
  const createAreaMutation = useCreateServiceUserArea()
  const updateAreaMutation = useUpdateServiceUserArea()
  const deleteAreaMutation = useDeleteServiceUserArea()

  const [search, setSearch] = React.useState('')
  const [tableView, setTableView] = React.useState<LocationMgmtTableView>(() => readLocationMgmtView())
  const [collapsedZoneIds, setCollapsedZoneIds] = React.useState<Set<string>>(() => new Set())
  const [expandedBranchIds, setExpandedBranchIds] = React.useState<Set<string>>(() => new Set())
  const [zoneOpen, setZoneOpen] = React.useState(false)
  const [zoneEdit, setZoneEdit] = React.useState<ZoneEditState | null>(null)
  const [branchOpen, setBranchOpen] = React.useState(false)
  const [viewZone, setViewZone] = React.useState<LocationTreeZone | null>(null)
  const [postcodesView, setPostcodesView] = React.useState<PostcodesViewState | null>(null)
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
  const hierarchyZones = React.useMemo(
    () =>
      filterZonesByHierarchy(zones, {
        zoneId: filters.zoneId,
        branchLocationId: filters.branchLocationId,
        areaId: filters.areaId,
      }),
    [zones, filters.zoneId, filters.branchLocationId, filters.areaId],
  )

  const cityOptions = React.useMemo(() => citiesForCountry(zoneCountry), [zoneCountry])

  React.useEffect(() => {
    if (zoneCity && !cityOptions.includes(zoneCity)) {
      setZoneCity('')
    }
  }, [cityOptions, zoneCity])

  const stats = React.useMemo(() => {
    const cities = new Set(
      hierarchyZones.map(z => z.city?.trim()).filter((c): c is string => Boolean(c)),
    )
    const branches = hierarchyZones.reduce((n, z) => n + (z.branches?.length ?? 0), 0)
    return {
      cities: cities.size,
      zones: hierarchyZones.length,
      branches,
    }
  }, [hierarchyZones])

  const filteredZones = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = !q
      ? hierarchyZones
      : hierarchyZones.filter(z => {
          const pcs = allPostcodes(z).join(' ').toLowerCase()
          const branchNames = z.branches.map(b => b.name).join(' ').toLowerCase()
          const addresses = z.branches.map(b => b.address ?? '').join(' ').toLowerCase()
          const areaNames = z.branches
            .flatMap(b => (b.areas ?? []).map(a => a.name))
            .join(' ')
            .toLowerCase()
          return (
            z.name.toLowerCase().includes(q) ||
            (z.city ?? '').toLowerCase().includes(q) ||
            (z.country ?? '').toLowerCase().includes(q) ||
            branchNames.includes(q) ||
            addresses.includes(q) ||
            areaNames.includes(q) ||
            pcs.includes(q)
          )
        })
    return zonesBranchesFirst(matched)
  }, [hierarchyZones, search])

  const prevSearchRef = React.useRef(search)
  React.useEffect(() => {
    if (prevSearchRef.current === search) return
    prevSearchRef.current = search
    const q = search.trim().toLowerCase()
    if (!q) {
      setCollapsedZoneIds(new Set())
      setExpandedBranchIds(new Set())
      return
    }
    const nextBranches = new Set<string>()
    for (const zone of zones) {
      for (const branch of zone.branches ?? []) {
        const areaHit = (branch.areas ?? []).some(
          a =>
            a.name.toLowerCase().includes(q) ||
            (a.postcodes ?? []).some(pc => pc.toLowerCase().includes(q)),
        )
        if (areaHit) nextBranches.add(branch.id)
      }
    }
    setCollapsedZoneIds(new Set())
    setExpandedBranchIds(nextBranches)
  }, [search, zones])

  React.useEffect(() => {
    if (!filters.zoneId && !filters.branchLocationId && !filters.areaId) return
    const zone = hierarchyZones.find(z => z.id === filters.zoneId) ?? hierarchyZones[0]
    if (!zone) return
    setCollapsedZoneIds(prev => {
      const next = new Set(prev)
      next.delete(zone.id)
      return next
    })
    if (!filters.areaId) return
    const branch = zone.branches.find(b => b.locationId === filters.branchLocationId)
    if (!branch) return
    setExpandedBranchIds(prev => {
      if (prev.has(branch.id)) return prev
      const next = new Set(prev)
      next.add(branch.id)
      return next
    })
  }, [filters.zoneId, filters.branchLocationId, filters.areaId, hierarchyZones])

  const treeRows = React.useMemo((): TreeRow[] => {
    const rows: TreeRow[] = []
    if (tableView === 'branch') {
      for (const zone of filteredZones) {
        const branches = zone.branches ?? []
        if (branches.length === 0) {
          rows.push({ kind: 'empty-zone', key: `empty-zone:${zone.id}`, zone })
          continue
        }
        for (const branch of branches) {
          rows.push({ kind: 'branch', key: `branch:${zone.id}:${branch.id}`, zone, branch })
          if (!expandedBranchIds.has(branch.id)) continue
          for (const area of branch.areas ?? []) {
            rows.push({
              kind: 'area',
              key: `area:${zone.id}:${branch.id}:${area.id}`,
              zone,
              branch,
              area,
            })
          }
        }
      }
      return rows
    }

    for (const zone of filteredZones) {
      rows.push({ kind: 'zone', key: `zone:${zone.id}`, zone })
      if (collapsedZoneIds.has(zone.id)) continue
      for (const branch of zone.branches ?? []) {
        rows.push({ kind: 'branch', key: `branch:${zone.id}:${branch.id}`, zone, branch })
        if (!expandedBranchIds.has(branch.id)) continue
        for (const area of branch.areas ?? []) {
          rows.push({
            kind: 'area',
            key: `area:${zone.id}:${branch.id}:${area.id}`,
            zone,
            branch,
            area,
          })
        }
      }
    }
    return rows
  }, [filteredZones, tableView, collapsedZoneIds, expandedBranchIds])

  function setLocationTableView(next: LocationMgmtTableView) {
    setTableView(next)
    persistLocationMgmtView(next)
  }

  function toggleZoneExpanded(zoneId: string) {
    setCollapsedZoneIds(prev => {
      const next = new Set(prev)
      if (next.has(zoneId)) next.delete(zoneId)
      else next.add(zoneId)
      return next
    })
  }

  function toggleBranchExpanded(branchId: string) {
    setExpandedBranchIds(prev => {
      const next = new Set(prev)
      if (next.has(branchId)) next.delete(branchId)
      else next.add(branchId)
      return next
    })
  }

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
        toastSuccess('Created', 'Area created.')
      } else {
        await updateAreaMutation.mutateAsync({
          areaId: areaModal.area.id,
          body: { name: areaName.trim(), postcodes },
        })
        toastSuccess('Saved', 'Area updated.')
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
      toastSuccess('Deleted', 'Area removed.')
      setAreaModal(null)
    } catch (e) {
      toastApiError(e, 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    const header = ['Type', 'Zone', 'Branch', 'Area', 'City', 'Address', 'Postcodes']
    const lines: string[] = []
    for (const zone of filteredZones) {
      lines.push(
        ['Zone', zone.name, '', '', zone.city ?? '', '', allPostcodes(zone).join('; ')]
          .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      )
      for (const branch of zone.branches ?? []) {
        lines.push(
          [
            'Branch',
            zone.name,
            branch.name,
            '',
            zone.city ?? '',
            branch.address ?? '',
            branchPostcodes(branch).join('; '),
          ]
            .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
            .join(','),
        )
        for (const area of branch.areas ?? []) {
          lines.push(
            [
              'Area',
              zone.name,
              branch.name,
              area.name,
              zone.city ?? '',
              '',
              (area.postcodes ?? []).join('; '),
            ]
              .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
              .join(','),
          )
        }
      }
    }
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'zones-branches.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const liveViewZone =
    viewZone == null ? null : (zones.find(z => z.id === viewZone.id) ?? viewZone)
  const livePostcodesView = React.useMemo(() => {
    if (!postcodesView) return null
    const zone = zones.find(z => z.id === postcodesView.zone.id) ?? postcodesView.zone
    if (!postcodesView.branch) return { zone, branch: null as LocationTreeBranch | null }
    const branch =
      zone.branches.find(b => b.id === postcodesView.branch!.id) ?? postcodesView.branch
    return { zone, branch }
  }, [postcodesView, zones])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            Zones, branches, areas, and postcodes.
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
            placeholder="Search by zone, branch, area, city, postcode..."
            className="pl-9"
          />
        </div>
        <div
          className="inline-flex rounded-xl border border-border bg-card p-0.5 shadow-sm"
          role="group"
          aria-label="Location table view"
        >
          <button
            type="button"
            aria-pressed={tableView === 'branch'}
            data-testid="location-mgmt-view-branch"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
              tableView === 'branch'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => setLocationTableView('branch')}
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden />
            Branch view
          </button>
          <button
            type="button"
            aria-pressed={tableView === 'zone'}
            data-testid="location-mgmt-view-zone"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
              tableView === 'zone'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => setLocationTableView('zone')}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Zone view
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {tableView === 'branch' ? (
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">Areas</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Postcodes</th>
                <th className="px-4 py-3 font-medium">Added / Updated</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {treeRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {search.trim() ? 'No branches match your search.' : 'No branches yet.'}
                  </td>
                </tr>
              ) : (
                treeRows.map(row => {
                  if (row.kind === 'empty-zone') {
                    const { zone } = row
                    const lookupId = zoneLookupId(zone)
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-border bg-muted/10 last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3.5 text-muted-foreground">No branches</td>
                        <td className="px-4 py-3.5">
                          <ZoneNameCell
                            zone={zone}
                            canUpdate={canUpdate}
                            onView={() => setViewZone(zone)}
                            onEdit={() => openEditZone(zone)}
                          />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">—</td>
                        <td className="px-4 py-3.5">{zone.city || '—'}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">—</td>
                        <td className="px-4 py-3.5">
                          <AuditCell audit={zone} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge />
                        </td>
                        <td className="px-4 py-3.5">
                          <ZoneActions
                            canUpdate={canUpdate}
                            lookupId={lookupId}
                            onView={() => setViewZone(zone)}
                            onEdit={() => openEditZone(zone)}
                            onAddBranch={() => openCreateBranch(lookupId)}
                          />
                        </td>
                      </tr>
                    )
                  }

                  if (row.kind === 'branch') {
                    const { zone, branch } = row
                    const areaCount = branch.areas?.length ?? 0
                    const expanded = expandedBranchIds.has(branch.id)
                    const pcs = branchPostcodes(branch)
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-1">
                            <ExpandToggle
                              expanded={expanded}
                              visible={areaCount > 0}
                              label={branch.name}
                              onToggle={() => toggleBranchExpanded(branch.id)}
                            />
                            <div className="font-medium text-foreground">{branch.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <ZoneNameCell
                            zone={zone}
                            canUpdate={canUpdate}
                            onView={() => setViewZone(zone)}
                            onEdit={() => openEditZone(zone)}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <AreasCountCell
                            count={areaCount}
                            expanded={expanded}
                            label={branch.name}
                            onToggle={() => toggleBranchExpanded(branch.id)}
                          />
                        </td>
                        <td className="max-w-[260px] px-4 py-3.5">
                          <BranchPlaceCell zone={zone} branch={branch} />
                        </td>
                        <td className="px-4 py-3.5 font-medium">
                          <PostcodesTrigger
                            count={pcs.length}
                            onClick={() => setPostcodesView({ zone, branch })}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <AuditCell audit={branch} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge />
                        </td>
                        <td className="px-4 py-3.5">
                          <BranchActions
                            canUpdate={canUpdate}
                            hasPostcodes={pcs.length > 0}
                            onViewPostcodes={() => setPostcodesView({ zone, branch })}
                            onAddArea={() => openCreateArea(zone, branch)}
                          />
                        </td>
                      </tr>
                    )
                  }

                  if (row.kind !== 'area') return null
                  const { zone, branch, area } = row
                  const areaPcs = area.postcodes ?? []
                  return (
                    <tr
                      key={row.key}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1 pl-6">
                          <span className="inline-block w-6 shrink-0" aria-hidden />
                          <div className="font-medium text-foreground">{area.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground/70">{zone.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">—</td>
                      <td className="px-4 py-3 text-muted-foreground">—</td>
                      <td className="max-w-[280px] px-4 py-3">
                        <AreaPostcodesCell
                          postcodes={areaPcs}
                          onClick={() => setPostcodesView({ zone, branch })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <AuditCell audit={area} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge />
                      </td>
                      <td className="px-4 py-3">
                        <AreaActions
                          canUpdate={canUpdate}
                          hasPostcodes={areaPcs.length > 0}
                          onViewPostcodes={() => setPostcodesView({ zone, branch })}
                          onEdit={() => openEditArea(zone, branch, area)}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">City / address</th>
                <th className="px-4 py-3 font-medium">Postcodes</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {treeRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {search.trim() ? 'No zones match your search.' : 'No zones yet.'}
                  </td>
                </tr>
              ) : (
                treeRows.map(row => {
                  if (row.kind === 'zone') {
                    const { zone } = row
                    const lookupId = zoneLookupId(zone)
                    const branchCount = zone.branches?.length ?? 0
                    const expanded = !collapsedZoneIds.has(zone.id)
                    const zonePcs = allPostcodes(zone)
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-border bg-muted/10 last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-1">
                            <ExpandToggle
                              expanded={expanded}
                              visible={branchCount > 0}
                              label={zone.name}
                              onToggle={() => toggleZoneExpanded(zone.id)}
                            />
                            <div>
                              <div className="font-semibold text-foreground">{zone.name}</div>
                              <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                                {branchCount === 0
                                  ? 'No branches'
                                  : `${branchCount} ${branchCount === 1 ? 'branch' : 'branches'}`}
                              </div>
                              {formatLocationAuditLine(zone) ? (
                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                  {formatLocationAuditLine(zone)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <TypeBadge type="Zone" />
                        </td>
                        <td className="px-4 py-3.5">{zone.city || '—'}</td>
                        <td className="px-4 py-3.5 font-medium">
                          <PostcodesTrigger
                            count={zonePcs.length}
                            onClick={() => setPostcodesView({ zone, branch: null })}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <ZoneActions
                            canUpdate={canUpdate}
                            lookupId={lookupId}
                            onView={() => setViewZone(zone)}
                            onEdit={() => openEditZone(zone)}
                            onAddBranch={() => openCreateBranch(lookupId)}
                          />
                        </td>
                      </tr>
                    )
                  }

                  if (row.kind === 'branch') {
                    const { zone, branch } = row
                    const areaCount = branch.areas?.length ?? 0
                    const expanded = expandedBranchIds.has(branch.id)
                    const pcs = branchPostcodes(branch)
                    const subtitle = branchLocationSubtitle(branch)
                    return (
                      <tr
                        key={row.key}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-1 pl-6">
                            <ExpandToggle
                              expanded={expanded}
                              visible={areaCount > 0}
                              label={branch.name}
                              onToggle={() => toggleBranchExpanded(branch.id)}
                            />
                            <div>
                              <div className="font-medium text-foreground">{branch.name}</div>
                              {subtitle ? (
                                <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
                              ) : null}
                              {formatLocationAuditLine(branch) ? (
                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                  {formatLocationAuditLine(branch)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <TypeBadge type="Branch" />
                        </td>
                        <td className="max-w-[260px] px-4 py-3.5">
                          <span className="line-clamp-2 text-muted-foreground">
                            {branch.address?.trim() || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium">
                          <PostcodesTrigger
                            count={pcs.length}
                            onClick={() => setPostcodesView({ zone, branch })}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <BranchActions
                            canUpdate={canUpdate}
                            hasPostcodes={pcs.length > 0}
                            onViewPostcodes={() => setPostcodesView({ zone, branch })}
                            onAddArea={() => openCreateArea(zone, branch)}
                          />
                        </td>
                      </tr>
                    )
                  }

                  if (row.kind !== 'area') return null
                  const { zone, branch, area } = row
                  const areaPcs = area.postcodes ?? []
                  return (
                    <tr
                      key={row.key}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1 pl-12">
                          <span className="inline-block w-6 shrink-0" aria-hidden />
                          <div>
                            <div className="font-medium text-foreground">{area.name}</div>
                            {formatLocationAuditLine(area) ? (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                {formatLocationAuditLine(area)}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type="Area" />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">—</td>
                      <td className="max-w-[280px] px-4 py-3">
                        <AreaPostcodesCell
                          postcodes={areaPcs}
                          onClick={() => setPostcodesView({ zone, branch })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <AreaActions
                          canUpdate={canUpdate}
                          hasPostcodes={areaPcs.length > 0}
                          onViewPostcodes={() => setPostcodesView({ zone, branch })}
                          onEdit={() => openEditArea(zone, branch, area)}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
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
                placeholder="e.g. London"
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
                {canUpdate ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditZone(liveViewZone)}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Edit zone
                    </Button>
                    {zoneLookupId(liveViewZone) ? (
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
                  </div>
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
                          <p className="mt-2 text-xs text-muted-foreground">No areas yet.</p>
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

      {/* Branch postcodes (from Postcodes / codes column) */}
      <Dialog
        open={Boolean(livePostcodesView)}
        onOpenChange={open => (!open ? setPostcodesView(null) : undefined)}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {livePostcodesView?.branch
                ? `${livePostcodesView.branch.name} postcodes`
                : livePostcodesView
                  ? `${livePostcodesView.zone.name} postcodes`
                  : 'Postcodes'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {livePostcodesView ? (
              (() => {
                const { zone, branch } = livePostcodesView
                const branches = branch ? [branch] : zone.branches
                const hasAny = branches.some(b => branchPostcodes(b).length > 0)
                if (!hasAny) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      No postcodes on this {branch ? 'branch' : 'zone'} yet.
                    </p>
                  )
                }
                return (
                  <div className="space-y-3">
                    {branches.map(b => {
                      const areasWithPcs = (b.areas ?? []).filter(
                        a => (a.postcodes?.length ?? 0) > 0,
                      )
                      if (areasWithPcs.length === 0) return null
                      return (
                        <div key={b.id} className="rounded-lg border border-border p-3">
                          {!branch ? (
                            <p className="mb-2 text-sm font-medium">{b.name}</p>
                          ) : (
                            <p className="mb-2 text-xs text-muted-foreground">
                              {zone.name} · {b.name}
                            </p>
                          )}
                          <ul className="space-y-3">
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
                                        setPostcodesView(null)
                                        openEditArea(zone, b, area)
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
              })()
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPostcodesView(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Area modal */}
      <Dialog open={Boolean(areaModal)} onOpenChange={open => (!open ? setAreaModal(null) : undefined)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {areaModal?.mode === 'edit' ? 'Edit area' : 'Add area'}
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

function AuditCell({ audit }: { audit: LocationAuditFields }) {
  const line = formatLocationAuditLine(audit)
  return line ? (
    <span className="text-[11px] leading-snug text-muted-foreground">{line}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  )
}

function ZoneNameCell({
  zone,
  canUpdate,
  onView,
  onEdit,
}: {
  zone: LocationTreeZone
  canUpdate: boolean
  onView: () => void
  onEdit: () => void
}) {
  return (
    <div className="flex items-start gap-1">
      <button
        type="button"
        className="text-left font-semibold text-foreground hover:underline"
        onClick={onView}
        title="View zone"
      >
        {zone.name}
      </button>
      {canUpdate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 text-muted-foreground"
          title="Edit zone"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  )
}

function BranchPlaceCell({
  zone,
  branch,
}: {
  zone: LocationTreeZone
  branch: LocationTreeBranch
}) {
  const city = zone.city?.trim()
  const address = branch.address?.trim()
  if (!city && !address) return <span className="text-muted-foreground">—</span>
  return (
    <div>
      {city ? <div className="text-foreground">{city}</div> : null}
      {address ? (
        <span className="line-clamp-2 text-muted-foreground">{address}</span>
      ) : null}
    </div>
  )
}

function AreaPostcodesCell({
  postcodes,
  onClick,
}: {
  postcodes: string[]
  onClick: () => void
}) {
  if (postcodes.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <button
      type="button"
      className="rounded-md px-1 py-0.5 text-left text-primary hover:bg-primary/5"
      onClick={onClick}
      title="View postcodes"
    >
      <span className="line-clamp-2 text-xs font-medium">
        {postcodes.slice(0, 4).join(', ')}
        {postcodes.length > 4 ? ` +${postcodes.length - 4}` : ''}
      </span>
    </button>
  )
}

function ZoneActions({
  canUpdate,
  lookupId,
  onView,
  onEdit,
  onAddBranch,
}: {
  canUpdate: boolean
  lookupId: string | null
  onView: () => void
  onEdit: () => void
  onAddBranch: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon-sm" title="View zone" onClick={onView}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {canUpdate ? (
        <>
          <Button type="button" variant="outline" size="icon-sm" title="Edit zone" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {lookupId ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="Add branch"
              onClick={onAddBranch}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function BranchActions({
  canUpdate,
  hasPostcodes,
  onViewPostcodes,
  onAddArea,
}: {
  canUpdate: boolean
  hasPostcodes: boolean
  onViewPostcodes: () => void
  onAddArea: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title="View postcodes"
        disabled={!hasPostcodes}
        onClick={onViewPostcodes}
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {canUpdate ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Add area"
          onClick={onAddArea}
        >
          <MapPinned className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  )
}

function AreaActions({
  canUpdate,
  hasPostcodes,
  onViewPostcodes,
  onEdit,
}: {
  canUpdate: boolean
  hasPostcodes: boolean
  onViewPostcodes: () => void
  onEdit: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title="View postcodes"
        disabled={!hasPostcodes}
        onClick={onViewPostcodes}
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {canUpdate ? (
        <Button type="button" variant="outline" size="icon-sm" title="Edit area" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  )
}

function TypeBadge({ type }: { type: 'Zone' | 'Branch' | 'Area' }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-normal',
        type === 'Zone' && 'bg-sky-500/10 text-sky-800',
        type === 'Branch' && 'bg-emerald-500/10 text-emerald-800',
        type === 'Area' && 'bg-amber-500/10 text-amber-900',
      )}
    >
      {type}
    </Badge>
  )
}

function AreasCountCell({
  count,
  expanded,
  label,
  onToggle,
}: {
  count: number
  expanded: boolean
  label: string
  onToggle: () => void
}) {
  if (count === 0) {
    return <span className="tabular-nums text-muted-foreground">0</span>
  }
  return (
    <button
      type="button"
      className="rounded-md px-1 py-0.5 text-left tabular-nums text-primary hover:bg-primary/5"
      aria-expanded={expanded}
      aria-label={expanded ? `Collapse areas for ${label}` : `Expand areas for ${label}`}
      onClick={onToggle}
      title={expanded ? 'Hide area names' : 'Show area names'}
    >
      {count}
    </button>
  )
}

function StatusBadge() {
  return (
    <Badge variant="secondary" className="bg-emerald-500/10 font-normal text-emerald-800">
      Active
    </Badge>
  )
}

function ExpandToggle({
  expanded,
  visible,
  label,
  onToggle,
}: {
  expanded: boolean
  visible: boolean
  label: string
  onToggle: () => void
}) {
  if (!visible) {
    return <span className="inline-block h-6 w-6 shrink-0" aria-hidden />
  }
  return (
    <button
      type="button"
      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-expanded={expanded}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      onClick={onToggle}
    >
      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  )
}

function PostcodesTrigger({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-md px-1.5 py-0.5 text-left underline-offset-2',
        count > 0
          ? 'text-primary hover:bg-primary/5 hover:underline'
          : 'cursor-default text-muted-foreground',
      )}
      disabled={count === 0}
      onClick={onClick}
      title={count > 0 ? 'View postcodes' : 'No postcodes'}
    >
      {count} {count === 1 ? 'code' : 'codes'}
    </button>
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
