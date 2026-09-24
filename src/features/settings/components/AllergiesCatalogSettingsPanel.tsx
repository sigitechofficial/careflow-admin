import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { serviceUserKeys } from '@/features/service-users/keys'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  createMedicationAllergy,
  deleteMedicationAllergy,
  listMedicationAllergies,
} from '@/features/service-users/api/medication-allergies.api'

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

      <AllergyServiceUserLinkPanel catalog={rows} loading={loading} />
    </div>
  )
}

/**
 * Link medication allergies (from the catalogue lookup) to a service user via
 * checkboxes. Ticking creates a MedicationAllergy record for that service user;
 * unticking removes it. A new allergy can be added straight into the catalogue.
 */
function AllergyServiceUserLinkPanel({
  catalog,
  loading: catalogLoading,
}: {
  catalog: AllergyCatalogRow[]
  loading: boolean
}) {
  const canManage = useAuthStore(
    s => s.can('service_users.update') || s.can('service_users.medications.allergies.manage' as never),
  )
  const canManageCatalog = useAuthStore(s => s.can('lookups.manage'))
  const qc = useQueryClient()

  const [serviceUserId, setServiceUserId] = React.useState('')
  const [newAllergy, setNewAllergy] = React.useState('')
  const [search, setSearch] = React.useState('')

  const { data: listData, isLoading: loadingServiceUsers } = useServiceUsers({
    limit: 200,
    sortBy: 'lastName',
    sortOrder: 'asc',
  })
  const serviceUsers = listData?.rows ?? []

  const allergiesKey = serviceUserId
    ? ([...serviceUserKeys.detail(serviceUserId), 'medication-allergies'] as const)
    : (['medication-allergies', 'none'] as const)

  const {
    data: linked = [],
    isLoading: loadingLinked,
    isError: linkedError,
  } = useQuery({
    queryKey: allergiesKey,
    queryFn: ({ signal }) => listMedicationAllergies(serviceUserId, { signal }),
    enabled: !!serviceUserId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: allergiesKey })

  const createCatalogMutation = useCreateAllergyCatalog()

  // Medication-category allergens from the catalogue lookup.
  const medicationAllergens = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalog
      .filter(row => row.category === 'MEDICATION' && row.isActive !== false)
      .filter(row => (q ? row.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [catalog, search])

  // Map lowercased allergy name -> linked MedicationAllergy id (for unlink).
  const linkedByName = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of linked) map.set(row.allergyName.trim().toLowerCase(), row.id)
    return map
  }, [linked])

  const [pendingName, setPendingName] = React.useState<string | null>(null)

  const toggleMutation = useMutation({
    mutationFn: async ({ name, checked }: { name: string; checked: boolean }) => {
      if (checked) {
        await createMedicationAllergy(serviceUserId, { allergyName: name })
      } else {
        const id = linkedByName.get(name.trim().toLowerCase())
        if (id) await deleteMedicationAllergy(serviceUserId, id)
      }
    },
    onMutate: ({ name }) => setPendingName(name),
    onSuccess: (_data, { checked }) => {
      toastSuccess(checked ? 'Allergy linked' : 'Allergy unlinked')
      void invalidate()
    },
    onError: e => toastApiError(e, 'Could not update allergy link'),
    onSettled: () => setPendingName(null),
  })

  const onAddNewAllergy = async () => {
    const name = newAllergy.trim()
    if (!name || !canManageCatalog) return
    const code = `MEDICATION_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`.slice(0, 64)
    try {
      await createCatalogMutation.mutateAsync({ name, code, category: 'MEDICATION' })
      toastSuccess('Allergy added to catalogue')
      setNewAllergy('')
    } catch (e) {
      toastApiError(e, 'Could not add allergy')
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-700 dark:text-red-300">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Link allergies to a service user</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pick a service user, then tick the medication allergies from the catalogue that apply. These
            flag on the MAR and when adding medications.
          </p>
        </div>
      </div>

      <div className="max-w-md space-y-1">
        <label className="text-xs text-muted-foreground">Service user</label>
        {loadingServiceUsers ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading service users…
          </div>
        ) : (
          <Select
            value={serviceUserId || '_none'}
            onValueChange={v => setServiceUserId(v === '_none' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a service user…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Select a service user…</SelectItem>
              {serviceUsers.map(su => {
                const name =
                  su.preferredName?.trim() ||
                  [su.firstName, su.lastName].filter(Boolean).join(' ') ||
                  su.id
                const num = su.serviceUserNumber ? ` (${su.serviceUserNumber})` : ''
                return (
                  <SelectItem key={su.id} value={su.id}>
                    {`${name}${num}`}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {!serviceUserId ? (
        <p className="rounded-lg border border-dashed border-border bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Select a service user to link medication allergies.
        </p>
      ) : (
        <>
          <div className="max-w-md space-y-1">
            <label className="text-xs text-muted-foreground">Search allergies</label>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medication allergies…"
            />
          </div>

          {loadingLinked || catalogLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading allergies…
            </div>
          ) : linkedError ? (
            <p className="text-sm text-destructive">Could not load this service user's allergies.</p>
          ) : medicationAllergens.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
              {search.trim()
                ? 'No matching medication allergies in the catalogue.'
                : 'No medication allergies in the catalogue yet. Add one below.'}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {medicationAllergens.map(row => {
                const isLinked = linkedByName.has(row.name.trim().toLowerCase())
                const isPending = toggleMutation.isPending && pendingName === row.name
                return (
                  <label
                    key={row.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={isLinked}
                      disabled={!canManage || isPending}
                      onChange={e =>
                        toggleMutation.mutate({ name: row.name, checked: e.target.checked })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{row.name}</span>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                  </label>
                )
              })}
            </div>
          )}
        </>
      )}

      {canManageCatalog ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Add a new medication allergy</label>
            <Input
              value={newAllergy}
              onChange={e => setNewAllergy(e.target.value)}
              placeholder="e.g. Penicillin"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onAddNewAllergy()
                }
              }}
              disabled={createCatalogMutation.isPending}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!newAllergy.trim() || createCatalogMutation.isPending}
            onClick={() => void onAddNewAllergy()}
          >
            <Plus className="mr-1 h-4 w-4" />
            {createCatalogMutation.isPending ? 'Adding…' : 'Add to catalogue'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
