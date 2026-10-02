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
import { FormField } from '@/shared/ui/form-field'
import {
  INCIDENT_INJURY_SEVERITY_OPTIONS,
  INCIDENT_INJURY_TYPE_OPTIONS,
  type IncidentInjurySeverity,
  type IncidentPersonKind,
} from '@/features/incidents/types'
import type { PendingIncidentInjury } from '@/features/incidents/utils/incident-injury-persist'
import { BodyMapCanvas, type PlaceMarkerPayload } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { useServiceUserBodyMap } from '@/features/service-users/body-map/hooks/useBodyMap'
import { createClientUuid } from '@/shared/lib/create-client-uuid'

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const OTHER_TYPE = '__other__'

/** Someone named under "Who was affected?" who can be recorded as injured. */
export type InjuredPersonOption = {
  key: string
  kind: IncidentPersonKind
  serviceUserId?: string
  employeeId?: string
  name?: string
  /** e.g. "Enid Morrison (Service user)" */
  label: string
}

function personKey(injury: PendingIncidentInjury): string | null {
  const kind = injury.personKind ?? 'SERVICE_USER'
  if (kind === 'SERVICE_USER') return injury.personServiceUserId ? `SERVICE_USER:${injury.personServiceUserId}` : null
  if (kind === 'EMPLOYEE') return injury.personEmployeeId ? `EMPLOYEE:${injury.personEmployeeId}` : null
  return injury.personName ? `${kind}:${injury.personName.trim().toLowerCase()}` : null
}

/** The option an existing injury points at, or null when that person is no longer listed. */
export function findInjuredPerson(
  injury: PendingIncidentInjury,
  people: InjuredPersonOption[],
): InjuredPersonOption | null {
  const key = personKey(injury)
  return people.find((p) => p.key === key) ?? null
}

/**
 * Adds or edits an injury while raising an incident (nothing is saved until the report is
 * submitted — see `persistIncidentInjury`). Only service users have a body map, so the
 * diagram is shown for them alone; staff and other people get type / severity / notes.
 */
export function IncidentInjuryCaptureDialog({
  open,
  onOpenChange,
  people,
  initial,
  onCapture,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  people: InjuredPersonOption[]
  /** When set, the dialog edits this injury instead of adding a new one. */
  initial?: PendingIncidentInjury | null
  onCapture: (pending: PendingIncidentInjury) => void
}) {
  const [personKeyValue, setPersonKeyValue] = React.useState('')
  const [typeChoice, setTypeChoice] = React.useState('')
  const [otherType, setOtherType] = React.useState('')
  const [severity, setSeverity] = React.useState<IncidentInjurySeverity>('MINOR')
  const [notes, setNotes] = React.useState('')
  const [marker, setMarker] = React.useState<PlaceMarkerPayload | null>(null)
  const [tried, setTried] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const startPerson = initial ? findInjuredPerson(initial, people) : people.length === 1 ? people[0] : null
    setPersonKeyValue(startPerson?.key ?? '')
    const knownType = initial && INCIDENT_INJURY_TYPE_OPTIONS.includes(initial.injuryType)
    setTypeChoice(initial ? (knownType ? initial.injuryType : OTHER_TYPE) : '')
    setOtherType(initial && !knownType ? initial.injuryType : '')
    setSeverity(initial?.severity ?? 'MINOR')
    setNotes(initial?.notes ?? '')
    setMarker(initial?.marker ?? null)
    setTried(false)
    // Reset only when the dialog opens; `people` changing mid-edit must not wipe the form.
  }, [open])

  const person = people.find((p) => p.key === personKeyValue) ?? null
  const bodyMapServiceUserId = person?.kind === 'SERVICE_USER' ? person.serviceUserId ?? '' : ''
  const { data } = useServiceUserBodyMap(bodyMapServiceUserId, false)

  const injuryType = typeChoice === OTHER_TYPE ? otherType.trim() : typeChoice
  const errors = {
    person: !person ? 'Select who was injured' : '',
    type: !typeChoice ? 'Select the injury type' : typeChoice === OTHER_TYPE && !otherType.trim() ? 'Describe the injury' : '',
  }

  function selectPerson(key: string) {
    setPersonKeyValue(key)
    // A pin belongs to one person's body map — drop it when the injured person changes.
    setMarker(null)
  }

  function confirm() {
    setTried(true)
    if (!person || errors.type) return
    onCapture({
      id: initial?.id ?? createClientUuid(),
      injuryType,
      severity,
      notes: notes.trim() || undefined,
      marker: person.kind === 'SERVICE_USER' ? marker : null,
      personKind: person.kind,
      personServiceUserId: person.serviceUserId ?? null,
      personEmployeeId: person.employeeId ?? null,
      personName: person.name ?? null,
      personLabel: person.label,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit injury' : 'Add injury'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Injured person" htmlFor="inj-person" required error={tried ? errors.person : undefined}>
              <select
                id="inj-person"
                className={selectClass}
                value={personKeyValue}
                onChange={(e) => selectPerson(e.target.value)}
              >
                <option value="">Select…</option>
                {people.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Injury type" htmlFor="inj-type" required error={tried ? errors.type : undefined}>
              <select
                id="inj-type"
                className={selectClass}
                value={typeChoice}
                onChange={(e) => setTypeChoice(e.target.value)}
              >
                <option value="">Select…</option>
                {INCIDENT_INJURY_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value={OTHER_TYPE}>Other</option>
              </select>
            </FormField>
            {typeChoice === OTHER_TYPE && (
              <FormField label="Describe the injury" htmlFor="inj-other" required className="sm:col-span-2">
                <Input id="inj-other" value={otherType} onChange={(e) => setOtherType(e.target.value)} />
              </FormField>
            )}
            <FormField label="Severity" htmlFor="inj-severity" required>
              <select
                id="inj-severity"
                className={selectClass}
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentInjurySeverity)}
              >
                {INCIDENT_INJURY_SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Notes" htmlFor="inj-notes">
              <Input
                id="inj-notes"
                placeholder="e.g. 3 cm, red, no bleeding"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </div>

          {person?.kind === 'SERVICE_USER' && bodyMapServiceUserId ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Body map (optional): tap where the injury is. It is added to this service user&apos;s body
                map when the report is submitted.
              </p>
              <div className="rounded-lg border border-border">
                <BodyMapCanvas
                  records={data?.records ?? []}
                  pendingMarker={marker}
                  selectedRecordId={null}
                  markMode
                  showCleared={false}
                  onPlaceMarker={setMarker}
                  onSelectRecord={() => {}}
                  embedded
                />
              </div>
              {marker && (
                <p className="text-xs text-muted-foreground">
                  Placed on:{' '}
                  <span className="font-medium text-foreground">{marker.summaryLabel || marker.bodyPart}</span>
                  {marker.side ? ` · ${marker.side}` : ''}{' '}
                  <button type="button" className="ml-1 text-primary hover:underline" onClick={() => setMarker(null)}>
                    Remove pin
                  </button>
                </p>
              )}
            </div>
          ) : person ? (
            <p className="text-xs text-muted-foreground">
              Body map is only available for service users.
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={confirm}>{initial ? 'Save injury' : 'Add injury'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
