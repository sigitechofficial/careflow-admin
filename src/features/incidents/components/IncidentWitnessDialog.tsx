import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { INCIDENT_PERSON_KIND_OPTIONS, type IncidentPersonKind } from '@/features/incidents/types'
import type { PendingWitness } from '@/features/incidents/utils/incident-raise-persist'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { createClientUuid } from '@/shared/lib/create-client-uuid'

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/**
 * Adds or edits a witness while raising an incident (saved with the report on submit).
 * Staff and service-user witnesses are picked from their lists so the witness is linked to
 * the real record; anyone else is recorded by name.
 */
export function IncidentWitnessDialog({
  open,
  onOpenChange,
  initial,
  saving = false,
  closeOnSave = true,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** When set, the dialog edits this witness instead of adding a new one. */
  initial?: PendingWitness | null
  /** Show the save button as busy (the parent is saving). */
  saving?: boolean
  /** False when the parent saves straight away and closes the dialog once the save succeeds. */
  closeOnSave?: boolean
  onSave: (witness: PendingWitness) => void
}) {
  const [kind, setKind] = React.useState<IncidentPersonKind | ''>('')
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [employeeId, setEmployeeId] = React.useState('')
  // Picked name, kept for display even after the picker's search results change.
  const [pickedName, setPickedName] = React.useState('')
  const [name, setName] = React.useState('')
  const [statement, setStatement] = React.useState('')
  const [tried, setTried] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setKind(initial?.personKind ?? '')
    setServiceUserId(initial?.personServiceUserId ?? '')
    setEmployeeId(initial?.personEmployeeId ?? '')
    setPickedName(initial?.personServiceUserId || initial?.personEmployeeId ? initial.personName : '')
    setName(initial && !initial.personServiceUserId && !initial.personEmployeeId ? initial.personName : '')
    setStatement(initial?.statement ?? '')
    setTried(false)
  }, [open, initial])

  const [suSearch, setSuSearch] = React.useState('')
  const serviceUsersQuery = useServiceUsers(
    { limit: 50, search: suSearch || undefined },
    open && kind === 'SERVICE_USER',
  )
  const [empSearch, setEmpSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined }, open && kind === 'EMPLOYEE')

  const serviceUserOptions: ComboboxOption[] = React.useMemo(() => {
    const options = (serviceUsersQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.serviceUserNumber ?? undefined,
    }))
    if (serviceUserId && pickedName && !options.some((o) => o.value === serviceUserId)) {
      options.unshift({ value: serviceUserId, label: pickedName, description: undefined })
    }
    return options
  }, [serviceUsersQuery.data, serviceUserId, pickedName])

  const employeeOptions: ComboboxOption[] = React.useMemo(() => {
    const options = (employeesQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    if (employeeId && pickedName && !options.some((o) => o.value === employeeId)) {
      options.unshift({ value: employeeId, label: pickedName, description: undefined })
    }
    return options
  }, [employeesQuery.data, employeeId, pickedName])

  const isLinked = kind === 'SERVICE_USER' || kind === 'EMPLOYEE'
  const errors = {
    kind: !kind ? 'Select the witness type' : '',
    person:
      kind === 'SERVICE_USER' && !serviceUserId
        ? 'Select the service user'
        : kind === 'EMPLOYEE' && !employeeId
          ? 'Select the staff member'
          : kind && !isLinked && !name.trim()
            ? 'Enter the witness name'
            : '',
  }

  function changeKind(next: IncidentPersonKind | '') {
    setKind(next)
    setServiceUserId('')
    setEmployeeId('')
    setPickedName('')
  }

  function save() {
    setTried(true)
    if (!kind || errors.person) return
    onSave({
      id: initial?.id ?? createClientUuid(),
      personKind: kind,
      personServiceUserId: kind === 'SERVICE_USER' ? serviceUserId : null,
      personEmployeeId: kind === 'EMPLOYEE' ? employeeId : null,
      personName: isLinked ? pickedName : name.trim(),
      statement: statement.trim(),
    })
    if (closeOnSave) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit witness' : 'Add witness'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Witness type" htmlFor="wit-kind" required error={tried ? errors.kind : undefined}>
              <select
                id="wit-kind"
                className={selectClass}
                value={kind}
                onChange={(e) => changeKind(e.target.value as IncidentPersonKind | '')}
              >
                <option value="">Select…</option>
                {INCIDENT_PERSON_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>

            {kind === 'SERVICE_USER' && (
              <FormField label="Service user" required error={tried ? errors.person : undefined}>
                <Combobox
                  options={serviceUserOptions}
                  value={serviceUserId}
                  onChange={(id) => {
                    setServiceUserId(id)
                    setPickedName(serviceUserOptions.find((o) => o.value === id)?.label ?? '')
                  }}
                  onSearchChange={setSuSearch}
                  loading={serviceUsersQuery.isLoading}
                  error={tried && Boolean(errors.person)}
                  placeholder="Search service user…"
                  searchPlaceholder="Search service users…"
                />
              </FormField>
            )}
            {kind === 'EMPLOYEE' && (
              <FormField label="Staff member" required error={tried ? errors.person : undefined}>
                <Combobox
                  options={employeeOptions}
                  value={employeeId}
                  onChange={(id) => {
                    setEmployeeId(id)
                    setPickedName(employeeOptions.find((o) => o.value === id)?.label ?? '')
                  }}
                  onSearchChange={setEmpSearch}
                  loading={employeesQuery.isLoading}
                  error={tried && Boolean(errors.person)}
                  placeholder="Search staff…"
                  searchPlaceholder="Search staff…"
                />
              </FormField>
            )}
            {kind && !isLinked && (
              <FormField label="Name" htmlFor="wit-name" required error={tried ? errors.person : undefined}>
                <Input id="wit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              </FormField>
            )}
          </div>

          <FormField label="What did they see?" htmlFor="wit-statement">
            <Textarea
              id="wit-statement"
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Their account, in their own words where possible"
            />
          </FormField>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {initial ? 'Save witness' : 'Add witness'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
