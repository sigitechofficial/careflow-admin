import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  createLookupItem,
  deleteLookupItem,
  fetchLookupList,
  updateLookupItem,
  type LookupResource,
} from '@/lib/lookups-admin-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth.store'

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
  const [rows, setRows] = React.useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [newName, setNewName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [filter, setFilter] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLookupList(resource)
      setRows(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load list.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [resource])

  React.useEffect(() => {
    void load()
  }, [load])

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
    setSaving(true)
    setError(null)
    try {
      await createLookupItem(resource, name)
      setNewName('')
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add item.')
    } finally {
      setSaving(false)
    }
  }

  const onSaveEdit = async () => {
    if (!editingId || !canManage) return
    const name = editName.trim()
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      await updateLookupItem(resource, editingId, name)
      cancelEdit()
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row: { id: string; name: string }) => {
    if (!canManage) return
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone from the UI.`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteLookupItem(resource, row.id)
      if (editingId === row.id) cancelEdit()
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          placeholder={placeholder ?? 'Filter…'}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-9 max-w-xs"
        />
        {canManage ? (
          <>
            <Input
              placeholder={`New ${title.toLowerCase()}…`}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="h-9 min-w-[12rem] flex-1 max-w-md"
              disabled={saving}
              onKeyDown={e => {
                if (e.key === 'Enter') void onAdd()
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              disabled={saving || !newName.trim()}
              onClick={() => void onAdd()}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            You need <span className="font-mono">lookups.manage</span> to add, edit, or delete items.
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="max-h-[min(50vh,480px)] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                {canManage ? <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 2 : 1} className="px-3 py-8 text-center text-muted-foreground">
                    No items found.
                  </td>
                </tr>
              ) : (
                filtered.map(row => {
                  const isEditing = editingId === row.id
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <Input
                            className="h-8 max-w-md"
                            value={editName}
                            disabled={saving}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') void onSaveEdit()
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            autoFocus
                          />
                        ) : (
                          row.name
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={saving} onClick={() => void onSaveEdit()}>
                                  Save
                                </Button>
                                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" disabled={saving} onClick={cancelEdit}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  title="Edit"
                                  disabled={saving}
                                  onClick={() => startEdit(row)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  title="Delete"
                                  disabled={saving}
                                  onClick={() => void onDelete(row)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{filtered.length} item(s)</p>
    </div>
  )
}
