import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import {
  isoToOrgDatetimeLocal,
  nowOrgDatetimeLocal,
  orgDatetimeLocalToIso,
} from '@/shared/lib/operational-day.util'
import type {
  AllocationItemTypeRow,
  EmployeeAllocationRow,
  EmployeeAllocationStatus,
} from '@/features/employees/types'
import {
  useAllocationItemTypes,
  useCreateEmployeeAllocation,
  useUpdateEmployeeAllocation,
} from '@/features/employees/hooks/useEmployeeAllocations'
import { Button } from '@/shared/ui/button'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
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
  ALLOCATION_CATEGORIES,
  ALLOCATION_CATEGORY_LABEL,
  returnDueDateToIso,
  returnDueIsoToDate,
} from '@/features/employees/components/employee-allocations/allocation-labels'

const textareaClass =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function itemOptions(items: AllocationItemTypeRow[], current?: AllocationItemTypeRow): ComboboxOption[] {
  const list = current && !items.some(i => i.id === current.id) ? [current, ...items] : items
  return ALLOCATION_CATEGORIES.flatMap(cat =>
    list
      .filter(i => i.category === cat)
      .map(i => ({ value: i.id, label: i.name, description: ALLOCATION_CATEGORY_LABEL[cat] })),
  )
}

/**
 * Assign an item to an employee, or edit an existing allocation.
 * Pass `employeeOptions` (overview list) to pick the employee in the dialog.
 */
