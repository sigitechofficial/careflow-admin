import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  AllergyCatalogCategory,
  AllergyCatalogRow,
} from '@/features/settings/api/lookups-admin-api'
import {
  ALLERGY_CATALOG_CATEGORY_LABELS,
  ALLERGY_CATALOG_CATEGORY_ORDER,
} from '@/features/settings/allergy-catalog-categories'
import {
  useAllergyCatalog,
  useCreateAllergyCatalog,
  useDeleteAllergyCatalog,
  useUpdateAllergyCatalog,
} from '@/features/settings/hooks/useLookupsAdmin'
import { SettingsTablePagination } from '@/features/settings/components/SettingsTablePagination'
import { useClientPagination } from '@/features/settings/hooks/useClientPagination'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'

function slugCode(name: string, category: AllergyCatalogCategory): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${category}_${base}`.slice(0, 64)
}

export function AllergiesCatalogSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useAllergyCatalog()
  const createMutation = useCreateAllergyCatalog()
  const updateMutation = useUpdateAllergyCatalog()
  const deleteMutation = useDeleteAllergyCatalog()

  const rows = listQuery.data ?? []
  const loading = listQuery.isLoading
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load allergies.'
        : null

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [category, setCategory] = React.useState<AllergyCatalogCategory>('FOOD')
  const [categoryFilter, setCategoryFilter] = React.useState<AllergyCatalogCategory | 'ALL'>('ALL')
  const [filter, setFilter] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editCode, setEditCode] = React.useState('')
  const [editCategory, setEditCategory] = React.useState<AllergyCatalogCategory>('OTHER')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const counts = React.useMemo(() => {
    const map = Object.fromEntries(
      ALLERGY_CATALOG_CATEGORY_ORDER.map(c => [c, 0]),
    ) as Record<AllergyCatalogCategory, number>
    for (const row of rows) {
      if (row.category in map) map[row.category as AllergyCatalogCategory]++
    }
    return map
  }, [rows])

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    return rows.filter(row => {
      if (categoryFilter !== 'ALL' && row.category !== categoryFilter) return false
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        ALLERGY_CATALOG_CATEGORY_LABELS[row.category].toLowerCase().includes(q)
      )
    })
  }, [categoryFilter, filter, rows])

  const pagination = useClientPagination(filtered, {
    resetDeps: [filter, categoryFilter],
  })

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditCode('')
    setEditCategory('OTHER')
  }

  const startEdit = (row: AllergyCatalogRow) => {
    setEditingId(row.id)
    setEditName(row.name)
    setEditCode(row.code)
    setEditCategory(row.category)
  }

  const onAdd = async () => {
    const n = name.trim()
    const c = (code.trim() || slugCode(n, category)).toUpperCase()
    if (!n || !c || !canManage) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({ name: n, code: c, category })
      setName('')
      setCode('')
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not add allergy.')
    }
  }

  const onSaveEdit = async () => {
    if (!editingId || !canManage) return
    const n = editName.trim()
    const c = editCode.trim().toUpperCase()
    if (!n || !c) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: { name: n, code: c, category: editCategory },
      })
      cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save changes.')
    }
  }

  const onDelete = async (row: AllergyCatalogRow) => {
    if (!canManage) return
    if (!window.confirm(`Remove "${row.name}" from the allergy catalogue?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
      if (editingId === row.id) cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete allergy.')
    }
  }

  const displayError = actionError ?? error
  const colSpan = canManage ? 4 : 3

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Allergies catalogue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length > 0
            ? `${rows.length.toLocaleString()} allergens across food, drink, environmental contact, medication, and other triggers.`
            : 'Common allergens for service user allergy records — food, drinks, medicines, and environmental or skin contact triggers.'}
        </p>
      </div>

      {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={categoryFilter === 'ALL' ? 'default' : 'outline'}
          onClick={() => setCategoryFilter('ALL')}
        >
          All ({rows.length.toLocaleString()})
        </Button>
        {ALLERGY_CATALOG_CATEGORY_ORDER.map(cat => (
          <Button
            key={cat}
            type="button"
            size="sm"
            variant={categoryFilter === cat ? 'default' : 'outline'}
            onClick={() => setCategoryFilter(cat)}
          >
            {ALLERGY_CATALOG_CATEGORY_LABELS[cat]} ({counts[cat].toLocaleString()})
          </Button>
        ))}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[140px] space-y-1">
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={e => {
                const next = e.target.value as AllergyCatalogCategory
                setCategory(next)
                if (name.trim() && !code.trim()) setCode(slugCode(name, next))
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={saving}
            >
              {ALLERGY_CATALOG_CATEGORY_ORDER.map(cat => (
                <option key={cat} value={cat}>
                  {ALLERGY_CATALOG_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={e => {
                setName(e.target.value)
                if (!code.trim()) setCode(slugCode(e.target.value, category))
              }}
              placeholder="e.g. Peanuts"
              disabled={saving}
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Code</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FOOD_PEANUTS"
              disabled={saving}
            />
          </div>
          <Button type="button" size="sm" disabled={saving || !name.trim()} onClick={() => void onAdd()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Search</label>
        <Input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search name, code, or category…"
          className="max-w-md"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground">
                      {rows.length === 0 ? 'No allergies in the catalogue yet.' : 'No matches.'}
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map(row =>
                    editingId === row.id ? (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <select
                            value={editCategory}
                            onChange={e =>
                              setEditCategory(e.target.value as AllergyCatalogCategory)
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {ALLERGY_CATALOG_CATEGORY_ORDER.map(cat => (
                              <option key={cat} value={cat}>
                                {ALLERGY_CATALOG_CATEGORY_LABELS[cat]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={editCode}
                            onChange={e => setEditCode(e.target.value.toUpperCase())}
                            className="h-8 font-mono text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => void onSaveEdit()}
                            >
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
                        <td className="px-3 py-2 text-muted-foreground">
                          {ALLERGY_CATALOG_CATEGORY_LABELS[row.category]}
                        </td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {row.code}
                        </td>
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
          <SettingsTablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      )}
    </div>
  )
}
