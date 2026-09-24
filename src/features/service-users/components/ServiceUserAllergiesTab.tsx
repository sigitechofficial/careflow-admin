import * as React from 'react'
import { Loader2, Pencil, Search, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { type ServiceUserAllergyRow, type SuLookupRow } from '@/features/service-users/types'
import {
  useCreateServiceUserAllergy,
  useDeleteServiceUserAllergy,
  useUpdateServiceUserAllergy,
} from '@/features/service-users/hooks/useServiceUserMutations'
import { useServiceUserAllergies } from '@/features/service-users/hooks/useServiceUserTabs'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  ALLERGY_CATALOG_CATEGORY_LABELS,
  ALLERGY_CATALOG_CATEGORY_ORDER,
  type AllergyCatalogCategory,
} from '@/features/settings/allergy-catalog-categories'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'

const CATEGORY_COLORS: Record<AllergyCatalogCategory, string> = {
  FOOD: 'bg-amber-500/15 text-amber-800 border-amber-300 dark:text-amber-200 dark:border-amber-700',
  DRINK: 'bg-blue-500/15 text-blue-800 border-blue-300 dark:text-blue-200 dark:border-blue-700',
  ENVIRONMENTAL: 'bg-green-500/15 text-green-800 border-green-300 dark:text-green-200 dark:border-green-700',
  MEDICATION: 'bg-red-500/15 text-red-800 border-red-300 dark:text-red-200 dark:border-red-700',
  OTHER: 'bg-slate-500/15 text-slate-800 border-slate-300 dark:text-slate-200 dark:border-slate-700',
}

const CHECKED_COLORS: Record<AllergyCatalogCategory, string> = {
  FOOD: 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50',
  DRINK: 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/50',
  ENVIRONMENTAL: 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/50',
  MEDICATION: 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/50',
  OTHER: 'border-slate-400 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50',
}

