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
import { useObservationTypes } from '@/features/service-users/hooks/useServiceUserObservations'
import type { UsualParameterRow } from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalClinicalPermissions,
  useUsualParameterMutations,
  useUsualParameters,
} from '@/features/alerts/hooks/useMedicalClinical'

function formatUsual(row: UsualParameterRow) {
  if (row.usualNumericValue != null) return String(row.usualNumericValue)
  if (row.usualTextValue?.trim()) return row.usualTextValue
  return '—'
}

function formatBand(row: UsualParameterRow) {
  if (row.lowerBand == null && row.upperBand == null) return '—'
  return `${row.lowerBand ?? '—'} – ${row.upperBand ?? '—'}`
}

export function UsualParametersSection({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().usual
  const query = useUsualParameters(serviceUserId, perms.read)
  const typesQuery = useObservationTypes()
  const mutations = useUsualParameterMutations(serviceUserId)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UsualParameterRow | null>(null)
  const [deactivateId, setDeactivateId] = React.useState<string | null>(null)
  const [observationTypeId, setObservationTypeId] = React.useState('')
  const [usualNumericValue, setUsualNumericValue] = React.useState('')
  const [usualTextValue, setUsualTextValue] = React.useState('')
  const [lowerBand, setLowerBand] = React.useState('')
  const [upperBand, setUpperBand] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const rows = query.data ?? []
  const usedTypeIds = new Set(rows.map((r) => r.observationTypeId))
  const types = (typesQuery.data ?? []).filter(
    (t) => !usedTypeIds.has(t.id) || editing?.observationTypeId === t.id,
  )

  function openCreate() {
    setEditing(null)
    setObservationTypeId('')
    setUsualNumericValue('')
    setUsualTextValue('')
    setLowerBand('')
    setUpperBand('')
    setNotes('')
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(row: UsualParameterRow) {
    setEditing(row)
    setObservationTypeId(row.observationTypeId)
    setUsualNumericValue(row.usualNumericValue != null ? String(row.usualNumericValue) : '')
    setUsualTextValue(row.usualTextValue ?? '')
    setLowerBand(row.lowerBand != null ? String(row.lowerBand) : '')
    setUpperBand(row.upperBand != null ? String(row.upperBand) : '')
    setNotes(row.notes ?? '')
    setFormError(null)
    setDialogOpen(true)
  }

  function parseOptionalNumber(raw: string): number | null | undefined {
    if (!raw.trim()) return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return undefined
    return n
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!editing && !observationTypeId) {
      setFormError('Select an observation type')
      return
    }
    const numeric = parseOptionalNumber(usualNumericValue)
    const lower = parseOptionalNumber(lowerBand)
    const upper = parseOptionalNumber(upperBand)
    if (numeric === undefined || lower === undefined || upper === undefined) {
      setFormError('Numeric fields must be valid numbers')
      return
    }
    if (lower != null && upper != null && lower > upper) {
      setFormError('Lower band must be less than or equal to upper band')
      return
    }
    try {
      if (editing) {
        await mutations.update.mutateAsync({
          id: editing.id,
          body: {
            usualNumericValue: numeric,
            usualTextValue: usualTextValue.trim() || null,
            lowerBand: lower,
            upperBand: upper,
            notes: notes.trim() || undefined,
            enabled: true,
          },
        })
        toastSuccess('Usual parameter updated')
      } else {
        await mutations.upsert.mutateAsync({
          observationTypeId,
          usualNumericValue: numeric,
          usualTextValue: usualTextValue.trim() || null,
          lowerBand: lower,
          upperBand: upper,
          notes: notes.trim() || undefined,
          enabled: true,
        })
        toastSuccess('Usual parameter saved')
      }
      setDialogOpen(false)
    } catch (err) {
      toastApiError(err, 'Could not save usual parameter')
    }
  }

  async function confirmDeactivate() {
    if (!deactivateId) return
    try {
      await mutations.deactivate.mutateAsync(deactivateId)
      toastSuccess('Usual parameter disabled')
      setDeactivateId(null)
    } catch (err) {
      toastApiError(err, 'Could not disable usual parameter')
    }
  }

  if (!perms.read) return null

  return (
    <div className="space-y-3" data-testid="usual-parameters-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Usual parameters
          </h3>
          <p className="text-xs text-muted-foreground">
            Baseline / reference values for observation types. These are not actual observation
            readings and do not create alerts.
          </p>
        </div>
        {perms.update ? (
          <Button type="button" size="sm" onClick={openCreate} data-testid="add-usual-parameter">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : query.isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load usual parameters</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No usual parameters configured.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Parameter</th>
                <th className="px-3 py-2 font-medium">Usual value</th>
                <th className="px-3 py-2 font-medium">Range</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {perms.update ? <th className="px-3 py-2 font-medium"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t" data-testid={`usual-parameter-row-${row.id}`}>
                  <td className="px-3 py-2 font-medium">
                    {row.observationType?.name ?? row.observationTypeId}
                  </td>
                  <td className="px-3 py-2">{formatUsual(row)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatBand(row)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.enabled ? 'success' : 'outline'} size="sm">
                      {row.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </td>
                  {perms.update ? (
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(row)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          {row.enabled ? (
                            <DropdownMenuItem onClick={() => setDeactivateId(row.id)}>
                              Disable
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit usual parameter' : 'Add usual parameter'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <DialogBody className="space-y-3">
              {!editing ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Observation type</label>
                  <Select value={observationTypeId || undefined} onValueChange={setObservationTypeId}>
                    <SelectTrigger data-testid="usual-observation-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm font-medium">
                  {editing.observationType?.name ?? 'Observation type'}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="usual-numeric">
                    Usual numeric value
                  </label>
                  <Input
                    id="usual-numeric"
                    type="number"
                    step="any"
                    value={usualNumericValue}
                    onChange={(e) => setUsualNumericValue(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="usual-text">
                    Usual text value
                  </label>
                  <Input
                    id="usual-text"
                    value={usualTextValue}
                    onChange={(e) => setUsualTextValue(e.target.value)}
                    placeholder="e.g. 120/80"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="usual-lower">
                    Lower band
                  </label>
                  <Input
                    id="usual-lower"
                    type="number"
                    step="any"
                    value={lowerBand}
                    onChange={(e) => setLowerBand(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="usual-upper">
                    Upper band
                  </label>
                  <Input
                    id="usual-upper"
                    type="number"
                    step="any"
                    value={upperBand}
                    onChange={(e) => setUpperBand(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="usual-notes">
                  Notes
                </label>
                <Textarea
                  id="usual-notes"
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
                disabled={mutations.upsert.isPending || mutations.update.isPending}
              >
                {(mutations.upsert.isPending || mutations.update.isPending) && (
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
            <AlertDialogTitle>Disable usual parameter?</AlertDialogTitle>
            <AlertDialogDescription>
              The baseline will be disabled. Observation history is not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeactivate()}>Disable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
