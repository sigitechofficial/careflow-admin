import * as React from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { MedicationPackRow } from '@/features/service-users/types'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import {
  useAddMedicationPackCompartment,
  useAddMedicationPackMember,
  useEndMedicationPackMember,
  useMedicationPackCompartments,
  useMedicationPackMembers,
  useRemoveMedicationPackCompartment,
} from '@/features/service-users/hooks/useMedicationPackLifecycle'
import { ADMINISTRATION_ROUNDS } from '@/features/service-users/medication/blister-pack-wizard.constants'
import { medMatchesCompartmentDueTime } from '@/features/service-users/medication/blister-pack-wizard.utils'

export function EditBlisterPackDialog({
  open,
  onOpenChange,
  serviceUserId,
  pack,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  pack: MedicationPackRow | null
}) {
  const packId = pack?.id ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit pack{pack?.name ? ` — ${pack.name}` : ''}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Change times or medicines. The tray updates as you save each change. Editing is only
            available before Publish.
          </p>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {pack && packId ? (
            <>
              <EditPackTimes serviceUserId={serviceUserId} packId={packId} enabled={open} />
              <EditPackMedicines serviceUserId={serviceUserId} pack={pack} enabled={open} />
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditPackTimes({
  serviceUserId,
  packId,
  enabled,
}: {
  serviceUserId: string
  packId: string
  enabled: boolean
}) {
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, packId, enabled)
  const addCompartment = useAddMedicationPackCompartment(serviceUserId)
  const removeCompartment = useRemoveMedicationPackCompartment(serviceUserId)
  const [adding, setAdding] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [dueTime, setDueTime] = React.useState('08:00')
  const [windowStart, setWindowStart] = React.useState('')
  const [windowEnd, setWindowEnd] = React.useState('')

  const compartments = compartmentsQuery.data ?? []
  const usedTimes = new Set(compartments.map(c => c.dueTime))
  const suggested = ADMINISTRATION_ROUNDS.filter(r => !usedTimes.has(r.time))

  const saveSlot = async (body: {
    label: string
    dueTime: string
    windowStart?: string
    windowEnd?: string
  }) => {
    try {
      await addCompartment.mutateAsync({
        packId,
        body: { ...body, sortOrder: compartments.length },
      })
      toastSuccess('Time added')
      setAdding(false)
      setLabel('')
      setDueTime('08:00')
      setWindowStart('')
      setWindowEnd('')
    } catch (e) {
      toastApiError(e, 'Could not add time')
    }
  }

  const handleRemove = async (compartmentId: string, lbl: string) => {
    if (!window.confirm(`Remove the "${lbl}" time from this pack?`)) return
    try {
      await removeCompartment.mutateAsync({ packId, compartmentId })
      toastSuccess('Time removed')
    } catch (e) {
      toastApiError(e, 'Could not remove time')
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Times</h3>
        <p className="text-xs text-muted-foreground">Pockets on the tray — morning, midday, evening.</p>
      </div>
      {compartmentsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading times…
        </p>
      ) : compartments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No times yet. Add Morning or another slot.</p>
      ) : (
        <ul className="space-y-2">
          {compartments.map(c => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
            >
              <span className="font-medium">{c.label}</span>
              <span className="font-mono text-muted-foreground">{c.dueTime}</span>
              {(c.windowStart || c.windowEnd) && (
                <span className="text-xs text-muted-foreground">
                  ({c.windowStart ?? '—'}–{c.windowEnd ?? '—'})
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-7 gap-1 text-destructive"
                disabled={removeCompartment.isPending}
                onClick={() => void handleRemove(c.id, c.label)}
              >
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggested.map(round => (
            <Button
              key={round.code}
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={addCompartment.isPending}
              onClick={() =>
                void saveSlot({
                  label: round.name,
                  dueTime: round.time,
                  windowStart: round.windowStart,
                  windowEnd: round.windowEnd,
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {round.name}
            </Button>
          ))}
        </div>
      )}

      {adding ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Label</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Morning" />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Due</label>
            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
            <Input type="time" value={windowStart} onChange={e => setWindowStart(e.target.value)} />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
            <Input type="time" value={windowEnd} onChange={e => setWindowEnd(e.target.value)} />
          </div>
          <Button
            size="sm"
            disabled={!label.trim() || !dueTime || addCompartment.isPending}
            onClick={() =>
              void saveSlot({
                label: label.trim(),
                dueTime,
                windowStart: windowStart || undefined,
                windowEnd: windowEnd || undefined,
              })
            }
          >
            {addCompartment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Custom time
        </Button>
      )}
    </section>
  )
}

function EditPackMedicines({
  serviceUserId,
  pack,
  enabled,
}: {
  serviceUserId: string
  pack: MedicationPackRow
  enabled: boolean
}) {
  const membersQuery = useMedicationPackMembers(serviceUserId, pack.id, enabled)
  const compartmentsQuery = useMedicationPackCompartments(serviceUserId, pack.id, enabled)
  const medsQuery = useServiceUserMedications(serviceUserId)
  const addMember = useAddMedicationPackMember(serviceUserId)
  const endMember = useEndMedicationPackMember(serviceUserId)
  const [toAdd, setToAdd] = React.useState('')

  const members = (membersQuery.data ?? []).filter(m => m.status === 'ACTIVE')
  const compartments = compartmentsQuery.data ?? []
  const linkedIds = new Set(members.map(m => m.serviceUserMedicationId))
  const eligible = (medsQuery.data?.rows ?? []).filter(
    m =>
      (m.medicationKind ?? 'REGULAR') !== 'PRN' &&
      !m.isControlledMedication &&
      String(m.status) === 'ACTIVE' &&
      !m.medicationPack &&
      !linkedIds.has(m.id),
  )

  const handleAdd = async () => {
    if (!toAdd) return
    try {
      await addMember.mutateAsync({ packId: pack.id, serviceUserMedicationId: toAdd })
      toastSuccess('Medicine linked')
      setToAdd('')
    } catch (e) {
      toastApiError(e, 'Could not link medicine')
    }
  }

  const handleEnd = async (memberId: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from this pack?`)) return
    try {
      await endMember.mutateAsync({ packId: pack.id, memberId })
      toastSuccess('Medicine removed')
    } catch (e) {
      toastApiError(e, 'Could not remove medicine')
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Medicines</h3>
        <p className="text-xs text-muted-foreground">Tablets on this pack. Link from the chart or remove.</p>
      </div>
      {membersQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading medicines…
        </p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medicines on this pack yet.</p>
      ) : (
        <ul className="space-y-2">
          {members.map(m => {
            const med = m.serviceUserMedication
            const matchedSlots = compartments.filter(c =>
              medMatchesCompartmentDueTime(med?.schedules, c.dueTime),
            )
            return (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-medium">{med?.medicationName ?? 'Medicine'}</span>
                    {med?.strength && <span className="text-muted-foreground">{med.strength}</span>}
                    {med?.dose && <span className="text-muted-foreground">· {med.dose}</span>}
                  </div>
                  {matchedSlots.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {matchedSlots.map(c => (
                        <Badge key={c.id} variant="secondary" size="sm">
                          {c.label} {c.dueTime}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Chart time does not match a tray slot
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-destructive"
                  disabled={endMember.isPending}
                  onClick={() => void handleEnd(m.id, med?.medicationName ?? 'this medicine')}
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {eligible.length > 0 ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Link a chart medicine</label>
            <Select value={toAdd} onValueChange={setToAdd}>
              <SelectTrigger>
                <SelectValue placeholder="Select a scheduled medicine…" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.medicationName}
                    {m.strength ? ` ${m.strength}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!toAdd || addMember.isPending} onClick={() => void handleAdd()}>
            {addMember.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Link'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No other scheduled medicines to link. Add a medicine on Records first, or it is already on a
          pack.
        </p>
      )}
    </section>
  )
}
