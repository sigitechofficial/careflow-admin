import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { FormField, Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import {
  useDeleteIncidentInjury,
  useDeleteIncidentWitness,
  useRecordIncidentInjury,
  useRecordIncidentWitness,
  useUpdateIncidentInjury,
} from '@/features/incidents/hooks/useIncidentCare'
import {
  IncidentInjuryCaptureDialog,
  type InjuredPersonOption,
} from '@/features/incidents/components/IncidentInjuryCaptureDialog'
import { IncidentWitnessDialog } from '@/features/incidents/components/IncidentWitnessDialog'
import type { PendingIncidentInjury } from '@/features/incidents/utils/incident-injury-persist'
import {
  INCIDENT_INJURY_SEVERITY_LABELS,
  INCIDENT_PERSON_KIND_OPTIONS,
  type IncidentDetail,
  type IncidentInjury,
  type IncidentInjurySeverity,
  type IncidentPersonKind,
  type IncidentWitness,
} from '@/features/incidents/types'

const INJURY_SEVERITY_BADGE: Record<IncidentInjurySeverity, 'info' | 'warning' | 'destructive'> = {
  MINOR: 'info',
  MODERATE: 'warning',
  SERIOUS: 'destructive',
  FATAL: 'destructive',
}

const kindLabel = (kind: IncidentPersonKind) =>
  INCIDENT_PERSON_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? 'Other'

/** Asks why before removing / changing a saved record (kept in the audit log). */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel: string
  loading?: boolean
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = React.useState('')
  const [tried, setTried] = React.useState(false)
  React.useEffect(() => {
    if (open) {
      setReason('')
      setTried(false)
    }
  }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <FormField
            label="Reason"
            htmlFor="reason-dialog"
            required
            error={tried && !reason.trim() ? 'Give a reason' : undefined}
          >
            <Textarea
              id="reason-dialog"
              rows={3}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={loading}
            onClick={() => {
              setTried(true)
              if (reason.trim()) onConfirm(reason.trim())
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Names for the people on the incident, by id. */
function usePeopleNames(incident: IncidentDetail) {
  return React.useMemo(() => {
    const names = new Map<string, string>()
    for (const su of [incident.primaryServiceUser, ...(incident.involvedServiceUsers ?? [])]) {
      if (su?.name) names.set(su.id, su.name)
    }
    for (const emp of [incident.primaryEmployee, ...(incident.involvedEmployees ?? [])]) {
      if (emp?.name) names.set(emp.id, emp.name)
    }
    return names
  }, [incident])
}

/** Everyone on the incident who can be recorded as injured (body map: service users only). */
function useInjuredPeople(incident: IncidentDetail, names: Map<string, string>): InjuredPersonOption[] {
  return React.useMemo(() => {
    const people: InjuredPersonOption[] = []
    const suIds = [
      ...new Set(
        [incident.primaryServiceUserId, ...(incident.involvedServiceUsers ?? []).map((su) => su.id)].filter(
          (x): x is string => Boolean(x),
        ),
      ),
    ]
    for (const id of suIds) {
      people.push({
        key: `SERVICE_USER:${id}`,
        kind: 'SERVICE_USER',
        serviceUserId: id,
        label: `${names.get(id) ?? 'Service user'} (Service user)`,
      })
    }
    const empIds = [
      ...new Set(
        [incident.primaryEmployeeId, ...(incident.involvedEmployees ?? []).map((emp) => emp.id)].filter(
          (x): x is string => Boolean(x),
        ),
      ),
    ]
    for (const id of empIds) {
      people.push({
        key: `EMPLOYEE:${id}`,
        kind: 'EMPLOYEE',
        employeeId: id,
        label: `${names.get(id) ?? 'Staff member'} (Staff member)`,
      })
    }
    const otherKind = incident.affectedPersonKinds.find((k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE')
    const otherName = incident.primaryPersonName?.trim()
    if (otherKind && otherName) {
      people.push({
        key: `${otherKind}:${otherName.toLowerCase()}`,
        kind: otherKind,
        name: otherName,
        label: `${otherName} (${kindLabel(otherKind)})`,
      })
    }
    return people
  }, [incident, names])
}

function injuredPersonLabel(injury: IncidentInjury, names: Map<string, string>): string {
  if (injury.personKind === 'SERVICE_USER' && injury.personServiceUserId)
    return `${names.get(injury.personServiceUserId) ?? 'Service user'} (Service user)`
  if (injury.personKind === 'EMPLOYEE' && injury.personEmployeeId)
    return `${names.get(injury.personEmployeeId) ?? 'Staff member'} (Staff member)`
  if (injury.personName) return `${injury.personName} (${kindLabel(injury.personKind)})`
  return kindLabel(injury.personKind)
}

function toPending(injury: IncidentInjury, label: string): PendingIncidentInjury {
  return {
    id: injury.id,
    injuryType: injury.injuryType,
    severity: injury.injurySeverity,
    notes: injury.notes ?? undefined,
    marker: null,
    personKind: injury.personKind,
    personServiceUserId: injury.personServiceUserId,
    personEmployeeId: injury.personEmployeeId,
    personName: injury.personName,
    personLabel: label,
  }
}

function LabelledRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}

/**
 * Injuries on the detail page, recorded with the same dialog as the raise form (person, type,
 * severity, body map for service users only). Changes and removals need a reason.
 */
export function IncidentInjuriesSection({
  incident,
  canManage,
}: {
  incident: IncidentDetail
  canManage: boolean
}) {
  const names = usePeopleNames(incident)
  const people = useInjuredPeople(incident, names)
  const record = useRecordIncidentInjury(incident.id)
  const update = useUpdateIncidentInjury(incident.id)
  const remove = useDeleteIncidentInjury()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<IncidentInjury | null>(null)
  const [removing, setRemoving] = React.useState<IncidentInjury | null>(null)

  // An injury recorded against someone no longer listed (e.g. from the carer app) stays editable.
  const dialogPeople = React.useMemo(() => {
    if (!editing) return people
    const label = injuredPersonLabel(editing, names)
    const key =
      editing.personKind === 'SERVICE_USER'
        ? `SERVICE_USER:${editing.personServiceUserId}`
        : editing.personKind === 'EMPLOYEE'
          ? `EMPLOYEE:${editing.personEmployeeId}`
          : `${editing.personKind}:${(editing.personName ?? '').trim().toLowerCase()}`
    return people.some((p) => p.key === key)
      ? people
      : [
          ...people,
          {
            key,
            kind: editing.personKind,
            serviceUserId: editing.personServiceUserId ?? undefined,
            employeeId: editing.personEmployeeId ?? undefined,
            name: editing.personName ?? undefined,
            label,
          },
        ]
  }, [editing, people, names])

  function capture(pending: PendingIncidentInjury, reason?: string) {
    if (!editing) {
      record.mutate(pending, { onSuccess: () => setDialogOpen(false) })
      return
    }
    update.mutate(
      { injuryId: editing.id, pending, reason: reason ?? '' },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  return (
    <div className="space-y-3">
      {incident.injuries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No injuries recorded.</p>
      ) : (
        <ul className="space-y-2">
          {incident.injuries.map((injury) => {
            const bodyMapSuId =
              injury.personKind === 'SERVICE_USER'
                ? (injury.personServiceUserId ?? incident.primaryServiceUserId)
                : null
            return (
              <li key={injury.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <dl className="min-w-0 flex-1 space-y-1">
                  <LabelledRow label="Injury type">
                    <span className="font-medium">{injury.injuryType}</span>
                  </LabelledRow>
                  <LabelledRow label="Severity">
                    <Badge variant={INJURY_SEVERITY_BADGE[injury.injurySeverity]} size="sm">
                      {INCIDENT_INJURY_SEVERITY_LABELS[injury.injurySeverity]}
                    </Badge>
                  </LabelledRow>
                  <LabelledRow label="Person">{injuredPersonLabel(injury, names)}</LabelledRow>
                  {(injury.bodyRegion || injury.side || injury.measurements) && (
                    <LabelledRow label="Where">
                      {[injury.bodyRegion, injury.side, injury.measurements].filter(Boolean).join(' · ')}
                    </LabelledRow>
                  )}
                  <LabelledRow label="Body map">
                    {injury.bodyMapRecordId && bodyMapSuId ? (
                      <Link
                        to="/service-users/$serviceUserId/body-map"
                        params={{ serviceUserId: bodyMapSuId }}
                        search={{ recordId: injury.bodyMapRecordId }}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden /> On body map
                      </Link>
                    ) : injury.personKind === 'SERVICE_USER' ? (
                      'Not pinned'
                    ) : (
                      'Not used for staff / other people'
                    )}
                  </LabelledRow>
                  {injury.notes && <LabelledRow label="Notes">{injury.notes}</LabelledRow>}
                </dl>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Edit injury"
                      onClick={() => {
                        setEditing(injury)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Remove injury" onClick={() => setRemoving(injury)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {canManage && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          disabled={people.length === 0}
          title={people.length === 0 ? 'Add the person affected first' : undefined}
        >
          <Plus className="mr-1 h-4 w-4" /> Add injury
        </Button>
      )}

      <IncidentInjuryCaptureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        people={dialogPeople}
        initial={editing ? toPending(editing, injuredPersonLabel(editing, names)) : null}
        reasonRequired={Boolean(editing)}
        existingPin={Boolean(editing?.bodyMapRecordId)}
        saving={record.isPending || update.isPending}
        closeOnCapture={false}
        onCapture={capture}
      />
      <ReasonDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove injury"
        description={
          removing
            ? `${removing.injuryType} — ${injuredPersonLabel(removing, names)}. It stays in the audit log.`
            : undefined
        }
        confirmLabel="Remove injury"
        loading={remove.isPending}
        onConfirm={(reason) =>
          removing && remove.mutate({ injuryId: removing.id, reason }, { onSuccess: () => setRemoving(null) })
        }
      />
    </div>
  )
}

/**
 * Witnesses on the detail page, added with the same dialog as the raise form. A statement is the
 * witness's own account, so it is never edited — remove it (with a reason) and add a new one.
 */
export function IncidentWitnessesSection({
  incident,
  canManage,
}: {
  incident: IncidentDetail
  canManage: boolean
}) {
  const names = usePeopleNames(incident)
  const record = useRecordIncidentWitness(incident.id)
  const remove = useDeleteIncidentWitness()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [removing, setRemoving] = React.useState<IncidentWitness | null>(null)

  const witnessName = (w: IncidentWitness) =>
    w.personName ||
    (w.personServiceUserId ? names.get(w.personServiceUserId) : undefined) ||
    (w.personEmployeeId ? names.get(w.personEmployeeId) : undefined) ||
    'Unnamed'

  return (
    <div className="space-y-3">
      {incident.witnesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No witnesses recorded.</p>
      ) : (
        <ul className="space-y-2">
          {incident.witnesses.map((w) => (
            <li key={w.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <dl className="min-w-0 flex-1 space-y-1">
                <LabelledRow label="Witness">
                  <span className="font-medium">{witnessName(w)}</span>
                </LabelledRow>
                <LabelledRow label="Type">{kindLabel(w.personKind)}</LabelledRow>
                <LabelledRow label="Statement">
                  {w.statement ? (
                    <span className="whitespace-pre-wrap">{w.statement}</span>
                  ) : (
                    <span className="text-muted-foreground">No statement</span>
                  )}
                </LabelledRow>
                {w.statementDate && (
                  <LabelledRow label="Dated">{formatOrganisationDate(w.statementDate)}</LabelledRow>
                )}
              </dl>
              {canManage && (
                <Button size="sm" variant="ghost" aria-label="Remove witness" onClick={() => setRemoving(w)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add witness
        </Button>
      )}

      <IncidentWitnessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        saving={record.isPending}
        closeOnSave={false}
        onSave={(witness) => record.mutate(witness, { onSuccess: () => setDialogOpen(false) })}
      />
      <ReasonDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove witness"
        description={
          removing
            ? `${witnessName(removing)}. Statements are never edited; the removed statement stays in the audit log.`
            : undefined
        }
        confirmLabel="Remove witness"
        loading={remove.isPending}
        onConfirm={(reason) =>
          removing && remove.mutate({ witnessId: removing.id, reason }, { onSuccess: () => setRemoving(null) })
        }
      />
    </div>
  )
}
