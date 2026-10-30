import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { MultiSelect } from '@/shared/ui/multi-select'
import { toastApiError } from '@/shared/lib/toast'
import { useEnquiryCarePlans, useEnquiryFundingTypes, useEnquiryOwners } from '@/features/crm/hooks/useCrm'
import { useBranchOptions } from '@/features/crm/hooks/useBranchOptions'
import { DuplicateWarning } from '@/features/crm/components/DuplicateWarning'
import {
  ASSESSMENT_PLACES,
  RECEIVED_VIA_LABELS,
  RECEIVED_VIA_OPTIONS,
  SOURCE_LABELS,
  SOURCE_OPTIONS,
  KIND_LABELS,
  URGENCY_LABELS,
  URGENCY_OPTIONS,
} from '@/features/crm/crm-labels'
import type {
  Enquiry,
  EnquiryKind,
  EnquiryReceivedVia,
  EnquirySource,
  EnquiryUrgency,
  EnquiryWriteInput,
} from '@/features/crm/types/crm.types'

/* ─── value helpers ───────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO → value for <input type="datetime-local"> in the browser's local time. */
function toLocalDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** ISO → value for <input type="date">. */
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)
const dateTimeOrNull = (v: string) => (v ? new Date(v).toISOString() : null)
const dateOrNull = (v: string) => (v ? v : null)
const numberOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

type FormState = {
  kind: EnquiryKind
  referringOrganisation: string
  referrerRole: string
  referralReference: string
  referralDate: string
  firstName: string
  lastName: string
  dateOfBirth: string
  addressLine: string
  postcode: string
  needs: string
  carePlanFormIds: string[]
  contactName: string
  contactRelationship: string
  contactPhone: string
  contactEmail: string
  source: EnquirySource
  sourceDetail: string
  receivedVia: EnquiryReceivedVia | ''
  receivedAt: string
  urgency: EnquiryUrgency
  hoursPerWeek: string
  visitsPerDay: string
  requestedStartDate: string
  fundingTypeId: string
  ownerId: string
  nextFollowUpAt: string
  nextAction: string
  locationId: string
  assessmentAt: string
  assessorId: string
  assessmentLocation: string
}

function initialState(e?: Enquiry, defaultLocationId?: string | null, defaultKind?: EnquiryKind): FormState {
  const kind = e?.kind ?? defaultKind ?? 'ENQUIRY'
  return {
    kind,
    referringOrganisation: e?.referringOrganisation ?? '',
    referrerRole: e?.referrerRole ?? '',
    referralReference: e?.referralReference ?? '',
    referralDate: toDateInput(e?.referralDate ?? null),
    firstName: e?.firstName ?? '',
    lastName: e?.lastName ?? '',
    dateOfBirth: toDateInput(e?.dateOfBirth ?? null),
    addressLine: e?.addressLine ?? '',
    postcode: e?.postcode ?? '',
    needs: e?.needs ?? '',
    carePlanFormIds: e?.carePlanFormIds ?? [],
    contactName: e?.contactName ?? '',
    contactRelationship: e?.contactRelationship ?? '',
    contactPhone: e?.contactPhone ?? '',
    contactEmail: e?.contactEmail ?? '',
    source: e?.source ?? (kind === 'REFERRAL' ? 'LOCAL_AUTHORITY' : 'SELF'),
    sourceDetail: e?.sourceDetail ?? '',
    receivedVia: e?.receivedVia ?? (e ? '' : 'PHONE'),
    receivedAt: toLocalDateTime(e?.receivedAt ?? null),
    urgency: e?.urgency ?? 'ROUTINE',
    hoursPerWeek: e?.hoursPerWeek != null ? String(e.hoursPerWeek) : '',
    visitsPerDay: e?.visitsPerDay != null ? String(e.visitsPerDay) : '',
    requestedStartDate: toDateInput(e?.requestedStartDate ?? null),
    fundingTypeId: e?.fundingTypeId ?? '',
    ownerId: e?.ownerId ?? '',
    nextFollowUpAt: toLocalDateTime(e?.nextFollowUpAt ?? null),
    nextAction: e?.nextAction ?? '',
    locationId: e ? (e.locationId ?? '') : (defaultLocationId ?? ''),
    assessmentAt: toLocalDateTime(e?.assessmentAt ?? null),
    assessorId: e?.assessorId ?? '',
    assessmentLocation: e?.assessmentLocation ?? '',
  }
}

