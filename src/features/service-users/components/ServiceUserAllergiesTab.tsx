import * as React from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { type ServiceUserAllergyRow, type SuLookupRow } from '@/features/service-users/types'
import {
  useCreateServiceUserAllergy,
  useDeleteServiceUserAllergy,
  useUpdateServiceUserAllergy,
} from '@/features/service-users/hooks/useServiceUserMutations'
import { useServiceUserAllergies } from '@/features/service-users/hooks/useServiceUserTabs'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import {
  ALLERGY_CATALOG_CATEGORY_LABELS,
  ALLERGY_CATALOG_CATEGORY_ORDER,
  type AllergyCatalogCategory,
} from '@/features/settings/allergy-catalog-categories'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const SELECT_NONE = '__none__'
const SELECT_CUSTOM = '__custom__'

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
  /** Use `inline` when this editor is already inside a dialog (avoids nested modals). */
  formMode?: 'dialog' | 'inline'
}) {
  const can = useAuthStore((s) => s.can)
  const canRead =
    can('service_users.allergies.read') || can('service_users.read')
  const canCreate =
    !disabled && (can('service_users.allergies.create') || can('service_users.update'))
  const canUpdate =
    !disabled && (can('service_users.allergies.update') || can('service_users.update'))
  const canDelete =
    !disabled && (can('service_users.allergies.delete') || can('service_users.delete'))

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

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [catalogId, setCatalogId] = React.useState<string>(SELECT_NONE)
  const [customName, setCustomName] = React.useState('')
  const [comment, setComment] = React.useState('')
  const [catalogSearch, setCatalogSearch] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const catalogByCategory = React.useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    const grouped = new Map<AllergyCatalogCategory, SuLookupRow[]>()
    for (const cat of ALLERGY_CATALOG_CATEGORY_ORDER) grouped.set(cat, [])
    for (const item of allergyCatalog) {
      const cat = (item.category as AllergyCatalogCategory | undefined) ?? 'OTHER'
      if (!ALLERGY_CATALOG_CATEGORY_ORDER.includes(cat)) continue
      if (q && !item.name.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) {
        continue
      }
      grouped.get(cat)!.push(item)
    }
    return grouped
  }, [allergyCatalog, catalogSearch])

  function resetForm() {
    setCatalogId(SELECT_NONE)
    setCustomName('')
    setComment('')
    setCatalogSearch('')
    setFormError(null)
  }

  function openAdd() {
    setEditingId(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(row: ServiceUserAllergyRow) {
    setEditingId(row.id)
    setComment(row.comment)
    setFormError(null)
    if (row.allergyCatalogId && allergyCatalog.some((a) => a.id === row.allergyCatalogId)) {
      setCatalogId(row.allergyCatalogId)
      setCustomName('')
    } else {
      setCatalogId(SELECT_CUSTOM)
      setCustomName(row.allergyName)
    }
    setDialogOpen(true)
  }

  function buildPayload(): { allergyCatalogId?: string; allergyName?: string; comment: string } {
    const c = comment.trim()
    if (!c) throw new Error('Comment is required.')
    if (catalogId === SELECT_NONE) throw new Error('Please select an allergy.')
    if (catalogId === SELECT_CUSTOM) {
      const n = customName.trim()
      if (!n) throw new Error('Enter an allergy name or pick from the list.')
      return { allergyName: n, comment: c }
    }
    return { allergyCatalogId: catalogId, comment: c }
  }

  const formSaving = createMutation.isPending || updateMutation.isPending
  const deleteSaving = deleteMutation.isPending
  const inlineForm = formMode === 'inline' && dialogOpen

  const allergyFormFields = (
    <div className="space-y-4">
      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">
          Allergy name <span className="text-destructive">*</span>
        </label>
        <Input
          value={catalogSearch}
          onChange={e => setCatalogSearch(e.target.value)}
          placeholder="Search catalogue (food, latex, penicillin…)"
          className="mb-2"
        />
        <Select value={catalogId} onValueChange={setCatalogId}>
          <SelectTrigger>
            <SelectValue placeholder="Please select Allergy" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={SELECT_NONE}>Please select Allergy</SelectItem>
            {ALLERGY_CATALOG_CATEGORY_ORDER.map(cat => {
              const items = catalogByCategory.get(cat) ?? []
              if (items.length === 0) return null
              return (
                <SelectGroup key={cat}>
                  <SelectLabel>{ALLERGY_CATALOG_CATEGORY_LABELS[cat]}</SelectLabel>
                  {items.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
            <SelectItem value={SELECT_CUSTOM}>Other (type below)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {catalogId === SELECT_CUSTOM && (
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Allergy name (free text)</label>
          <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Enter allergy" />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-sm text-muted-foreground">
          Comment <span className="text-destructive">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Clinical comment or reaction details"
        />
      </div>
    </div>
  )

  const allergyFormActions = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={formSaving}>
        Close
      </Button>
      <Button
        type="button"
        className="bg-sky-600 text-white hover:bg-sky-700"
        disabled={formSaving || (editingId ? !canUpdate : !canCreate)}
        onClick={() => void saveForm()}
      >
        {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
      </Button>
    </div>
  )

  async function saveForm() {
    setFormError(null)
    let payload: { allergyCatalogId?: string; allergyName?: string; comment: string }
    try {
      payload = buildPayload()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Invalid form')
      toastError('Cannot save allergy', e instanceof Error ? e.message : 'Invalid form')
      return
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ allergyId: editingId, body: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setDialogOpen(false)
      toastSuccess(editingId ? 'Allergy updated' : 'Allergy added', 'The allergy list has been saved.')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
      toastSuccess('Allergy removed', 'The allergy was deleted.')
    } catch (e) {
      toastApiError(e, 'Delete failed')
    }
  }

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
    <section className={compact ? 'space-y-3' : 'space-y-4'} data-testid="service-user-allergies-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hideHeading ? (
          <span className="text-sm text-muted-foreground">
            {rows.length === 0 ? 'No allergies on the profile yet.' : `${rows.length} recorded on profile`}
          </span>
        ) : (
          <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Allergies</h2>
        )}
        {canCreate && !inlineForm && (
          <Button type="button" size="sm" className="gap-1 bg-sky-600 text-white hover:bg-sky-700" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add allergy
          </Button>
        )}
      </div>

      {inlineForm ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-sky-600">{editingId ? 'Edit allergy' : 'Add allergy'}</p>
          {allergyFormFields}
          {allergyFormActions}
        </div>
      ) : null}

      {listError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {listError}
        </div>
      )}

      {loading ? (
        <div className={compact ? 'flex justify-center py-6' : 'flex justify-center py-12'}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No allergies recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Allergy</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comment</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 align-middle font-medium text-foreground">{row.allergyName}</td>
                  <td className="max-w-xl px-3 py-2 align-middle text-muted-foreground">
                    <div className="line-clamp-3 whitespace-pre-wrap">{row.comment}</div>
                  </td>
                  <td className="px-3 py-2 text-right align-middle">
                    <div className="inline-flex gap-1">
                      {canUpdate && (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      )}
                      {canDelete && (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setDeleteId(row.id)}>
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
      )}

      {formMode === 'dialog' ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent size="md" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sky-600">{editingId ? 'Edit Allergy' : 'Add Allergy'}</DialogTitle>
            </DialogHeader>
            <DialogBody>{allergyFormFields}</DialogBody>
            <DialogFooter className="gap-2 sm:justify-end">{allergyFormActions}</DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove allergy?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the allergy from this service user&apos;s record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={deleteSaving}>
              {deleteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
