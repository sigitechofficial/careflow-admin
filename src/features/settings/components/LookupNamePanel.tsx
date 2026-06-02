import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { type LookupResource } from '@/features/settings/types'
import {
  useCreateLookupItem,
  useDeleteLookupItem,
  useLookupList,
  useUpdateLookupItem,
} from '@/features/settings/hooks/useLookupsAdmin'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'

export function LookupNamePanel({
  resource,
  title,
  description,
  placeholder,
}: {
  resource: LookupResource
  title: string
  description: string
  placeholder?: string
}) {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useLookupList(resource)
  const createMutation = useCreateLookupItem(resource)
  const updateMutation = useUpdateLookupItem(resource)
  const deleteMutation = useDeleteLookupItem(resource)

  const rows = listQuery.data ?? []
  const loading = listQuery.isLoading
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load list.'
        : null

  const [newName, setNewName] = React.useState('')
  const [filter, setFilter] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.name.toLowerCase().includes(q))
  }, [filter, rows])

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const startEdit = (row: { id: string; name: string }) => {
    setEditingId(row.id)
    setEditName(row.name)
  }

  const onAdd = async () => {
    const name = newName.trim()
    if (!name || !canManage) return
    setActionError(null)
    try {
      await createMutation.mutateAsync(name)
      setNewName('')
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add item.')
    }
  }

  const onSaveEdit = async () => {
    if (!editingId || !canManage) return
    const name = editName.trim()
    if (!name) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({ id: editingId, name })
      cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save changes.')
    }
  }

  const onDelete = async (row: { id: string; name: string }) => {
    if (!canManage) return
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone from the UI.`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
      if (editingId === row.id) cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete item.')
    }
  }

  const displayError = actionError ?? error

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Add new</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={placeholder ?? 'Name'}
              disabled={saving}
              onKeyDown={e => {
                if (e.key === 'Enter') void onAdd()
              }}
            />
          </div>
          <Button type="button" size="sm" disabled={saving || !newName.trim()} onClick={() => void onAdd()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Filter</label>
        <Input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search…"
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 2 : 1} className="px-3 py-8 text-center text-muted-foreground">
                    {rows.length === 0 ? 'No items yet.' : 'No matches.'}
                  </td>
                </tr>
              ) : (
                filtered.map(row =>
                  editingId === row.id ? (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') void onSaveEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void onSaveEdit()}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{row.name}</td>
                      {canManage ? (
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Edit"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void onDelete(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
