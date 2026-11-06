import * as React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateRole,
  useIdentityRoles,
  usePermissionsCatalog,
  useSetRolePermissions,
  useUpdateRole,
} from '@/features/settings/hooks/useRolesPermissions'

function permissionGroup(key: string): string {
  const i = key.indexOf('.')
  return i === -1 ? key : key.slice(0, i)
}

type PermQuickAction = 'all' | 'read' | 'edit' | 'delete' | 'add'

function matchesPermAction(key: string, action: Exclude<PermQuickAction, 'all'>): boolean {
  const lower = key.toLowerCase()
  switch (action) {
    case 'read':
      return (
        lower.includes('.read')
        || lower.endsWith('_read')
        || lower.includes('.view')
        || lower.includes('_view')
      )
    case 'edit':
      return (
        lower.includes('.update')
        || lower.includes('.edit')
        || lower.includes('.manage')
        || lower.includes('.write')
        || lower.includes('.patch')
      )
    case 'delete':
      return lower.includes('.delete') || lower.includes('.remove')
    case 'add':
      return (
        lower.includes('.create')
        || lower.includes('.add')
        || lower.includes('.upload')
        || lower.includes('.raise')
      )
  }
}

const QUICK_ACTIONS: { id: PermQuickAction; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'read', label: 'Read' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
  { id: 'add', label: 'Add' },
]

