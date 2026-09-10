import * as React from 'react'
import { Plus } from 'lucide-react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
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
  type MedicalHistoryEventRow,
  type ReasonableAdjustmentType,
} from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalClinicalPermissions,
  useMedicalHistory,
  useMedicalHistoryMutations,
  useReasonableAdjustmentMutations,
  useReasonableAdjustments,
} from '@/features/alerts/hooks/useMedicalClinical'
import { ClinicalBand, clinicalFieldClass } from '@/features/alerts/medical-safety/ClinicalRecordPrimitives'

export function ReasonableAdjustmentsClinical({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().adjustments
  const query = useReasonableAdjustments(serviceUserId, perms.read)
  const mutations = useReasonableAdjustmentMutations(serviceUserId)
  const [open, setOpen] = React.useState(false)
  const [type, setType] = React.useState<ReasonableAdjustmentType>('OTHER')
  const [description, setDescription] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [editId, setEditId] = React.useState<string | null>(null)

  if (!perms.read) return null

  const rows = (query.data ?? []).filter((r) => r.isActive)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    try {
      if (editId) {
        await mutations.update.mutateAsync({
          id: editId,
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
      setOpen(false)
    } catch (err) {
      toastApiError(err, 'Could not save adjustment')
    }
  }

  return (
    <ClinicalBand
      title="Reasonable Adjustments"
      testId="reasonable-adjustments-clinical"
      actions={
        perms.create || perms.update ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 rounded-none bg-white text-[#0f6b6b] hover:bg-white"
            data-testid="add-edit-impairment"
            onClick={() => {
              setEditId(null)
              setType('OTHER')
              setDescription('')
              setNotes('')
              setOpen(true)
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add/Edit Impairment
          </Button>
        ) : null
      }
    >
      {query.isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : query.isError ? (
        <p className="text-sm text-destructive">Unable to load reasonable adjustments</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">No reasonable adjustments recorded.</p>
      ) : (
        <ul className="divide-y divide-slate-300 border border-slate-300 bg-white">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-1.5 text-[13px]"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {REASONABLE_ADJUSTMENT_TYPE_LABELS[row.type as ReasonableAdjustmentType] ??
                    row.type}
                </p>
                <p className="text-slate-700">{row.description}</p>
                {row.notes?.trim() ? (
                  <p className="text-xs text-slate-500">{row.notes}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
              {perms.update ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-none"
                  onClick={() => {
                    setEditId(row.id)
                    setType((row.type as ReasonableAdjustmentType) || 'OTHER')
                    setDescription(row.description)
                    setNotes(row.notes ?? '')
                    setOpen(true)
                  }}
                >
                  Edit
                </Button>
              ) : null}
              {perms.delete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-none"
                  data-testid={`adjustment-deactivate-${row.id}`}
                  disabled={mutations.deactivate.isPending}
                  onClick={() => {
                    void (async () => {
                      try {
                        await mutations.deactivate.mutateAsync(row.id)
                        toastSuccess('Adjustment deactivated')
                      } catch (err) {
                        toastApiError(err, 'Could not deactivate adjustment')
                      }
                    })()
                  }}
                >
                  Deactivate
                </Button>
              ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit impairment' : 'Add impairment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={(v) => setType(v as ReasonableAdjustmentType)}>
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
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="imp-desc">
                  Description
                </label>
                <Textarea
                  id="imp-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="imp-notes">
                  Notes
                </label>
                <Textarea
                  id="imp-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ClinicalBand>
  )
}

export function MedicalHistoryClinical({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().history
  const query = useMedicalHistory(serviceUserId, perms.read)
  const mutations = useMedicalHistoryMutations(serviceUserId)
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [eventDate, setEventDate] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)

  if (!perms.read) return null

  const rows = (query.data ?? []).filter((r) => r.isActive)

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setBody('')
    setEventDate('')
  }

  function startEdit(row: MedicalHistoryEventRow) {
    setEditingId(row.id)
    setTitle(row.title)
    setEventDate(row.eventDate?.slice(0, 10) ?? '')
    setBody(row.description?.trim() ? row.description : row.notes ?? '')
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      if (editingId) {
        await mutations.update.mutateAsync({
          id: editingId,
          body: {
            title: title.trim(),
            description: body.trim(),
            eventDate: eventDate || undefined,
          },
        })
        toastSuccess('Medical history event updated')
      } else {
        await mutations.create.mutateAsync({
          title: title.trim(),
          description: body.trim() || undefined,
          eventDate: eventDate || undefined,
        })
        toastSuccess('Medical history event added')
      }
      resetForm()
    } catch (err) {
      toastApiError(err, editingId ? 'Could not update medical history' : 'Could not add medical history')
    }
  }

  async function deactivateEvent(id: string) {
    try {
      await mutations.deactivate.mutateAsync(id)
      toastSuccess('Medical history event deactivated')
      if (editingId === id) resetForm()
    } catch (err) {
      toastApiError(err, 'Could not deactivate medical history')
    }
  }

  const showForm = perms.create || (perms.update && Boolean(editingId))

  return (
    <ClinicalBand title="Medical History" testId="medical-history-clinical">
      <p className="mb-2 text-xs text-slate-600">
        Past clinical events. Separate from current medical conditions.
      </p>
      {showForm ? (
        <form onSubmit={addEvent} className="mb-3 space-y-2 border border-slate-300 bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="history-title">
                Title
              </label>
              <Input
                id="history-title"
                placeholder="History title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={clinicalFieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="history-date">
                Date
              </label>
              <Input
                id="history-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={clinicalFieldClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="history-notes">
              Description / notes
            </label>
            <Textarea
              id="history-notes"
              placeholder="Description / notes"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="min-h-[6rem] w-full rounded-none shadow-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            {editingId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-none"
                onClick={resetForm}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              className="rounded-none"
              disabled={editingId ? mutations.update.isPending : mutations.create.isPending}
            >
              {editingId ? 'Save history event' : 'Add history event'}
            </Button>
          </div>
        </form>
      ) : null}
      {query.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : query.isError ? (
        <p className="text-sm text-destructive">Unable to load medical history</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">No medical history events recorded.</p>
      ) : (
        <ul className="divide-y divide-slate-300 border border-slate-300 bg-white">
          {rows.map((row) => (
            <li key={row.id} className="px-3 py-1.5 text-[13px]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-slate-900">{row.title}</p>
                <span className="text-xs text-slate-500">
                  {row.eventDate?.slice(0, 10) || row.approximateDate || 'Date not specified'}
                </span>
              </div>
              {row.description?.trim() ? (
                <p className="mt-0.5 text-xs text-slate-700 whitespace-pre-wrap">{row.description}</p>
              ) : row.notes?.trim() ? (
                <p className="mt-0.5 text-xs text-slate-700 whitespace-pre-wrap">{row.notes}</p>
              ) : null}
              {perms.update || perms.delete ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {perms.update ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-none"
                      data-testid={`history-edit-${row.id}`}
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {perms.delete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-none"
                      data-testid={`history-deactivate-${row.id}`}
                      disabled={mutations.deactivate.isPending}
                      onClick={() => void deactivateEvent(row.id)}
                    >
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ClinicalBand>
  )
}
