import * as React from 'react'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import {
  useAddIncidentExternalBody,
  useDeleteIncidentExternalBody,
  useUpdateIncidentExternalBody,
} from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_EXTERNAL_BODY_ROLE_OPTIONS,
  INCIDENT_EXTERNAL_BODY_STATUS_OPTIONS,
  INCIDENT_EXTERNAL_BODY_TYPE_OPTIONS,
  isExternalBodyOpen,
  type IncidentExternalBody,
  type IncidentExternalBodyInput,
  type IncidentExternalBodyRole,
  type IncidentExternalBodyStatus,
  type IncidentExternalBodyType,
} from '@/features/incidents/types'

const inputClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const typeLabel = (v: string) => INCIDENT_EXTERNAL_BODY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v
const roleLabel = (v: string) => INCIDENT_EXTERNAL_BODY_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? v
const statusLabel = (v: string) => INCIDENT_EXTERNAL_BODY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v

/** "Police (West Yorkshire Police)"; Other shows just the organisation. */
export function externalBodyDisplayName(b: Pick<IncidentExternalBody, 'bodyType' | 'organisationName'>) {
  const org = b.organisationName?.trim()
  if (!org) return typeLabel(b.bodyType)
  return b.bodyType === 'OTHER' ? org : `${typeLabel(b.bodyType)} (${org})`
}

function StatusBadge({ status }: { status: IncidentExternalBodyStatus }) {
  const variant =
    status === 'CONCLUDED' ? 'success' : status === 'NO_FURTHER_ACTION' ? 'muted' : status === 'IN_PROGRESS' ? 'info' : 'warning'
  return (
    <Badge size="sm" variant={variant}>
      {statusLabel(status)}
    </Badge>
  )
}

/** What was given, received and the outcome — shared by the Investigate list and the Outcome & close summary. */
function ExternalBodyDetails({ body: b }: { body: IncidentExternalBody }) {
  return (
    <>
      {b.informationProvided && <DetailLine label="We provided" value={b.informationProvided} />}
      {b.informationReceived && <DetailLine label="Received from them" value={b.informationReceived} />}
      {b.outcome && (
        <DetailLine
          label={`Outcome${b.outcomeDate ? ` (${formatOrganisationIsoDateLong(b.outcomeDate)})` : ''}`}
          value={b.outcome}
        />
      )}
    </>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm text-foreground">
      <span className="font-medium">{label}:</span> {value}
    </p>
  )
}

/**
 * Outcome & close: read-only summary of every external body — what we gave them, what we got
 * back and their outcome — so closure is decided with it in view. Changes are made on Investigate.
 */
export function IncidentExternalBodiesSummary({ bodies }: { bodies: IncidentExternalBody[] }) {
  if (bodies.length === 0) return null
  const open = bodies.filter((b) => isExternalBodyOpen(b.status)).length
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4" data-testid="incident-external-bodies-summary">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        External bodies ({bodies.length})
      </h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Recorded on the Investigate tab — update them there.
        {open > 0
          ? ` ${open} still open: closing the incident now needs a reason.`
          : ''}
      </p>
      <ul className="space-y-2">
        {bodies.map((b) => (
          <li key={b.id} className="space-y-0.5 rounded-md border border-border bg-background px-3 py-2">
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {externalBodyDisplayName(b)}
              <StatusBadge status={b.status} />
            </p>
            <p className="text-xs text-muted-foreground">
              Referred {formatOrganisationIsoDateLong(b.referredOn)} · {roleLabel(b.role)}
              {b.referenceNumber ? ` · Ref ${b.referenceNumber}` : ''}
            </p>
            <ExternalBodyDetails body={b} />
          </li>
        ))}
      </ul>
    </div>
  )
}

type FormValues = {
  bodyType: IncidentExternalBodyType | ''
  organisationName: string
  referredOn: string
  referenceNumber: string
  contactName: string
  contactPhone: string
  contactEmail: string
  role: IncidentExternalBodyRole | ''
  status: IncidentExternalBodyStatus
  outcome: string
  outcomeDate: string
  informationProvided: string
  informationReceived: string
}

function initialValues(b: IncidentExternalBody | null, today: string): FormValues {
  return {
    bodyType: b?.bodyType ?? '',
    organisationName: b?.organisationName ?? '',
    referredOn: b?.referredOn ?? today,
    referenceNumber: b?.referenceNumber ?? '',
    contactName: b?.contactName ?? '',
    contactPhone: b?.contactPhone ?? '',
    contactEmail: b?.contactEmail ?? '',
    role: b?.role ?? '',
    status: b?.status ?? 'REFERRED',
    outcome: b?.outcome ?? '',
    outcomeDate: b?.outcomeDate ?? '',
    informationProvided: b?.informationProvided ?? '',
    informationReceived: b?.informationReceived ?? '',
  }
}

