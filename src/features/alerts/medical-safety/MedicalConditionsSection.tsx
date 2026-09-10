import * as React from 'react'
import { Loader2, MoreHorizontal, Pencil, Plus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
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
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/misc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  MEDICAL_CONDITION_CATEGORY_LABELS,
  MEDICAL_CONDITION_STATUS_LABELS,
  type ServiceUserMedicalConditionRow,
} from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalConditionCatalog,
  useMedicalConditionMutations,
  useMedicalClinicalPermissions,
  useServiceUserMedicalConditions,
} from '@/features/alerts/hooks/useMedicalClinical'
import { cn } from '@/shared/lib/utils'

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return d.slice(0, 10)
}

export function MedicalConditionsSection({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().conditions
  const query = useServiceUserMedicalConditions(serviceUserId, perms.read)
  const mutations = useMedicalConditionMutations(serviceUserId)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ServiceUserMedicalConditionRow | null>(null)
  const [discontinueId, setDiscontinueId] = React.useState<string | null>(null)
  const [catalogSearch, setCatalogSearch] = React.useState('')
  const [conditionId, setConditionId] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [onsetDate, setOnsetDate] = React.useState('')
  const [reviewDate, setReviewDate] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const catalogQuery = useMedicalConditionCatalog(catalogSearch, dialogOpen && !editing)
  const rows = query.data ?? []
  const assignedConditionIds = new Set(rows.map((r) => r.conditionId))
  const active = rows.filter((r) => r.status === 'ACTIVE')
  const inactive = rows.filter((r) => r.status !== 'ACTIVE')

  const catalogOptions = (catalogQuery.data ?? []).filter(
    (c) => c.isActive && (!assignedConditionIds.has(c.id) || editing?.conditionId === c.id),
  )

  function openCreate() {
    setEditing(null)
    setConditionId('')
    setNotes('')
    setOnsetDate('')
    setReviewDate('')
    setCatalogSearch('')
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(row: ServiceUserMedicalConditionRow) {
    setEditing(row)
    setConditionId(row.conditionId)
    setNotes(row.notes ?? '')
    setOnsetDate(row.onsetDate?.slice(0, 10) ?? '')
    setReviewDate(row.reviewDate?.slice(0, 10) ?? '')
    setFormError(null)
    setDialogOpen(true)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      if (editing) {
        await mutations.update.mutateAsync({
          id: editing.id,
          body: {
            notes: notes.trim(),
            onsetDate: onsetDate || undefined,
            reviewDate: reviewDate || undefined,
          },
        })
        toastSuccess('Condition updated')
      } else {
        if (!conditionId) {
          setFormError('Select a condition from the catalogue')
          return
        }
        await mutations.create.mutateAsync({
          conditionId,
          notes: notes.trim() || undefined,
          onsetDate: onsetDate || undefined,
          reviewDate: reviewDate || undefined,
        })
        toastSuccess('Condition recorded')
      }
      setDialogOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('This condition is already recorded for this service user')
        return
      }
      toastApiError(err, 'Could not save medical condition')
    }
  }

  async function confirmDiscontinue() {
    if (!discontinueId) return
    try {
      await mutations.discontinue.mutateAsync(discontinueId)
      toastSuccess('Condition discontinued')
      setDiscontinueId(null)
    } catch (err) {
      toastApiError(err, 'Could not discontinue condition')
    }
  }

  if (!perms.read) return null

  return (
    <div className="space-y-3" data-testid="medical-conditions-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Medical conditions
          </h3>
          <p className="text-xs text-muted-foreground">
            Current conditions from the clinical catalogue. Separate from medical history.
          </p>
        </div>
        {perms.create ? (
          <Button type="button" size="sm" onClick={openCreate} data-testid="add-medical-condition">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : query.isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load medical conditions</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medical conditions recorded.</p>
      ) : (
        <div className="space-y-4">
          <ConditionTable
            rows={active}
            canUpdate={perms.update}
            canDelete={perms.delete}
            onEdit={openEdit}
            onDiscontinue={setDiscontinueId}
          />
          {inactive.length > 0 ? (
            <div className="space-y-2 border-t border-dashed pt-3">
              <h4 className="text-xs font-medium text-muted-foreground">
                Discontinued / inactive
              </h4>
              <ConditionTable
                rows={inactive}
                canUpdate={perms.update}
                canDelete={false}
                onEdit={openEdit}
                onDiscontinue={setDiscontinueId}
                muted
              />
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit condition' : 'Add medical condition'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-3">
              {!editing ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="condition-search">
                      Search catalogue
                    </label>
                    <Input
                      id="condition-search"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search by name or code"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Condition</label>
                    <Select value={conditionId || undefined} onValueChange={setConditionId}>
                      <SelectTrigger data-testid="condition-catalog-select">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {MEDICAL_CONDITION_CATEGORY_LABELS[c.category] ?? c.category}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {catalogQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">Loading catalogue…</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm">
                  <span className="font-medium">{editing.condition?.name ?? 'Condition'}</span>
                  <span className="ml-2 text-muted-foreground">
                    {MEDICAL_CONDITION_CATEGORY_LABELS[editing.condition?.category ?? ''] ??
                      editing.condition?.category}
                  </span>
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="onset-date">
                    Onset date
                  </label>
                  <Input
                    id="onset-date"
                    type="date"
                    value={onsetDate}
                    onChange={(e) => setOnsetDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="review-date">
                    Review date
                  </label>
                  <Input
                    id="review-date"
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="condition-notes">
                  Notes
                </label>
                <Textarea
                  id="condition-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutations.create.isPending || mutations.update.isPending}
              >
                {(mutations.create.isPending || mutations.update.isPending) && (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(discontinueId)} onOpenChange={(o) => !o && setDiscontinueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discontinue condition?</AlertDialogTitle>
            <AlertDialogDescription>
              The condition will be marked discontinued and kept for clinical history. It will not
              create an operational alert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDiscontinue()}>
              Discontinue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ConditionTable({
  rows,
  canUpdate,
  canDelete,
  onEdit,
  onDiscontinue,
  muted,
}: {
  rows: ServiceUserMedicalConditionRow[]
  canUpdate: boolean
  canDelete: boolean
  onEdit: (row: ServiceUserMedicalConditionRow) => void
  onDiscontinue: (id: string) => void
  muted?: boolean
}) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Condition</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Onset</th>
            <th className="px-3 py-2 font-medium">Review</th>
            <th className="px-3 py-2 font-medium">Notes</th>
            {(canUpdate || canDelete) && <th className="px-3 py-2 font-medium"> </th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn('border-t', muted && 'text-muted-foreground')}
              data-testid={`medical-condition-row-${row.id}`}
            >
              <td className="px-3 py-2 font-medium">{row.condition?.name ?? '—'}</td>
              <td className="px-3 py-2">
                {MEDICAL_CONDITION_CATEGORY_LABELS[row.condition?.category ?? ''] ??
                  row.condition?.category ??
                  '—'}
              </td>
              <td className="px-3 py-2">
                <Badge variant={row.status === 'ACTIVE' ? 'secondary' : 'outline'} size="sm">
                  {MEDICAL_CONDITION_STATUS_LABELS[row.status] ?? row.status}
                </Badge>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.onsetDate)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.reviewDate)}</td>
              <td className="max-w-[12rem] truncate px-3 py-2 text-xs">
                {row.notes?.trim() || '—'}
              </td>
              {(canUpdate || canDelete) && (
                <td className="px-3 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" variant="ghost" aria-label="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdate ? (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete && row.status === 'ACTIVE' ? (
                        <DropdownMenuItem onClick={() => onDiscontinue(row.id)}>
                          Discontinue
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
