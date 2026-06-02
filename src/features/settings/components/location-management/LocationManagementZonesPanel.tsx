import * as React from 'react'
import { ChevronDown, ChevronRight, Home, Loader2, MapPin, User, Users } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  LocationActiveUser,
  LocationTreeBranch,
  LocationTreeZone,
} from '@/features/settings/location-management/location-management.types'
import {
  useLocationActiveUsers,
  useLocationManagementTree,
  useUpdateLocationZone,
} from '@/features/settings/hooks/useLocationManagement'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MultiSelect } from '@/shared/ui/multi-select'
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

export function LocationManagementZonesPanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const treeQuery = useLocationManagementTree()
  const usersQuery = useLocationActiveUsers()
  const updateMutation = useUpdateLocationZone()
  const [saving, setSaving] = React.useState(false)
  const [initialized, setInitialized] = React.useState(false)
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(['org-root']))
  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null)
  const [draftName, setDraftName] = React.useState('')
  const [draftColor, setDraftColor] = React.useState('#EAB308')
  const [draftMessageUsers, setDraftMessageUsers] = React.useState<string[]>([])
  const [draftEmailUsers, setDraftEmailUsers] = React.useState<string[]>([])
  const [savedSnapshot, setSavedSnapshot] = React.useState<{
    name: string
    color: string
    messageUsers: string[]
    emailUsers: string[]
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
    setSelectedZoneId(first.id)
    setDraftName(first.name)
    setDraftColor(first.markerColorHex)
    setDraftMessageUsers(first.incidentMessageUserIds)
    setDraftEmailUsers(first.incidentEmailUserIds)
    setSavedSnapshot({
      name: first.name,
      color: first.markerColorHex,
      messageUsers: first.incidentMessageUserIds,
      emailUsers: first.incidentEmailUserIds,
    })
    setExpanded(prev => new Set([...prev, 'org-root', first.id]))
    setInitialized(true)
  }, [treeQuery.data, initialized])
  const userOptions = activeUsers.map(u => ({ value: u.id, label: u.label }))
  const selectedZone = zones.find(z => z.id === selectedZoneId) ?? null

  function selectZone(zone: LocationTreeZone) {
    setSelectedZoneId(zone.id)
    setDraftName(zone.name)
    setDraftColor(zone.markerColorHex)
    setDraftMessageUsers(zone.incidentMessageUserIds)
    setDraftEmailUsers(zone.incidentEmailUserIds)
    setSavedSnapshot({
      name: zone.name,
      color: zone.markerColorHex,
      messageUsers: zone.incidentMessageUserIds,
      emailUsers: zone.incidentEmailUserIds,
    })
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onCancel() {
    if (!savedSnapshot) return
    setDraftName(savedSnapshot.name)
    setDraftColor(savedSnapshot.color)
    setDraftMessageUsers(savedSnapshot.messageUsers)
    setDraftEmailUsers(savedSnapshot.emailUsers)
  }

  async function onSave() {
    if (!canUpdate || !selectedZoneId) return
    setSaving(true)
    try {
      const updated = await updateMutation.mutateAsync({
        zoneId: selectedZoneId,
        body: {
          name: draftName.trim(),
          markerColorHex: draftColor,
          incidentMessageUserIds: draftMessageUsers,
          incidentEmailUserIds: draftEmailUsers,
        },
      })
      setSavedSnapshot({
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="location-management-zones-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex min-h-[420px] flex-col gap-4 lg:flex-row">
        <div className="w-full shrink-0 rounded-lg border border-border bg-muted/10 p-3 lg:w-72">
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
                            {zone.branches.map((branch: LocationTreeBranch) => (
                              <li key={branch.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/50"
                                  onClick={e => {
                                    e.stopPropagation()
                                    toggleExpanded(branch.id)
                                  }}
                                >
                                  {branch.children.length > 0 ? (
                                    expanded.has(branch.id) ? (
                                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                    )
                                  ) : (
                                    <span className="w-3.5" />
                                  )}
                                  <span className="font-medium text-foreground">{branch.name}</span>
                                </button>
                                {expanded.has(branch.id) && branch.children.length > 0 && (
                                  <ul className="ml-6 space-y-0.5 border-l border-border pl-2">
                                    {branch.children.map(child => (
                                      <li
                                        key={child.id}
                                        className="flex items-center gap-2 px-2 py-1 text-muted-foreground"
                                      >
                                        {child.type === 'employee' ? (
                                          <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                        ) : (
                                          <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                                        )}
                                        <span className="truncate text-xs">{child.label}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : zone.children.length > 0 ? (
                          <ul className="ml-8 space-y-0.5 border-l border-border pl-2">
                            {zone.children.map(child => (
                              <li
                                key={child.id}
                                className="flex items-center gap-2 px-2 py-1 text-muted-foreground"
                              >
                                {child.type === 'employee' ? (
                                  <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                ) : (
                                  <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                                )}
                                <span className="truncate text-xs">{child.label}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </div>

        <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-5 shadow-sm">
          {selectedZone ? (
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
                <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={!canUpdate || saving || !draftName.trim()}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a zone from the tree to edit.</p>
          )}
        </div>
      </div>
    </div>
  )
}