export function AllocationFormDialog({
  open,
  onOpenChange,
  employeeId,
  employeeOptions,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: string
  employeeOptions?: ComboboxOption[]
  editing?: EmployeeAllocationRow | null
}) {
  const itemsQuery = useAllocationItemTypes(open)
  const createMutation = useCreateEmployeeAllocation()
  const updateMutation = useUpdateEmployeeAllocation()
  const saving = createMutation.isPending || updateMutation.isPending

  const [formEmployeeId, setFormEmployeeId] = React.useState('')
  const [itemTypeId, setItemTypeId] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')
  const [size, setSize] = React.useState('')
  const [serialNumber, setSerialNumber] = React.useState('')
  const [issuedAt, setIssuedAt] = React.useState('')
  const [returnDue, setReturnDue] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setFormEmployeeId(editing?.employeeId ?? employeeId ?? '')
    setItemTypeId(editing?.itemTypeId ?? '')
    setQuantity(String(editing?.quantity ?? 1))
    setSize(editing?.size ?? '')
    setSerialNumber(editing?.serialNumber ?? '')
    setIssuedAt(editing ? isoToOrgDatetimeLocal(editing.issuedAt) : nowOrgDatetimeLocal())
    setReturnDue(returnDueIsoToDate(editing?.expectedReturnAt ?? null))
    setNotes(editing?.notes ?? '')
    setError(null)
  }, [open, editing, employeeId])

  const items = itemsQuery.data ?? []
  const options = itemOptions(items, editing?.itemType)
  const selectedItem = items.find(i => i.id === itemTypeId) ?? (editing?.itemType.id === itemTypeId ? editing.itemType : undefined)
  const isEquipment = selectedItem?.category === 'EQUIPMENT'
  const isUniform = selectedItem?.category === 'UNIFORM'

  const onSave = async () => {
    const targetEmployeeId = formEmployeeId || employeeId
    if (!targetEmployeeId) return setError('Select an employee.')
    if (!itemTypeId) return setError('Select an item.')
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) return setError('Quantity must be a whole number of at least 1.')
    if (!issuedAt) return setError('Issue date and time are required.')
    if (returnDue && returnDue < issuedAt.slice(0, 10)) return setError('Return due cannot be before the issue date.')
    const body = {
      itemTypeId,
      quantity: qty,
      size: size.trim(),
      serialNumber: serialNumber.trim(),
      issuedAt: orgDatetimeLocalToIso(issuedAt),
      expectedReturnAt: returnDueDateToIso(returnDue),
      notes: notes.trim(),
    }
    setError(null)
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          employeeId: editing.employeeId,
          allocationId: editing.id,
          body,
        })
        toastSuccess('Allocation updated', `${selectedItem?.name ?? 'Item'} saved.`)
      } else {
        await createMutation.mutateAsync({ employeeId: targetEmployeeId, body })
        toastSuccess('Item allocated', `${selectedItem?.name ?? 'Item'} assigned.`)
      }
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit allocation' : 'Assign item'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3" data-testid="allocation-form">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {employeeOptions && !editing ? (
            <Field label="Employee *">
              <Combobox
                options={employeeOptions}
                value={formEmployeeId}
                onChange={setFormEmployeeId}
                placeholder="Search and select employee…"
                searchPlaceholder="Search by name…"
                className="w-full"
              />
            </Field>
          ) : null}
          <Field label="Item *">
            <div data-testid="allocation-item">
              <Combobox
                options={options}
                value={itemTypeId}
                onChange={setItemTypeId}
                placeholder={itemsQuery.isLoading ? 'Loading items…' : 'Search and select item…'}
                searchPlaceholder="Laptop, gloves, tunic…"
                emptyText="No items. Add them in Settings → Allocation items."
                className="w-full"
              />
            </div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Quantity *">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                data-testid="allocation-quantity"
              />
            </Field>
            <Field label="Size">
              <Input
                value={size}
                onChange={e => setSize(e.target.value)}
                placeholder={isUniform ? 'e.g. M, 12, 8' : 'Optional'}
              />
            </Field>
            <Field label="Serial / asset no.">
              <Input
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder={isEquipment ? 'Serial, IMEI or asset tag' : 'Optional'}
                data-testid="allocation-serial"
              />
            </Field>
          </div>
          <Field label="Issued date & time *">
            <Input type="datetime-local" value={issuedAt} onChange={e => setIssuedAt(e.target.value)} />
          </Field>
          <Field label="Return due">
            <Input type="date" value={returnDue} onChange={e => setReturnDue(e.target.value)} />
          </Field>
          {selectedItem?.returnable && !returnDue ? (
            <p className="text-xs text-muted-foreground">
              {selectedItem.name} is returnable. It will be listed as outstanding until it is marked returned.
            </p>
          ) : null}
          <Field label="Notes">
            <textarea
              rows={2}
              className={textareaClass}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Condition, accessories included…"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSave()} data-testid="allocation-save">
            {saving ? 'Saving…' : editing ? 'Save' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const RETURN_OUTCOMES: { value: Exclude<EmployeeAllocationStatus, 'ISSUED'>; label: string }[] = [
  { value: 'RETURNED', label: 'Returned' },
  { value: 'DAMAGED', label: 'Returned damaged' },
  { value: 'LOST', label: 'Lost / not returned' },
]

/** Record that an item came back (or was lost / damaged). */
export function ReturnAllocationDialog({
  row,
  onOpenChange,
}: {
  row: EmployeeAllocationRow | null
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateEmployeeAllocation()
  const [status, setStatus] = React.useState<Exclude<EmployeeAllocationStatus, 'ISSUED'>>('RETURNED')
  const [returnedAt, setReturnedAt] = React.useState('')
  const [returnNotes, setReturnNotes] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!row) return
    setStatus('RETURNED')
    setReturnedAt(nowOrgDatetimeLocal())
    setReturnNotes('')
    setError(null)
  }, [row])

  const onSave = async () => {
    if (!row) return
    if (!returnedAt) return setError('Date and time are required.')
    setError(null)
    try {
      await updateMutation.mutateAsync({
        employeeId: row.employeeId,
        allocationId: row.id,
        body: { status, returnedAt: orgDatetimeLocalToIso(returnedAt), returnNotes: returnNotes.trim() },
      })
      toastSuccess('Allocation updated', `${row.itemType.name} marked ${status.toLowerCase()}.`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  return (
    <Dialog open={Boolean(row)} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Return {row?.itemType.name ?? 'item'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3" data-testid="allocation-return-form">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="space-y-1.5">
            {RETURN_OUTCOMES.map(o => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="allocation-return-outcome"
                  checked={status === o.value}
                  onChange={() => setStatus(o.value)}
                  data-testid={`allocation-return-${o.value.toLowerCase()}`}
                />
                {o.label}
              </label>
            ))}
          </div>
          <Field label={status === 'LOST' ? 'Reported lost on *' : 'Returned date & time *'}>
            <Input type="datetime-local" value={returnedAt} onChange={e => setReturnedAt(e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea
              rows={2}
              className={textareaClass}
              value={returnNotes}
              onChange={e => setReturnNotes(e.target.value)}
              placeholder="Condition on return, who received it…"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={updateMutation.isPending}
            onClick={() => void onSave()}
            data-testid="allocation-return-save"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
