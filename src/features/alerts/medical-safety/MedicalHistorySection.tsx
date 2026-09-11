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
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/misc'
import type { MedicalHistoryEventRow } from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalClinicalPermissions,
  useMedicalHistory,
  useMedicalHistoryMutations,
} from '@/features/alerts/hooks/useMedicalClinical'
import { cn } from '@/shared/lib/utils'

export function MedicalHistorySection({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().history
  const query = useMedicalHistory(serviceUserId, perms.read)
  const mutations = useMedicalHistoryMutations(serviceUserId)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<MedicalHistoryEventRow | null>(null)
  const [deactivateId, setDeactivateId] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState('')
  const [eventDate, setEventDate] = React.useState('')
  const [approximateDate, setApproximateDate] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const rows = query.data ?? []

  function openCreate() {
    setEditing(null)
    setTitle('')
    setEventDate('')
    setApproximateDate('')
    setDescription('')
    setNotes('')
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(row: MedicalHistoryEventRow) {
    setEditing(row)
    setTitle(row.title)
    setEventDate(row.eventDate?.slice(0, 10) ?? '')
    setApproximateDate(row.approximateDate ?? '')
    setDescription(row.description ?? '')
    setNotes(row.notes ?? '')
    setFormError(null)
    setDialogOpen(true)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!title.trim()) {
      setFormError('Title is required')
      return
    }
    try {
      const body = {
        title: title.trim(),
        eventDate: eventDate || undefined,
        approximateDate: approximateDate.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      if (editing) {
        await mutations.update.mutateAsync({ id: editing.id, body })
        toastSuccess('History event updated')
      } else {
        await mutations.create.mutateAsync(body)
        toastSuccess('History event recorded')
      }
      setDialogOpen(false)
    } catch (err) {
      toastApiError(err, 'Could not save medical history')
    }
  }

  async function confirmDeactivate() {
    if (!deactivateId) return
    try {
      await mutations.deactivate.mutateAsync(deactivateId)
      toastSuccess('History event deactivated')
      setDeactivateId(null)
    } catch (err) {
      toastApiError(err, 'Could not deactivate history event')
    }
  }

  if (!perms.read) return null

  return (
    <div className="space-y-3" data-testid="medical-history-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Medical history
          </h3>
          <p className="text-xs text-muted-foreground">
            Past clinical events. Not current medical conditions and not operational alerts.
          </p>
        </div>
        {perms.create ? (
          <Button type="button" size="sm" onClick={openCreate} data-testid="add-medical-history">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : query.isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load medical history</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medical history events recorded.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                'flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2.5',
                !row.isActive && 'opacity-70',
              )}
              data-testid={`medical-history-row-${row.id}`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-medium">{row.title}</p>
                  {!row.isActive ? (
                    <Badge variant="outline" size="sm">
                      Inactive
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.eventDate?.slice(0, 10) ||
                    row.approximateDate ||
                    'Date not specified'}
                  {row.source ? ` · ${String(row.source).replace(/_/g, ' ').toLowerCase()}` : ''}
                </p>
                {row.description?.trim() ? (
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                ) : null}
                {row.notes?.trim() ? (
                  <p className="text-xs text-muted-foreground">Notes: {row.notes}</p>
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
            <DialogTitle>{editing ? 'Edit history event' : 'Add medical history'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="hist-title">
                  Title
                </label>
                <Input
                  id="hist-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="hist-date">
                    Event date
                  </label>
                  <Input
                    id="hist-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="hist-approx">
                    Approximate date
                  </label>
                  <Input
                    id="hist-approx"
                    value={approximateDate}
                    onChange={(e) => setApproximateDate(e.target.value)}
                    placeholder="e.g. c. 2019"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="hist-desc">
                  Description
                </label>
                <Textarea
                  id="hist-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="hist-notes">
                  Notes
                </label>
                <Textarea
                  id="hist-notes"
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
            <AlertDialogTitle>Deactivate history event?</AlertDialogTitle>
            <AlertDialogDescription>
              The event will be marked inactive and retained for clinical reference.
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