/** Mirrors the API rules (incident-external-body.util.ts). */
function formErrors(v: FormValues, today: string): Record<string, string> {
  const e: Record<string, string> = {}
  if (!v.bodyType) e.bodyType = 'Choose who is involved'
  if (v.bodyType === 'OTHER' && !v.organisationName.trim()) e.organisationName = 'Name the organisation'
  if (!v.referredOn) e.referredOn = 'Required'
  else if (v.referredOn > today) e.referredOn = 'Can’t be in the future'
  if (!v.role) e.role = 'Required'
  if (!isExternalBodyOpen(v.status)) {
    if (!v.outcome.trim()) e.outcome = 'Record their outcome'
    if (!v.outcomeDate) e.outcomeDate = 'Required'
  }
  if (v.outcomeDate) {
    if (v.outcomeDate > today) e.outcomeDate = 'Can’t be in the future'
    else if (v.referredOn && v.outcomeDate < v.referredOn) e.outcomeDate = 'Can’t be before the referral'
  }
  return e
}

function toInput(v: FormValues): IncidentExternalBodyInput {
  const closed = !isExternalBodyOpen(v.status)
  return {
    bodyType: v.bodyType as IncidentExternalBodyType,
    organisationName: v.organisationName.trim() || null,
    referredOn: v.referredOn,
    referenceNumber: v.referenceNumber.trim() || null,
    contactName: v.contactName.trim() || null,
    contactPhone: v.contactPhone.trim() || null,
    contactEmail: v.contactEmail.trim() || null,
    role: v.role as IncidentExternalBodyRole,
    status: v.status,
    // An outcome belongs to a concluded body; while it's open, a half-typed one isn't kept.
    outcome: closed ? v.outcome.trim() || null : null,
    outcomeDate: closed ? v.outcomeDate || null : null,
    informationProvided: v.informationProvided.trim() || null,
    informationReceived: v.informationReceived.trim() || null,
  }
}

/**
 * Outside bodies (police, local authority safeguarding, CQC…) involved alongside the internal
 * investigation. Several can be involved; each is saved on its own (not with the investigation draft).
 */