export function ServiceUserAllergiesTab({
  serviceUserId,
  allergyCatalog,
  compact = false,
  hideHeading = false,
  disabled = false,
  formMode = 'dialog',
}: {
  serviceUserId: string
  allergyCatalog: SuLookupRow[]
  compact?: boolean
  hideHeading?: boolean
  disabled?: boolean
  formMode?: 'dialog' | 'inline'
}) {
  const can = useAuthStore(s => s.can)
  const canRead = can('service_users.allergies.read') || can('service_users.read')
  const canCreate = !disabled && (can('service_users.allergies.create') || can('service_users.update'))
  const canUpdate = !disabled && (can('service_users.allergies.update') || can('service_users.update'))
  const canDelete = !disabled && (can('service_users.allergies.delete') || can('service_users.delete'))

  const allergiesQuery = useServiceUserAllergies(serviceUserId, canRead)
  const createMutation = useCreateServiceUserAllergy(serviceUserId)
  const updateMutation = useUpdateServiceUserAllergy(serviceUserId)
  const deleteMutation = useDeleteServiceUserAllergy(serviceUserId)

  const rows = allergiesQuery.data ?? []
  const loading = allergiesQuery.isLoading
  const listError =
    allergiesQuery.error instanceof ApiError
      ? allergiesQuery.error.message
      : allergiesQuery.error
        ? 'Failed to load allergies'
        : null

  type TabValue = AllergyCatalogCategory | 'LINKED'
  const [selectedTab, setSelectedTab] = React.useState<TabValue>('FOOD')
  const [search, setSearch] = React.useState('')
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  /* Edit comment dialog */
  const [editRow, setEditRow] = React.useState<ServiceUserAllergyRow | null>(null)
  const [editComment, setEditComment] = React.useState('')
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  /* ── derived data ─────────────────────────────────────────── */

  const showingLinked = selectedTab === 'LINKED'
  const selectedCategory = showingLinked ? null : (selectedTab as AllergyCatalogCategory)

  /** Catalog items filtered by selected category + search. */
  const categoryItems = React.useMemo(() => {
    if (!selectedCategory) return []
    const q = search.trim().toLowerCase()
    return allergyCatalog
      .filter(item => {
        const cat = (item as SuLookupRow & { category?: string }).category ?? 'OTHER'
        return cat === selectedCategory
      })
      .filter(item => (q ? item.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allergyCatalog, selectedCategory, search])

  /** Count of catalog items per category. */
  const categoryCounts = React.useMemo(() => {
    const map = Object.fromEntries(ALLERGY_CATALOG_CATEGORY_ORDER.map(c => [c, 0])) as Record<
      AllergyCatalogCategory,
      number
    >
    for (const item of allergyCatalog) {
      const cat = ((item as SuLookupRow & { category?: string }).category ?? 'OTHER') as AllergyCatalogCategory
      if (cat in map) map[cat]++
    }
    return map
  }, [allergyCatalog])

  /** Map catalogId → linked ServiceUserAllergy row. */
  const linkedByCatalogId = React.useMemo(() => {
    const map = new Map<string, ServiceUserAllergyRow>()
    for (const row of rows) {
      if (row.allergyCatalogId) map.set(row.allergyCatalogId, row)
    }
    return map
  }, [rows])

  /** Count linked per category. */
  const linkedCategoryCounts = React.useMemo(() => {
    const map = Object.fromEntries(ALLERGY_CATALOG_CATEGORY_ORDER.map(c => [c, 0])) as Record<
      AllergyCatalogCategory,
      number
    >
    const catalogIdToCategory = new Map<string, AllergyCatalogCategory>()
    for (const item of allergyCatalog) {
      const cat = ((item as SuLookupRow & { category?: string }).category ?? 'OTHER') as AllergyCatalogCategory
      catalogIdToCategory.set(item.id, cat)
    }
    for (const row of rows) {
      if (row.allergyCatalogId) {
        const cat = catalogIdToCategory.get(row.allergyCatalogId) ?? 'OTHER'
        if (cat in map) map[cat]++
      }
    }
    return map
  }, [allergyCatalog, rows])

  /* ── handlers ─────────────────────────────────────────────── */

  function onToggle(item: SuLookupRow, checked: boolean) {
    if (!canCreate && checked) return
    setPendingId(item.id)
    if (checked) {
      createMutation.mutate(
        { allergyCatalogId: item.id, comment: item.name },
        {
          onSuccess: () => toastSuccess('Allergy linked'),
          onError: e => toastApiError(e, 'Could not link allergy'),
          onSettled: () => setPendingId(null),
        },
      )
    } else {
      const linked = linkedByCatalogId.get(item.id)
      if (linked && canDelete) {
        deleteMutation.mutate(linked.id, {
          onSuccess: () => toastSuccess('Allergy unlinked'),
          onError: e => toastApiError(e, 'Could not unlink allergy'),
          onSettled: () => setPendingId(null),
        })
      } else {
        setPendingId(null)
      }
    }
  }

  function openEditComment(row: ServiceUserAllergyRow) {
    setEditRow(row)
    setEditComment(row.comment)
  }

  async function saveComment() {
    if (!editRow) return
    try {
      await updateMutation.mutateAsync({ allergyId: editRow.id, body: { comment: editComment.trim() || editRow.allergyName } })
      toastSuccess('Comment updated')
      setEditRow(null)
    } catch (e) {
      toastApiError(e, 'Could not save comment')
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
      toastSuccess('Allergy removed')
    } catch (e) {
      toastApiError(e, 'Delete failed')
    }
  }

  /* ── render ───────────────────────────────────────────────── */

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        You do not have permission to view allergies. Ask an administrator to grant{' '}
        <span className="font-mono text-xs">service_users.read</span> or{' '}
        <span className="font-mono text-xs">service_users.allergies.read</span>.
      </div>
    )
  }

  return (
    <section className={compact ? 'space-y-3' : 'space-y-5'} data-testid="service-user-allergies-editor">
      {/* Header */}
      {!hideHeading && (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Allergies</h2>
          {rows.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
              {rows.length} linked
            </span>
          )}
        </div>
      )}

      {listError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {listError}
        </div>
      )}

      {/* Category buttons + Linked tab */}
      <div className="flex flex-wrap gap-2">
        {ALLERGY_CATALOG_CATEGORY_ORDER.map(cat => {
          const isActive = selectedTab === cat
          const linked = linkedCategoryCounts[cat]
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedTab(cat)
                setSearch('')
              }}
              className={
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ' +
                (isActive
                  ? CATEGORY_COLORS[cat]
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40')
              }
            >
              {ALLERGY_CATALOG_CATEGORY_LABELS[cat]}
              <span className="text-xs opacity-70">({categoryCounts[cat]})</span>
              {linked > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
                  {linked}
                </span>
              )}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setSelectedTab('LINKED')
            setSearch('')
          }}
          className={
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ' +
            (showingLinked
              ? 'bg-sky-500/15 text-sky-800 border-sky-300 dark:text-sky-200 dark:border-sky-700'
              : 'border-border bg-card text-muted-foreground hover:bg-muted/40')
          }
        >
          Linked
          <span className="text-xs opacity-70">({rows.length})</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={
            showingLinked
              ? 'Search linked allergies…'
              : `Search ${ALLERGY_CATALOG_CATEGORY_LABELS[selectedCategory!].toLowerCase()} allergies…`
          }
          className="pl-9"
        />
      </div>

      {/* ── Category checkbox grid (when a category is selected) ── */}
      {!showingLinked && (
        <>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categoryItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              {search.trim()
                ? `No matching ${ALLERGY_CATALOG_CATEGORY_LABELS[selectedCategory!].toLowerCase()} allergies.`
                : `No ${ALLERGY_CATALOG_CATEGORY_LABELS[selectedCategory!].toLowerCase()} allergies in the catalogue.`}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categoryItems.map(item => {
                const isLinked = linkedByCatalogId.has(item.id)
                const isPending =
                  pendingId === item.id && (createMutation.isPending || deleteMutation.isPending)
                return (
                  <label
                    key={item.id}
                    className={
                      'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ' +
                      (isLinked
                        ? CHECKED_COLORS[selectedCategory!]
                        : 'border-border bg-card hover:bg-muted/40')
                    }
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={isLinked}
                      disabled={(!canCreate && !isLinked) || (!canDelete && isLinked) || isPending}
                      onChange={e => onToggle(item, e.target.checked)}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {isPending && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Linked allergies table (when Linked tab is selected) ── */}
      {showingLinked && (
        <>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (() => {
            const q = search.trim().toLowerCase()
            const filtered = q
              ? rows.filter(r => r.allergyName.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q))
              : rows
            return filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                {q ? 'No matching linked allergies.' : 'No allergies linked to this service user yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Allergy</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comment</th>
                      <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(row => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 align-middle font-medium text-foreground">{row.allergyName}</td>
                        <td className="max-w-xl px-3 py-2 align-middle text-muted-foreground">
                          <div className="line-clamp-2 whitespace-pre-wrap">{row.comment}</div>
                        </td>
                        <td className="px-3 py-2 text-right align-middle">
                          <div className="inline-flex gap-1">
                            {canUpdate && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditComment(row)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDeleteId(row.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </>
      )}

      {/* Edit comment dialog */}
      <Dialog open={Boolean(editRow)} onOpenChange={o => !o && setEditRow(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="text-sky-600">
              Edit comment — {editRow?.allergyName}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Comment</label>
              <textarea
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Clinical comment or reaction details"
              />
            </div>
          </DialogBody>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditRow(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-sky-600 text-white hover:bg-sky-700"
              disabled={updateMutation.isPending}
              onClick={() => void saveComment()}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove allergy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the allergy from this service user&apos;s record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
