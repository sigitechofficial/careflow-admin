import * as React from 'react'
import {
  ChevronDown,
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  MapPinned,
  User,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  LocationActiveUser,
  LocationTreeArea,
  LocationTreeBranch,
  LocationTreeZone,
} from '@/features/settings/location-management/location-management.types'
import {
  useCreateServiceUserArea,
  useDeleteServiceUserArea,
  useLocationActiveUsers,
  useLocationManagementTree,
  useUpdateLocationZone,
  useUpdateServiceUserArea,
} from '@/features/settings/hooks/useLocationManagement'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MultiSelect } from '@/shared/ui/multi-select'
import { Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'

function ZonePin({ color }: { color: string }) {
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <MapPin className="h-3 w-3 text-white" />
    </span>
  )
}

type Selection =
  | { kind: 'zone'; zone: LocationTreeZone }
  | { kind: 'branch'; zone: LocationTreeZone; branch: LocationTreeBranch }
  | { kind: 'area'; zone: LocationTreeZone; branch: LocationTreeBranch; area: LocationTreeArea }

function parsePostcodesInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function LocationManagementZonesPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const treeQuery = useLocationManagementTree()
  const usersQuery = useLocationActiveUsers()
  const updateZoneMutation = useUpdateLocationZone()
  const createAreaMutation = useCreateServiceUserArea()
  const updateAreaMutation = useUpdateServiceUserArea()
  const deleteAreaMutation = useDeleteServiceUserArea()
  const [saving, setSaving] = React.useState(false)
  const [initialized, setInitialized] = React.useState(false)
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(['org-root']))
  const [selection, setSelection] = React.useState<Selection | null>(null)

  const [draftName, setDraftName] = React.useState('')
  const [draftColor, setDraftColor] = React.useState('#EAB308')
  const [draftMessageUsers, setDraftMessageUsers] = React.useState<string[]>([])
  const [draftEmailUsers, setDraftEmailUsers] = React.useState<string[]>([])
  const [savedZoneSnapshot, setSavedZoneSnapshot] = React.useState<{
    name: string
    color: string
    messageUsers: string[]
    emailUsers: string[]
  } | null>(null)

  const [draftAreaName, setDraftAreaName] = React.useState('')
  const [draftPostcodes, setDraftPostcodes] = React.useState('')
  const [savedAreaSnapshot, setSavedAreaSnapshot] = React.useState<{
    name: string
    postcodes: string
  } | null>(null)

  const loading = treeQuery.isLoading || usersQuery.isLoading
  const error =
    treeQuery.error instanceof ApiError
      ? treeQuery.error.message
      : usersQuery.error instanceof ApiError
        ? usersQuery.error.message
        : treeQuery.error || usersQuery.error
          ? 'Could not load location tree.'
          : null
  const orgName = treeQuery.data?.organisation.name ?? ''
  const zones = treeQuery.data?.zones ?? []
  const activeUsers: LocationActiveUser[] = usersQuery.data ?? []

  React.useEffect(() => {
    if (!treeQuery.data?.zones.length || initialized) return
    const first = treeQuery.data.zones[0]
    if (!first) return
    selectZone(first)
    setExpanded(prev => new Set([...prev, 'org-root', first.id]))
    setInitialized(true)
  }, [treeQuery.data, initialized])

  const userOptions = activeUsers.map(u => ({ value: u.id, label: u.label }))

  function selectZone(zone: LocationTreeZone) {
    setSelection({ kind: 'zone', zone })
    setDraftName(zone.name)
    setDraftColor(zone.markerColorHex)
    setDraftMessageUsers(zone.incidentMessageUserIds)
    setDraftEmailUsers(zone.incidentEmailUserIds)
    setSavedZoneSnapshot({
      name: zone.name,
      color: zone.markerColorHex,
      messageUsers: zone.incidentMessageUserIds,
      emailUsers: zone.incidentEmailUserIds,
    })
  }

  function selectBranch(zone: LocationTreeZone, branch: LocationTreeBranch) {
    setSelection({ kind: 'branch', zone, branch })
    setDraftAreaName('')
    setDraftPostcodes('')
    setSavedAreaSnapshot({ name: '', postcodes: '' })
  }

  function selectArea(zone: LocationTreeZone, branch: LocationTreeBranch, area: LocationTreeArea) {
    const postcodesText = (area.postcodes ?? []).join('\n')
    setSelection({ kind: 'area', zone, branch, area })
    setDraftAreaName(area.name)
    setDraftPostcodes(postcodesText)
    setSavedAreaSnapshot({ name: area.name, postcodes: postcodesText })
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onCancelZone() {
    if (!savedZoneSnapshot) return
    setDraftName(savedZoneSnapshot.name)
    setDraftColor(savedZoneSnapshot.color)
    setDraftMessageUsers(savedZoneSnapshot.messageUsers)
    setDraftEmailUsers(savedZoneSnapshot.emailUsers)
  }

  function onCancelArea() {
    if (!savedAreaSnapshot) return
    setDraftAreaName(savedAreaSnapshot.name)
    setDraftPostcodes(savedAreaSnapshot.postcodes)
  }

  async function onSaveZone() {
    if (!canUpdate || selection?.kind !== 'zone') return
    setSaving(true)
    try {
      const updated = await updateZoneMutation.mutateAsync({
        zoneId: selection.zone.id,
        body: {
          name: draftName.trim(),
          markerColorHex: draftColor,
          incidentMessageUserIds: draftMessageUsers,
          incidentEmailUserIds: draftEmailUsers,
        },
      })
      setSavedZoneSnapshot({
        name: updated.name,
        color: updated.markerColorHex,
        messageUsers: updated.incidentMessageUserIds,
        emailUsers: updated.incidentEmailUserIds,
      })
      toastSuccess('Saved', 'Zone settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onSaveArea() {
    if (!canUpdate || !selection || (selection.kind !== 'branch' && selection.kind !== 'area')) {
      return
    }
    const name = draftAreaName.trim()
    if (!name) return
    const postcodes = parsePostcodesInput(draftPostcodes)
    setSaving(true)
    try {
      if (selection.kind === 'branch') {
        const created = await createAreaMutation.mutateAsync({
          scheduleAreaId: selection.branch.scheduleAreaId,
          name,
          postcodes,
        })
        toastSuccess('Created', 'Service user area created.')
        setDraftAreaName(created.name)
        setDraftPostcodes(created.postcodes.join('\n'))
        setSavedAreaSnapshot({ name: created.name, postcodes: created.postcodes.join('\n') })
      } else {
        const updated = await updateAreaMutation.mutateAsync({
          areaId: selection.area.id,
          body: { name, postcodes },
        })
        toastSuccess('Saved', 'Service user area updated.')
        setDraftAreaName(updated.name)
        setDraftPostcodes(updated.postcodes.join('\n'))
        setSavedAreaSnapshot({ name: updated.name, postcodes: updated.postcodes.join('\n') })
      }
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteArea() {
    if (!canUpdate || selection?.kind !== 'area') return
    if (!window.confirm(`Delete area “${selection.area.name}”? Service users must be unassigned first.`)) {
      return
    }
    setSaving(true)
    try {
      await deleteAreaMutation.mutateAsync(selection.area.id)
      toastSuccess('Deleted', 'Service user area removed.')
      selectBranch(selection.zone, selection.branch)
    } catch (e) {
      toastApiError(e, 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  function renderPersonList(children: LocationTreeBranch['children']) {
    if (!children.length) return null
    return (
      <ul className="ml-6 space-y-0.5 border-l border-border pl-2">
        {children.map(child => (
          <li key={child.id} className="flex items-center gap-2 px-2 py-1 text-muted-foreground">
            {child.type === 'employee' ? (
              <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <User className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
            <span className="truncate text-xs">{child.label}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const selectedZoneId = selection?.kind === 'zone' ? selection.zone.id : null
  const selectedBranchId = selection?.kind === 'branch' ? selection.branch.id : null
  const selectedAreaId = selection?.kind === 'area' ? selection.area.id : null

  return (
    <div className="space-y-4" data-testid="location-management-zones-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex min-h-[420px] flex-col gap-4 lg:flex-row">
        <div className="w-full shrink-0 rounded-lg border border-border bg-muted/10 p-3 lg:w-80">
          <div className="mb-2 flex items-center justify-end gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-emerald-600" /> Employee
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-primary" /> Service User
            </span>
          </div>
          <ul className="space-y-0.5 text-sm">
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50"
                onClick={() => toggleExpanded('org-root')}
              >
                {expanded.has('org-root') ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{orgName}</span>
              </button>
              {expanded.has('org-root') && (
                <ul className="ml-6 space-y-0.5 border-l border-border pl-2">
                  {zones.map(zone => (
                    <li key={zone.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50',
                          selectedZoneId === zone.id && 'bg-primary/10 text-primary',
                        )}
                        onClick={() => {
                          selectZone(zone)
                          setExpanded(prev => new Set([...prev, zone.id]))
                        }}
                      >
                        {(zone.branches?.length ?? 0) > 0 ? (
                          <span
                            role="presentation"
                            className="shrink-0"
                            onClick={e => {
                              e.stopPropagation()
                              toggleExpanded(zone.id)
                            }}
                          >
                            {expanded.has(zone.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        ) : (
                          <span className="w-4" />
                        )}
                        <ZonePin color={zone.markerColorHex} />
                        <span>{zone.name}</span>
                      </button>
                      {expanded.has(zone.id) &&
                        (zone.branches?.length ? (
                          <ul className="ml-6 space-y-0.5 border-l border-border pl-2">
                            {zone.branches.map((branch: LocationTreeBranch) => {
                              const areas = branch.areas ?? []
                              const hasNested = areas.length > 0 || branch.children.length > 0
                              return (
                                <li key={branch.id}>
                                  <button
                                    type="button"
                                    className={cn(
                                      'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/50',
                                      selectedBranchId === branch.id && 'bg-primary/10 text-primary',
                                    )}
                                    onClick={e => {
                                      e.stopPropagation()
                                      selectBranch(zone, branch)
                                      setExpanded(prev => new Set([...prev, branch.id]))
                                    }}
                                  >
                                    {hasNested ? (
                                      <span
                                        role="presentation"
                                        className="shrink-0"
                                        onClick={ev => {
                                          ev.stopPropagation()
                                          toggleExpanded(branch.id)
                                        }}
                                      >
                                        {expanded.has(branch.id) ? (
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5" />
                                        )}
                                      </span>
                                    ) : (
                                      <span className="w-3.5" />
                                    )}
                                    <span className="font-medium text-foreground">{branch.name}</span>
                                  </button>
                                  {expanded.has(branch.id) && (
                                    <>
                                      {areas.length > 0 && (
                                        <ul className="ml-6 space-y-0.5 border-l border-border pl-2">
                                          {areas.map(area => (
                                            <li key={area.id}>
                                              <button
                                                type="button"
                                                className={cn(
                                                  'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted/50',
                                                  selectedAreaId === area.id &&
                                                    'bg-primary/10 text-primary',
                                                )}
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  selectArea(zone, branch, area)
                                                  setExpanded(prev => new Set([...prev, area.id]))
                                                }}
                                              >
                                                {(area.children?.length ?? 0) > 0 ? (
                                                  <span
                                                    role="presentation"
                                                    className="shrink-0"
                                                    onClick={ev => {
                                                      ev.stopPropagation()
                                                      toggleExpanded(area.id)
                                                    }}
                                                  >
                                                    {expanded.has(area.id) ? (
                                                      <ChevronDown className="h-3 w-3" />
                                                    ) : (
                                                      <ChevronRight className="h-3 w-3" />
                                                    )}
                                                  </span>
                                                ) : (
                                                  <span className="w-3" />
                                                )}
                                                <MapPinned className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                                                <span className="truncate">{area.name}</span>
                                                {area.postcodes?.length ? (
                                                  <span className="truncate text-[10px] text-muted-foreground">
                                                    ({area.postcodes.length} PC)
                                                  </span>
                                                ) : null}
                                              </button>
                                              {expanded.has(area.id) &&
                                                renderPersonList(area.children ?? [])}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      {renderPersonList(branch.children)}
                                    </>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        ) : zone.children.length > 0 ? (
                          renderPersonList(zone.children)
                        ) : null)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </div>

        <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-5 shadow-sm">
          {selection?.kind === 'zone' ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="zone-name" className="text-sm font-medium text-foreground">
                  Zone Name
                </label>
                <Input
                  id="zone-name"
                  value={draftName}
                  disabled={!canUpdate}
                  onChange={e => setDraftName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="zone-color" className="text-sm font-medium text-foreground">
                  Map marker colour
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="zone-color"
                    type="color"
                    value={draftColor}
                    disabled={!canUpdate}
                    onChange={e => setDraftColor(e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-border"
                  />
                  <span className="text-sm text-muted-foreground">{draftColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  A Message will be sent to the following users when an incident/accident is
                  reported
                </p>
                <MultiSelect
                  options={userOptions}
                  value={draftMessageUsers}
                  onChange={setDraftMessageUsers}
                  placeholder="Select one or more Active users"
                  disabled={!canUpdate}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  An email will be sent to the following users when an incident/accident is
                  reported
                </p>
                <MultiSelect
                  options={userOptions}
                  value={draftEmailUsers}
                  onChange={setDraftEmailUsers}
                  placeholder="Select one or more Active users"
                  disabled={!canUpdate}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={onCancelZone} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSaveZone()}
                  disabled={!canUpdate || saving || !draftName.trim()}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          ) : selection?.kind === 'branch' || selection?.kind === 'area' ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selection.kind === 'area' ? 'Edit service user area' : 'Create service user area'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Branch: {selection.branch.name}
                  {selection.kind === 'area' && selection.area.postcodes?.length
                    ? ` · ${selection.area.postcodes.length} postcode(s)`
                    : null}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="area-name" className="text-sm font-medium text-foreground">
                  Area name
                </label>
                <Input
                  id="area-name"
                  value={draftAreaName}
                  disabled={!canUpdate}
                  onChange={e => setDraftAreaName(e.target.value)}
                  placeholder="e.g. South Croydon"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="area-postcodes" className="text-sm font-medium text-foreground">
                  Postcodes
                </label>
                <Textarea
                  id="area-postcodes"
                  value={draftPostcodes}
                  disabled={!canUpdate}
                  onChange={e => setDraftPostcodes(e.target.value)}
                  placeholder={'One per line or comma-separated\ne.g.\nCR0 1AA\nCR2 6XH'}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  Each postcode can belong to only one area organisation-wide.
                </p>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-4">
                <div>
                  {selection.kind === 'area' ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void onDeleteArea()}
                      disabled={!canUpdate || saving}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onCancelArea} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void onSaveArea()}
                    disabled={!canUpdate || saving || !draftAreaName.trim()}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {selection.kind === 'area' ? 'Save' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a zone to edit, or a branch/area to manage service user areas.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