export function IncidentExternalBodiesCard({
  incidentId,
  bodies,
  canEdit,
}: {
  incidentId: string
  bodies: IncidentExternalBody[]
  canEdit: boolean
}) {
  const [editing, setEditing] = React.useState<IncidentExternalBody | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<IncidentExternalBody | null>(null)

  if (!canEdit && bodies.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4" data-testid="incident-external-bodies">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        External bodies involved{bodies.length > 0 ? ` (${bodies.length})` : ''}
      </h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Police, local authority safeguarding or others looking into this incident alongside your own
        investigation. If they ask you to stop your own investigation for now, use “Pause investigation”
        at the top.
      </p>
      {bodies.length > 0 && (
        <ul className="mb-3 space-y-2">
          {bodies.map((b) => (
            <li key={b.id} className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {externalBodyDisplayName(b)}
                    <StatusBadge status={b.status} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Referred {formatOrganisationIsoDateLong(b.referredOn)} · {roleLabel(b.role)}
                    {b.referenceNumber ? ` · Ref ${b.referenceNumber}` : ''}
                  </p>
                  {(b.contactName || b.contactPhone || b.contactEmail) && (
                    <p className="text-xs text-muted-foreground">
                      Contact: {[b.contactName, b.contactPhone, b.contactEmail].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <ExternalBodyDetails body={b} />
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                      <Pencil className="mr-1 h-4 w-4" /> Update
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Remove" onClick={() => setRemoving(b)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-4 w-4" /> Add external body
        </Button>
      )}

      {editing && (
        <ExternalBodyDialog
          incidentId={incidentId}
          body={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <RemoveDialog incidentId={incidentId} body={removing} onClose={() => setRemoving(null)} />
      )}
    </div>
  )
}

function ExternalBodyDialog({
  incidentId,
  body,
  onClose,
}: {
  incidentId: string
  body: IncidentExternalBody | null
  onClose: () => void
}) {
  const today = operationalTodayIso()
  const add = useAddIncidentExternalBody(incidentId)
  const update = useUpdateIncidentExternalBody(incidentId)
  const [v, setV] = React.useState<FormValues>(() => initialValues(body, today))
  const [tried, setTried] = React.useState(false)
  const patch = (p: Partial<FormValues>) => setV((prev) => ({ ...prev, ...p }))
  const errors = formErrors(v, today)
  const shown = tried ? errors : {}
  const closed = !isExternalBodyOpen(v.status)
  const typeHint = INCIDENT_EXTERNAL_BODY_TYPE_OPTIONS.find((o) => o.value === v.bodyType)?.hint

  function save() {
    setTried(true)
    if (Object.keys(errors).length) return
    const input = toInput(v)
    if (body) update.mutate({ bodyId: body.id, input }, { onSuccess: onClose })
    else add.mutate(input, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{body ? `Update ${externalBodyDisplayName(body)}` : 'Add external body'}</DialogTitle>
          <DialogDescription>
            Who outside the organisation is involved, and where their investigation has got to.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="Who is involved" required error={shown.bodyType}>
            <select
              className={inputClass}
              value={v.bodyType}
              onChange={(e) => patch({ bodyType: e.target.value as IncidentExternalBodyType })}
              aria-label="Who is involved"
            >
              <option value="">Select…</option>
              {INCIDENT_EXTERNAL_BODY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {typeHint && <p className="mt-1 text-xs text-muted-foreground">{typeHint}</p>}
          </Field>
          <Field label="Organisation name" required={v.bodyType === 'OTHER'} error={shown.organisationName}>
            <Input
              className="mt-1"
              value={v.organisationName}
              onChange={(e) => patch({ organisationName: e.target.value })}
              placeholder="e.g. Leeds City Council, West Yorkshire Police"
              aria-label="Organisation name"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date referred" required error={shown.referredOn}>
              <input
                type="date"
                className={inputClass}
                max={today}
                value={v.referredOn}
                onChange={(e) => patch({ referredOn: e.target.value })}
                aria-label="Date referred"
              />
            </Field>
            <Field label="Their reference">
              <Input
                className="mt-1"
                value={v.referenceNumber}
                onChange={(e) => patch({ referenceNumber: e.target.value })}
                placeholder="Crime ref / case no."
                aria-label="Their reference"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Who leads" required error={shown.role}>
              <select
                className={inputClass}
                value={v.role}
                onChange={(e) => patch({ role: e.target.value as IncidentExternalBodyRole })}
                aria-label="Who leads"
              >
                <option value="">Select…</option>
                {INCIDENT_EXTERNAL_BODY_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status" required>
              <select
                className={inputClass}
                value={v.status}
                onChange={(e) => patch({ status: e.target.value as IncidentExternalBodyStatus })}
                aria-label="Status"
              >
                {INCIDENT_EXTERNAL_BODY_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {closed && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <Field label="Outcome date" required error={shown.outcomeDate}>
                <input
                  type="date"
                  className={inputClass}
                  max={today}
                  min={v.referredOn || undefined}
                  value={v.outcomeDate}
                  onChange={(e) => patch({ outcomeDate: e.target.value })}
                  aria-label="Outcome date"
                />
              </Field>
              <Field label="Their outcome" required error={shown.outcome}>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={v.outcome}
                  onChange={(e) => patch({ outcome: e.target.value })}
                  placeholder={
                    v.status === 'NO_FURTHER_ACTION'
                      ? 'e.g. Police: no further action, insufficient evidence'
                      : 'e.g. Section 42 enquiry: neglect substantiated'
                  }
                  aria-label="Their outcome"
                />
              </Field>
            </div>
          )}
          <p className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Their contact</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              value={v.contactName}
              onChange={(e) => patch({ contactName: e.target.value })}
              placeholder="Name"
              aria-label="Contact name"
            />
            <Input
              value={v.contactPhone}
              onChange={(e) => patch({ contactPhone: e.target.value })}
              placeholder="Phone"
              aria-label="Contact phone"
            />
            <Input
              type="email"
              value={v.contactEmail}
              onChange={(e) => patch({ contactEmail: e.target.value })}
              placeholder="Email"
              aria-label="Contact email"
            />
          </div>
          <Field label="Information we provided">
            <Textarea
              className="mt-1"
              rows={2}
              value={v.informationProvided}
              onChange={(e) => patch({ informationProvided: e.target.value })}
              placeholder="What we gave them and when — e.g. 12 Oct: care notes, MAR and rota emailed; 14 Oct: carer statement"
              aria-label="Information we provided"
            />
          </Field>
          <Field label="Information received from them">
            <Textarea
              className="mt-1"
              rows={2}
              value={v.informationReceived}
              onChange={(e) => patch({ informationReceived: e.target.value })}
              placeholder="Updates, findings or instructions — e.g. 15 Oct strategy meeting; police asked us to pause our investigation"
              aria-label="Information received from them"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={add.isPending || update.isPending} onClick={save}>
            {body ? 'Save changes' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemoveDialog({
  incidentId,
  body,
  onClose,
}: {
  incidentId: string
  body: IncidentExternalBody
  onClose: () => void
}) {
  const del = useDeleteIncidentExternalBody(incidentId)
  const [reason, setReason] = React.useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {externalBodyDisplayName(body)}?</DialogTitle>
          <DialogDescription>
            Only for a record added by mistake. To record that they finished, use Update and set the status.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Field label="Reason" required>
            <Textarea
              className="mt-1"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. added to the wrong incident"
              aria-label="Reason"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            loading={del.isPending}
            onClick={() => del.mutate({ bodyId: body.id, reason: reason.trim() }, { onSuccess: onClose })}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive dark:text-red-400" aria-hidden>
            *
          </span>
        )}
      </p>
      {children}
      {error && <p className="mt-1 text-xs text-destructive dark:text-red-400">{error}</p>}
    </div>
  )
}