function toPayload(f: FormState): EnquiryWriteInput {
  const referral = f.kind === 'REFERRAL'
  return {
    kind: f.kind,
    referringOrganisation: referral ? textOrNull(f.referringOrganisation) : null,
    referrerRole: referral ? textOrNull(f.referrerRole) : null,
    referralReference: referral ? textOrNull(f.referralReference) : null,
    referralDate: referral ? dateOrNull(f.referralDate) : null,
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    dateOfBirth: dateOrNull(f.dateOfBirth),
    addressLine: textOrNull(f.addressLine),
    postcode: textOrNull(f.postcode),
    needs: textOrNull(f.needs),
    carePlanFormIds: f.carePlanFormIds,
    contactName: textOrNull(f.contactName),
    contactRelationship: textOrNull(f.contactRelationship),
    contactPhone: textOrNull(f.contactPhone),
    contactEmail: textOrNull(f.contactEmail),
    source: f.source,
    sourceDetail: textOrNull(f.sourceDetail),
    receivedVia: f.receivedVia || null,
    receivedAt: dateTimeOrNull(f.receivedAt),
    urgency: f.urgency,
    hoursPerWeek: numberOrNull(f.hoursPerWeek),
    visitsPerDay: numberOrNull(f.visitsPerDay),
    requestedStartDate: dateOrNull(f.requestedStartDate),
    fundingTypeId: f.fundingTypeId || null,
    ownerId: f.ownerId || null,
    nextFollowUpAt: dateTimeOrNull(f.nextFollowUpAt),
    nextAction: textOrNull(f.nextAction),
    locationId: f.locationId || null,
    assessmentAt: dateTimeOrNull(f.assessmentAt),
    assessorId: f.assessorId || null,
    assessmentLocation: textOrNull(f.assessmentLocation),
  }
}

/* ─── layout pieces ───────────────────────────────────────────────────── */

const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
const textareaClass = 'min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

function Field({
  label,
  required,
  optional,
  wide,
  hint,
  group,
  children,
}: {
  label: string
  required?: boolean
  /** Shows "(optional)" after the label. */
  optional?: boolean
  wide?: boolean
  hint?: string
  /**
   * Several controls in one field. A <label> passes every click inside it on to its first
   * input, which would steal focus from (and close) a dropdown that is not that input.
   */
  group?: boolean
  children: React.ReactNode
}) {
  const className = `flex flex-col gap-1.5 text-sm ${wide ? 'sm:col-span-2' : ''}`
  const body = (
    <>
      <span className="font-medium">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </>
  )
  return group ? (
    <div role="group" aria-label={label} className={className}>
      {body}
    </div>
  ) : (
    <label className={className}>{body}</label>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  )
}

/* ─── form ────────────────────────────────────────────────────────────── */

type Props = {
  initial?: Enquiry
  /** Button text; a new record says "Create enquiry" or "Create referral" by its type. */
  submitLabel?: string
  /** Type to start a new record with (from "New referral"). */
  defaultKind?: EnquiryKind
  busy?: boolean
  onSubmit: (payload: EnquiryWriteInput) => void
  onCancel: () => void
  /** Branch to preselect on a new enquiry (the header branch). */
  defaultLocationId?: string | null
  /** Show the possible-duplicate warning while typing (new enquiries). */
  checkDuplicates?: boolean
}

