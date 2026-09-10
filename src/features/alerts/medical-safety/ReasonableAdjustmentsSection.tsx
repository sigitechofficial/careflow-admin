import * as React from 'react'
import { Loader2, MoreHorizontal, Pencil, Plus } from 'lucide-react'
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
  REASONABLE_ADJUSTMENT_TYPE_LABELS,
  REASONABLE_ADJUSTMENT_TYPES,
  type ReasonableAdjustmentRow,
  type ReasonableAdjustmentType,
} from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalClinicalPermissions,
  useReasonableAdjustmentMutations,
  useReasonableAdjustments,
} from '@/features/alerts/hooks/useMedicalClinical'
import { cn } from '@/shared/lib/utils'

export function ReasonableAdjustmentsSection({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().adjustments
  const query = useReasonableAdjustments(serviceUserId, perms.read)
  const mutations = useReasonableAdjustmentMutations(serviceUserId)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ReasonableAdjustmentRow | null>(null)
  const [deactivateId, setDeactivateId] = React.useState<string | null>(null)
  const [type, setType] = React.useState<ReasonableAdjustmentType>('OTHER')
  const [description, setDescription] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const rows = query.data ?? []

  function openCreate() {
    setEditing(null)
    setType('OTHER')
    setDescription('')
    setNotes('')
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(row: ReasonableAdjustmentRow) {
    setEditing(row)
    setType((row.type as ReasonableAdjustmentType) || 'OTHER')
    setDescription(row.description)
    setNotes(row.notes ?? '')
    setFormError(null)
    setDialogOpen(true)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!description.trim()) {
      setFormError('Description is required')
      return
    }
    try {
      if (editing) {
        await mutations.update.mutateAsync({
          id: editing.id,
          body: { type, description: description.trim(), notes: notes.trim() },
        })
        toastSuccess('Adjustment updated')
      } else {
        await mutations.create.mutateAsync({
          type,
          description: description.trim(),
          notes: notes.trim() || undefined,
        })
        toastSuccess('Adjustment recorded')
      }
      setDialogOpen(false)
    } catch (err) {
      toastApiError(err, 'Could not save reasonable adjustment')
    }
  }

  async function confirmDeactivate() {
    if (!deactivateId) return
    try {
      await mutations.deactivate.mutateAsync(deactivateId)
      toastSuccess('Adjustment deactivated')
      setDeactivateId(null)
    } catch (err) {
      toastApiError(err, 'Could not deactivate adjustment')
    }
  }

  if (!perms.read) return null

  return (
    <div className="space-y-3" data-testid="reasonable-adjustments-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reasonable adjustments
          </h3>
          <p className="text-xs text-muted-foreground">
            Adjustments needed to deliver safe, equitable care.
          </p>
        </div>
        {perms.create ? (
          <Button type="button" size="sm" onClick={openCreate} data-testid="add-reasonable-adjustment">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : query.isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load reasonable adjustments</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reasonable adjustments recorded.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                'flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2.5',
                !row.isActive && 'opacity-70',
              )}
              data-testid={`reasonable-adjustment-row-${row.id}`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" size="sm">
                    {REASONABLE_ADJUSTMENT_TYPE_LABELS[row.type as ReasonableAdjustmentType] ??
                      row.type}
                  </Badge>
                  <Badge variant={row.isActive ? 'success' : 'outline'} size="sm">
                    {row.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{row.description}</p>
                {row.notes?.trim() ? (
                  <p className="text-xs text-muted-foreground">{row.notes}</p>
                ) : null}
              </div>
              {(perms.update || perms.delete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="icon" variant="ghost" aria-label="Actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {perms.update ? (
                      <DropdownMenuItem onClick={() => openEdit(row)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                    ) : null}
                    {perms.delete && row.isActive ? (
                      <DropdownMenuItem onClick={() => setDeactivateId(row.id)}>
                        Deactivate
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit adjustment' : 'Add reasonable adjustment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as ReasonableAdjustmentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONABLE_ADJUSTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {REASONABLE_ADJUSTMENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="adj-desc">
                  Description
                </label>
                <Textarea
                  id="adj-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="adj-notes">
                  Notes
                </label>
                <Textarea
                  id="adj-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
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

      <AlertDialog open={Boolean(deactivateId)} onOpenChange={(o) => !o && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              The adjustment will be marked inactive and kept for reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeactivate()}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