export function RolesPanel() {
  const canManageRoles = useAuthStore(s => s.can('roles.manage'))
  const canManagePerms = useAuthStore(s => s.can('permissions.manage'))
  const rolesQuery = useIdentityRoles(true)
  const catalogQuery = usePermissionsCatalog(canManagePerms || canManageRoles)

  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const setPerms = useSetRolePermissions()

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [draftName, setDraftName] = React.useState('')
  const [draftDescription, setDraftDescription] = React.useState('')
  const [draftActive, setDraftActive] = React.useState(true)
  const [draftKeys, setDraftKeys] = React.useState<string[]>([])
  const [permFilter, setPermFilter] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newDescription, setNewDescription] = React.useState('')

  const selected = rolesQuery.data?.find(r => r.id === selectedId) ?? null

  React.useEffect(() => {
    if (!selected) {
      setDraftName('')
      setDraftDescription('')
      setDraftActive(true)
      setDraftKeys([])
      return
    }
    setDraftName(selected.name)
    setDraftDescription(selected.description ?? '')
    setDraftActive(selected.isActive)
    setDraftKeys(selected.permissions.map(p => p.key))
  }, [selected])

  const catalog = catalogQuery.data ?? []
  const grouped = React.useMemo(() => {
    const q = permFilter.trim().toLowerCase()
    const map = new Map<string, typeof catalog>()
    for (const p of catalog) {
      if (q && !p.key.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) {
        continue
      }
      const g = permissionGroup(p.key)
      const list = map.get(g) ?? []
      list.push(p)
      map.set(g, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [catalog, permFilter])

  const toggleKey = (key: string) => {
    setDraftKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }

  const allCatalogKeys = React.useMemo(() => catalog.map(p => p.key), [catalog])

  const applyGlobalAction = (action: PermQuickAction) => {
    if (action === 'all') {
      setDraftKeys(allCatalogKeys)
      return
    }
    setDraftKeys(allCatalogKeys.filter(k => matchesPermAction(k, action)))
  }

  return (
    <div className="space-y-4" data-testid="roles-panel">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Roles</h2>
              <p className="text-xs text-muted-foreground">Select a role to edit metadata and permissions.</p>
            </div>
            {canManageRoles ? (
              <Button type="button" size="sm" onClick={() => { setNewName(''); setNewDescription(''); setCreateOpen(true) }}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Add role
              </Button>
            ) : null}
          </div>
          {rolesQuery.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading roles…</p>
          ) : rolesQuery.isError ? (
            <p className="p-4 text-sm text-destructive">Could not load roles.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-auto">
              {(rolesQuery.data ?? []).map(r => {
                const active = r.id === selectedId
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${active ? 'bg-muted' : ''}`}
                    >
                      <span className="text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.permissions.length} permissions · {r.userCount} users
                        {!r.isActive ? ' · inactive' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Choose a role from the list.</p>
          ) : (
            <>
              <fieldset disabled={!canManageRoles || updateRole.isPending} className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Role details
                </legend>
                <div className="space-y-1.5">
                  <label htmlFor="role-name" className="text-sm font-medium">Name</label>
                  <Input
                    id="role-name"
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="role-desc" className="text-sm font-medium">Description</label>
                  <Input
                    id="role-desc"
                    value={draftDescription}
                    onChange={e => setDraftDescription(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draftActive}
                    onChange={e => setDraftActive(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Active
                </label>
                {canManageRoles ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={updateRole.isPending || !draftName.trim()}
                    onClick={() =>
                      updateRole.mutate({
                        roleId: selected.id,
                        name: draftName.trim(),
                        description: draftDescription.trim() || undefined,
                        isActive: draftActive,
                      })
                    }
                  >
                    Save role
                  </Button>
                ) : null}
              </fieldset>

              <fieldset disabled={!canManagePerms || setPerms.isPending} className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Permissions ({draftKeys.length})
                </legend>
                {!canManagePerms ? (
                  <p className="text-xs text-muted-foreground">
                    View only. Requires permissions.manage to edit the matrix.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {QUICK_ACTIONS.map(action => {
                      const actionId = action.id
                      const count =
                        actionId === 'all'
                          ? allCatalogKeys.length
                          : allCatalogKeys.filter(k => matchesPermAction(k, actionId)).length
                      return (
                        <Button
                          key={action.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={setPerms.isPending || count === 0}
                          title={`Select ${action.label.toLowerCase()} permissions across all modules (${count})`}
                          onClick={() => applyGlobalAction(action.id)}
                        >
                          {action.label}
                        </Button>
                      )
                    })}
                  </div>
                )}
                <Input
                  placeholder="Filter permissions…"
                  value={permFilter}
                  onChange={e => setPermFilter(e.target.value)}
                />
                {catalogQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading permissions…</p>
                ) : (
                  <div className="max-h-[48vh] space-y-4 overflow-auto rounded-md border border-border p-3">
                    {grouped.map(([group, perms]) => (
                      <div key={group} className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {group}
                        </h3>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {perms.map(p => (
                            <label key={p.id} className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={draftKeys.includes(p.key)}
                                onChange={() => toggleKey(p.key)}
                                disabled={!canManagePerms}
                                className="mt-0.5 h-4 w-4 rounded border-input"
                              />
                              <span>
                                <span className="font-mono text-xs">{p.key}</span>
                                {p.description ? (
                                  <span className="block text-xs text-muted-foreground">{p.description}</span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {canManagePerms ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={setPerms.isPending}
                    onClick={() =>
                      setPerms.mutate({ roleId: selected.id, permissionKeys: draftKeys })
                    }
                  >
                    Save permissions
                  </Button>
                ) : null}
              </fieldset>
            </>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={open => { if (!createRole.isPending) setCreateOpen(open) }}>
        <DialogContent size="sm">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={e => {
              e.preventDefault()
              if (!newName.trim()) return
              createRole.mutate(
                { name: newName.trim(), description: newDescription.trim() || undefined },
                {
                  onSuccess: (role) => {
                    setCreateOpen(false)
                    setSelectedId(role.id)
                  },
                },
              )
            }}
          >
            <DialogHeader>
              <DialogTitle>Add role</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="new-role-name" className="text-sm font-medium">Name</label>
                <Input
                  id="new-role-name"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Branch Viewer"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="new-role-desc" className="text-sm font-medium">Description</label>
                <Input
                  id="new-role-desc"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" disabled={createRole.isPending} onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending || !newName.trim()}>
                {createRole.isPending ? 'Creating…' : 'Create role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
