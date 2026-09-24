import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { MedicalConditionCatalogCategory, MedicalConditionCatalogRow } from '@/features/settings/api/lookups-admin-api'
import {
  MEDICAL_CONDITION_CATALOG_CATEGORY_LABELS,
  MEDICAL_CONDITION_CATALOG_CATEGORY_ORDER,
} from '@/features/settings/api/lookups-admin-api'
import {
  useMedicalConditionCatalogSettings,
  useCreateMedicalConditionCatalog,
  useUpdateMedicalConditionCatalog,
  useDeleteMedicalConditionCatalog,
} from '@/features/settings/hooks/useLookupsAdmin'
import { SettingsTablePagination } from '@/features/settings/components/SettingsTablePagination'
import { useClientPagination } from '@/features/settings/hooks/useClientPagination'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'

function slugCode(name: string, category: MedicalConditionCatalogCategory): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return `${category}_${base}`.slice(0, 64)
}

export function MedicalConditionsCatalogSettingsPanel() {
  const canManage = useAuthStore(s => s.can('lookups.manage'))
  const listQuery = useMedicalConditionCatalogSettings()
  const createMutation = useCreateMedicalConditionCatalog()
  const updateMutation = useUpdateMedicalConditionCatalog()
  const deleteMutation = useDeleteMedicalConditionCatalog()

  const rows = listQuery.data ?? []
  const loading = listQuery.isLoading
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load medical conditions.'
        : null

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [category, setCategory] = React.useState<MedicalConditionCatalogCategory>('OTHER')
  const [categoryFilter, setCategoryFilter] = React.useState<MedicalConditionCatalogCategory | 'ALL'>('ALL')
  const [filter, setFilter] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editCode, setEditCode] = React.useState('')
  const [editCategory, setEditCategory] = React.useState<MedicalConditionCatalogCategory>('OTHER')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const counts = React.useMemo(() => {
    const map = Object.fromEntries(
      MEDICAL_CONDITION_CATALOG_CATEGORY_ORDER.map(c => [c, 0]),
    ) as Record<MedicalConditionCatalogCategory, number>
    for (const row of rows) {
      if (row.category in map) map[row.category as MedicalConditionCatalogCategory]++
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
        (MEDICAL_CONDITION_CATALOG_CATEGORY_LABELS[row.category as MedicalConditionCatalogCategory] ?? '').toLowerCase().includes(q)
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

  const startEdit = (row: MedicalConditionCatalogRow) => {
    setEditingId(row.id)
    setEditName(row.name)
    setEditCode(row.code)
    setEditCategory(row.category as MedicalConditionCatalogCategory)
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
      setActionError(e instanceof ApiError ? e.message : 'Could not add condition.')
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

  const onDelete = async (row: MedicalConditionCatalogRow) => {
    if (!canManage) return
    if (!window.confirm(`Remove "${row.name}" from the medical conditions catalogue?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(row.id)
      if (editingId === row.id) cancelEdit()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete condition.')
    }
  }

  const displayError = actionError ?? error
  const colSpan = canManage ? 5 : 4

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Medical conditions catalogue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length > 0
            ? `${rows.length.toLocaleString()} medical conditions across ${MEDICAL_CONDITION_CATALOG_CATEGORY_ORDER.length} categories. These are used on the Medical Alerts page for each service user.`
            : 'Predefined medical conditions for service user records — mental health, neurological, cardiovascular, respiratory, and more.'}
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
        {MEDICAL_CONDITION_CATALOG_CATEGORY_ORDER.map(cat => (
          <Button
            key={cat}
            type="button"
            size="sm"
            variant={categoryFilter === cat ? 'default' : 'outline'}
            onClick={() => setCategoryFilter(cat)}
          >
            {MEDICAL_CONDITION_CATALOG_CATEGORY_LABELS[cat]} ({counts[cat].toLocaleString()})
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
                const next = e.target.value as MedicalConditionCatalogCategory
                setCategory(next)
                if (name.trim() && !code.trim()) setCode(slugCode(name, next))
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={saving}
            >
              {MEDICAL_CONDITION_CATALOG_CATEGORY_ORDER.map(cat => (
                <option key={cat} value={cat}>
                  {MEDICAL_CONDITION_CATALOG_CATEGORY_LABELS[cat]}
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
              placeholder="e.g. Diabetes Type 2"
              disabled={saving}
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Code</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DIABETES_TYPE_2"
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
                  <th className="px-3 py-2 font-medium">Status</th>
                  {canManage ? <th className="w-28 px-3 py-2 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground">
                      {rows.length === 0 ? 'No conditions in the catalogue yet.' : 'No matches.'}
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
                              setEditCategory(e.target.value as MedicalConditionCatalogCategory)
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {MEDICAL_CONDITION_CATALOG_CATEGORY_ORDER.map(cat => (
                              <option key={cat} value={cat}>
                                {MEDICAL_CONDITION_CATALOG_CATEGORY_LABELS[cat]}
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
                        <td className="px-3 py-2 text-xs text-muted-foreground">—</td>
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
                      <tr key={row.id} className={`border-b border-border last:border-0 ${!row.isActive ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2 text-muted-foreground">
                          {MEDICAL_CONDITION_CATALOG_CATEGORY_LABELS[row.category as MedicalConditionCatalogCategory] ?? row.category}
                        </td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {row.code}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${row.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
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
                                title={row.isActive ? 'Disable' : 'Delete'}
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
