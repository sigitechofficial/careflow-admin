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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  MEDICAL_ALERT_CATEGORIES,
  MEDICAL_ALERT_CATEGORY_LABELS,
  MEDICAL_ALERT_SEVERITIES,
  MEDICAL_ALERT_SEVERITY_LABELS,
  type MedicalAlertCategory,
  type MedicalAlertRow,
  type MedicalAlertSeverity,
} from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalAlertMutations,
  useMedicalAlerts,
  useMedicalClinicalPermissions,
} from '@/features/alerts/hooks/useMedicalClinical'
import { cn } from '@/shared/lib/utils'

const SEVERITY_BADGE_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  CRITICAL: 'destructive',
  IMPORTANT: 'secondary',
  INFO: 'outline',
}

export function MedicalAlertsSection({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().medicalAlerts
  const query = useMedicalAlerts(serviceUserId, perms.read)
  const mutations = useMedicalAlertMutations(serviceUserId)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<MedicalAlertRow | null>(null)
  const [deactivateId, setDeactivateId] = React.useState<string | null>(null)

  const [title, setTitle] = React.useState('')
  const [category, setCategory] = React.useState<MedicalAlertCategory | ''>('')
  const [severity, setSeverity] = React.useState<MedicalAlertSeverity | ''>('')
  const [description, setDescription] = React.useState('')
  const [actionForCarer, setActionForCarer] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const rows = query.data ?? []
  const active = rows.filter((r) => r.isActive)
  const inactive = rows.filter((r) => !r.isActive)

  function openCreate() {
    setEditing(null)
    setTitle('')
    setCategory('')
    setSeverity('')
    setDescription('')
    setActionForCarer('')
    setNotes('')
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(row: MedicalAlertRow) {
    setEditing(row)
    setTitle(row.title)
    setCategory((row.category as MedicalAlertCategory) ?? '')
    setSeverity((row.severity as MedicalAlertSeverity) ?? '')
    setDescription(row.description ?? '')
    setActionForCarer(row.actionForCarer ?? '')
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
      if (editing) {
        await mutations.update.mutateAsync({
          id: editing.id,
          body: {
            title: title.trim(),
            category: category || undefined,
            severity: severity || undefined,
            description: description.trim() || undefined,
            actionForCarer: actionForCarer.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        })
        toastSuccess('Alert updated')
      } else {
        await mutations.create.mutateAsync({
          title: title.trim(),
          category: category || undefined,
          severity: severity || undefined,
          description: description.trim() || undefined,
          actionForCarer: actionForCarer.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        toastSuccess('Alert created')
      }
      setDialogOpen(false)
    } catch (err) {
      toastApiError(err, 'Could not save medical alert')
    }
  }

  async function confirmDeactivate() {
    if (!deactivateId) return
    try {
      await mutations.deactivate.mutateAsync(deactivateId)
      toastSuccess('Alert deactivated')
      setDeactivateId(null)
    } catch (err) {
      toastApiError(err, 'Could not deactivate alert')
    }
  }

  if (!perms.read) return null

  return (
    <div className="space-y-3" data-testid="medical-alerts-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Medical alerts
          </h3>
          <p className="text-xs text-muted-foreground">
            Alerts shown to carers during visits. Add details for each alert the carer needs to know.
          </p>
        </div>
        {perms.create ? (
          <Button type="button" size="sm" onClick={openCreate} data-testid="add-medical-alert">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add alert
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : query.isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load medical alerts</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medical alerts recorded.</p>
      ) : (
        <div className="space-y-4">
          <AlertTable
            rows={active}
            canUpdate={perms.update}
            canDelete={perms.delete}
            onEdit={openEdit}
            onDeactivate={setDeactivateId}
          />
          {inactive.length > 0 ? (
            <div className="space-y-2 border-t border-dashed pt-3">
              <h4 className="text-xs font-medium text-muted-foreground">Deactivated</h4>
              <AlertTable
                rows={inactive}
                canUpdate={perms.update}
                canDelete={false}
                onEdit={openEdit}
                onDeactivate={setDeactivateId}
                muted
              />
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit alert' : 'Add medical alert'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="alert-title">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="alert-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Diabetes management"
                  maxLength={255}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={category || undefined} onValueChange={(v) => setCategory(v as MedicalAlertCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICAL_ALERT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {MEDICAL_ALERT_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Severity</label>
                  <Select value={severity || undefined} onValueChange={(v) => setSeverity(v as MedicalAlertSeverity)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICAL_ALERT_SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {MEDICAL_ALERT_SEVERITY_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="alert-description">
                  Description
                </label>
                <Textarea
                  id="alert-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the alert in detail"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="alert-action-for-carer">
                  Action for carer
                </label>
                <Textarea
                  id="alert-action-for-carer"
                  value={actionForCarer}
                  onChange={(e) => setActionForCarer(e.target.value)}
                  rows={3}
                  placeholder="What should the carer do?"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="alert-notes">
                  Notes
                </label>
                <Textarea
                  id="alert-notes"
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
            <AlertDialogTitle>Deactivate alert?</AlertDialogTitle>
            <AlertDialogDescription>
              The alert will be deactivated and no longer shown to carers. It will be kept for
              clinical history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeactivate()}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AlertTable({
  rows,
  canUpdate,
  canDelete,
  onEdit,
  onDeactivate,
  muted,
}: {
  rows: MedicalAlertRow[]
  canUpdate: boolean
  canDelete: boolean
  onEdit: (row: MedicalAlertRow) => void
  onDeactivate: (id: string) => void
  muted?: boolean
}) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium">Action for carer</th>
            {(canUpdate || canDelete) && <th className="px-3 py-2 font-medium"> </th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn('border-t', muted && 'text-muted-foreground')}
              data-testid={`medical-alert-row-${row.id}`}
            >
              <td className="px-3 py-2 font-medium">{row.title}</td>
              <td className="px-3 py-2">
                {row.category
                  ? (MEDICAL_ALERT_CATEGORY_LABELS[row.category as MedicalAlertCategory] ?? row.category)
                  : '—'}
              </td>
              <td className="px-3 py-2">
                {row.severity ? (
                  <Badge
                    variant={SEVERITY_BADGE_VARIANT[row.severity] ?? 'outline'}
                    size="sm"
                  >
                    {MEDICAL_ALERT_SEVERITY_LABELS[row.severity as MedicalAlertSeverity] ?? row.severity}
                  </Badge>
                ) : (
                  '—'
                )}
              </td>
              <td className="max-w-[14rem] truncate px-3 py-2 text-xs">
                {row.description?.trim() || '—'}
              </td>
              <td className="max-w-[14rem] truncate px-3 py-2 text-xs">
                {row.actionForCarer?.trim() || '—'}
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
                      {canDelete && row.isActive ? (
                        <DropdownMenuItem onClick={() => onDeactivate(row.id)}>
                          Deactivate
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