export function EnquiryForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  defaultLocationId,
  checkDuplicates,
  defaultKind,
}: Props) {
  const [f, setF] = React.useState<FormState>(() => initialState(initial, defaultLocationId, defaultKind))
  const isReferral = f.kind === 'REFERRAL'
  const { options: branchOptions } = useBranchOptions()
  // Every enquiry belongs to the branch that received it; with only one branch it is chosen for you.
  React.useEffect(() => {
    if (branchOptions.length === 1 && !f.locationId) setF(prev => ({ ...prev, locationId: branchOptions[0]!.id }))
  }, [branchOptions, f.locationId])
  const { data: owners = [], isError: ownersError, isLoading: ownersLoading } = useEnquiryOwners()
  const {
    data: fundingTypes = [],
    isError: fundingError,
    isLoading: fundingLoading,
  } = useEnquiryFundingTypes()
  const { data: carePlans = [], isError: carePlansError, isLoading: carePlansLoading } = useEnquiryCarePlans()
  // Keep a chosen care plan that has since been unpublished, so saving does not drop it silently.
  const carePlanOptions = React.useMemo(() => {
    const options = carePlans.map(c => ({ value: c.id, label: c.name }))
    for (const c of initial?.carePlans ?? []) {
      if (!options.some(o => o.value === c.id)) options.push({ value: c.id, label: c.name })
    }
    return options
  }, [carePlans, initial?.carePlans])

  const setValue = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF(prev => ({ ...prev, [key]: value }))

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF(prev => ({ ...prev, [key]: e.target.value as FormState[K] }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.firstName.trim() || !f.lastName.trim()) {
      toastApiError(null, 'First and last name are required')
      return
    }
    if (!f.locationId) {
      toastApiError(null, 'Choose the branch that received this enquiry')
      return
    }
    if (isReferral && !f.referringOrganisation.trim()) {
      toastApiError(null, 'Enter the referring organisation')
      return
    }
    onSubmit(toPayload(f))
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} data-testid="enquiry-form">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold">Type</p>
            <p className="text-sm text-muted-foreground">
              {isReferral
                ? 'A referral from a professional: council, NHS, hospital, GP or social worker.'
                : 'An enquiry from the person themselves, their family or a friend.'}
            </p>
          </div>
          <div role="radiogroup" aria-label="Type" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            {(['ENQUIRY', 'REFERRAL'] as EnquiryKind[]).map(k => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={f.kind === k}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  f.kind === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() =>
                  setF(prev => ({
                    ...prev,
                    kind: k,
                    // A family source on a referral (or a professional one on an enquiry) is most likely wrong.
                    source:
                      k === 'REFERRAL' && ['SELF', 'FAMILY'].includes(prev.source)
                        ? 'LOCAL_AUTHORITY'
                        : prev.source,
                  }))
                }
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Section title="Person" description="Who the care is for.">
        <Field label="First name" required>
          <Input value={f.firstName} onChange={set('firstName')} />
        </Field>
        <Field label="Last name" required>
          <Input value={f.lastName} onChange={set('lastName')} />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} />
        </Field>
        <Field label="Receiving branch" required hint="The branch that received the enquiry. Its staff will see and manage it.">
          {branchOptions.length > 6 ? (
            <Combobox
              options={branchOptions.map(o => ({ value: o.id, label: o.label }))}
              value={f.locationId}
              onChange={v => setValue('locationId', v)}
              placeholder="Select branch…"
              searchPlaceholder="Search branches…"
              emptyText="No branch found."
              aria-label="Branch"
            />
          ) : (
            <select className={selectClass} value={f.locationId} onChange={set('locationId')} aria-label="Receiving branch">
              <option value="">Select branch…</option>
              {branchOptions.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Postcode">
          <Input value={f.postcode} onChange={set('postcode')} />
        </Field>
        <Field label="Address" wide>
          <Input value={f.addressLine} onChange={set('addressLine')} placeholder="House, street, town" />
        </Field>
        <Field
          label="Care needs"
          wide
          group
          hint={
            carePlansError
              ? 'Could not load care plans'
              : 'Care plans from Settings → Care pathway; add any detail in the notes below'
          }
        >
          <div className="flex flex-col gap-2">
            <MultiSelect
              options={carePlanOptions}
              value={f.carePlanFormIds}
              onChange={v => setValue('carePlanFormIds', v)}
              placeholder={carePlansLoading ? 'Loading care plans…' : 'Select care plans…'}
              searchPlaceholder="Search care plans…"
              disabled={carePlansLoading}
            />
            <textarea
              className={textareaClass}
              value={f.needs}
              onChange={set('needs')}
              placeholder="Notes about the care needed"
              aria-label="Care needs notes"
            />
          </div>
        </Field>
      </Section>

      {checkDuplicates && (
        <DuplicateWarning
          firstName={f.firstName}
          lastName={f.lastName}
          dateOfBirth={f.dateOfBirth}
          phone={f.contactPhone}
          excludeId={initial?.id}
        />
      )}

      {isReferral && (
        <Section title="Referral details" description="The organisation that referred, and its reference for the case.">
          <Field label="Referring organisation" required hint="e.g. Croydon Council Adult Social Care, St George's discharge team">
            <Input value={f.referringOrganisation} onChange={set('referringOrganisation')} />
          </Field>
          <Field label="Referral reference" hint="Their case or referral number">
            <Input value={f.referralReference} onChange={set('referralReference')} />
          </Field>
          <Field label="Referral date" hint="The date on the referral">
            <Input type="date" value={f.referralDate} onChange={set('referralDate')} />
          </Field>
        </Section>
      )}

      <Section
        title={isReferral ? 'Referrer' : 'Received from'}
        description={isReferral ? 'The professional who made the referral.' : 'The person who made the enquiry.'}
      >
        <Field label="Name">
          <Input value={f.contactName} onChange={set('contactName')} />
        </Field>
        {isReferral ? (
          <Field label="Role" hint="e.g. Social worker, Discharge nurse, GP">
            <Input value={f.referrerRole} onChange={set('referrerRole')} />
          </Field>
        ) : (
          <Field label="Relationship" hint="e.g. Daughter, Son, Friend">
            <Input value={f.contactRelationship} onChange={set('contactRelationship')} />
          </Field>
        )}
        <Field label="Phone">
          <Input value={f.contactPhone} onChange={set('contactPhone')} />
        </Field>
        <Field label="Email">
          <Input type="email" value={f.contactEmail} onChange={set('contactEmail')} />
        </Field>
        <Field label="Source">
          <select className={selectClass} value={f.source} onChange={set('source')}>
            {SOURCE_OPTIONS.map(s => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Source detail" hint="e.g. hospital ward, council team">
          <Input value={f.sourceDetail} onChange={set('sourceDetail')} />
        </Field>
      </Section>

      <Section title="Intake">
        <Field label="How received">
          <select className={selectClass} value={f.receivedVia} onChange={set('receivedVia')}>
            <option value="">—</option>
            {RECEIVED_VIA_OPTIONS.map(v => (
              <option key={v} value={v}>
                {RECEIVED_VIA_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Received at">
          <Input type="datetime-local" value={f.receivedAt} onChange={set('receivedAt')} />
        </Field>
        <Field label="Urgency">
          <select className={selectClass} value={f.urgency} onChange={set('urgency')}>
            {URGENCY_OPTIONS.map(u => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Care requirements & funding" description="Used to prepare a quote or bid.">
        <Field label="Hours per week" optional hint="What was asked for; shown on the quote as a guide">
          <Input type="number" min={0} max={168} step={0.5} value={f.hoursPerWeek} onChange={set('hoursPerWeek')} />
        </Field>
        <Field label="Visits per day" optional hint="What was asked for; shown on the quote as a guide">
          <Input type="number" min={0} max={24} step={1} value={f.visitsPerDay} onChange={set('visitsPerDay')} />
        </Field>
        <Field label="Requested start date">
          <Input type="date" value={f.requestedStartDate} onChange={set('requestedStartDate')} />
        </Field>
        <Field
          label="Funding type"
          hint={fundingError ? 'Could not load funding types' : 'Managed in Settings → Funding types'}
        >
          <Combobox
            options={fundingTypes.map(o => ({ value: o.id, label: o.name }))}
            value={f.fundingTypeId}
            onChange={v => setValue('fundingTypeId', v)}
            placeholder="Select funding type…"
            searchPlaceholder="Search funding types…"
            emptyText="No funding type found."
            loading={fundingLoading}
            aria-label="Funding type"
          />
        </Field>
      </Section>

      {/* Booked from the enquiry's Plan ("Book assessment visit"), so only when editing. */}
      {initial && (
        <Section title="Assessment" description="Book the assessment visit. The quote itself is made under Quote on the enquiry.">
          <Field label="Assessment date & time">
            <Input type="datetime-local" value={f.assessmentAt} onChange={set('assessmentAt')} />
          </Field>
          <Field label="Assessor">
            <Combobox
              options={owners.map(o => ({ value: o.id, label: o.name }))}
              value={f.assessorId}
              onChange={v => setValue('assessorId', v)}
              placeholder="Select assessor…"
              searchPlaceholder="Search staff…"
              emptyText="No staff member found."
              loading={ownersLoading}
              aria-label="Assessor"
            />
          </Field>
          <Field label="Assessment place">
            <select className={selectClass} value={f.assessmentLocation} onChange={set('assessmentLocation')}>
              <option value="">—</option>
              {ASSESSMENT_PLACES.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              {f.assessmentLocation && !(ASSESSMENT_PLACES as readonly string[]).includes(f.assessmentLocation) && (
                <option value={f.assessmentLocation}>{f.assessmentLocation}</option>
              )}
            </select>
          </Field>
        </Section>
      )}

      <Section title="Ownership & follow-up">
        <Field label="Owner (assigned to)" hint={ownersError ? 'Could not load staff list' : undefined}>
          <Combobox
            options={owners.map(o => ({ value: o.id, label: o.name }))}
            value={f.ownerId}
            onChange={v => setValue('ownerId', v)}
            placeholder="Unassigned"
            searchPlaceholder="Search staff…"
            emptyText="No staff member found."
            loading={ownersLoading}
            aria-label="Owner"
          />
        </Field>
        <Field label="Next follow-up">
          <Input type="datetime-local" value={f.nextFollowUpAt} onChange={set('nextFollowUpAt')} />
        </Field>
        <Field label="Next action" wide hint="e.g. Call daughter to book assessment">
          <Input value={f.nextAction} onChange={set('nextAction')} />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : (submitLabel ?? `Create ${isReferral ? 'referral' : 'enquiry'}`)}
        </Button>
      </div>
    </form>
  )
}
