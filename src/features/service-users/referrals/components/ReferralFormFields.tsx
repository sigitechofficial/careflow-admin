import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { isoToOrgDatetimeLocal, nowOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import { useEnterpriseFunders, useEnterpriseFundingTypes } from '@/features/service-users/hooks/useServiceUserTabs'
import { EmployeePicker } from '@/features/complaints/components/FeedbackPickers'
import type {
  RefName,
  ReferralPayload,
  ReferralPriority,
  ReferralReceivedVia,
  ReferralRow,
  ReferralSourceType,
} from '@/features/service-users/referrals/referral-types'
import {
  REFERRAL_PRIORITY_LABEL,
  REFERRAL_SOURCE_LABEL,
  REFERRAL_VIA_LABEL,
} from '@/features/service-users/referrals/referral-labels'
import { Input } from '@/shared/ui/input'

export const referralSelectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
export const referralTextareaClass =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export type ReferralFormState = {
  sourceType: ReferralSourceType | ''
  referringOrganisation: string
  referrerName: string
  referrerRole: string
  referrerPhone: string
  referrerEmail: string
  /** datetime-local, organisation time */
  referralDate: string
  receivedAt: string
  receivedVia: ReferralReceivedVia
  receivedBy: RefName | null
  locationId: string
  responsible: RefName | null
  priority: ReferralPriority
  careRequirements: string
  expectedStartDate: string
  requestedHoursPerWeek: string
  fundingTypeId: string
  funderId: string
  fundingNotes: string
  nextFollowUpAt: string
  notes: string
}

export function emptyReferralForm(): ReferralFormState {
  return {
    sourceType: '',
    referringOrganisation: '',
    referrerName: '',
    referrerRole: '',
    referrerPhone: '',
    referrerEmail: '',
    referralDate: '',
    receivedAt: nowOrgDatetimeLocal(),
    receivedVia: 'EMAIL',
    receivedBy: null,
    locationId: '',
    responsible: null,
    priority: 'ROUTINE',
    careRequirements: '',
    expectedStartDate: '',
    requestedHoursPerWeek: '',
    fundingTypeId: '',
    funderId: '',
    fundingNotes: '',
    nextFollowUpAt: '',
    notes: '',
  }
}

export function referralFormFromRow(r: ReferralRow): ReferralFormState {
  return {
    sourceType: r.sourceType,
    referringOrganisation: r.referringOrganisation ?? '',
    referrerName: r.referrerName ?? '',
    referrerRole: r.referrerRole ?? '',
    referrerPhone: r.referrerPhone ?? '',
    referrerEmail: r.referrerEmail ?? '',
    referralDate: r.referralDate ? isoToOrgDatetimeLocal(r.referralDate) : '',
    receivedAt: isoToOrgDatetimeLocal(r.receivedAt),
    receivedVia: r.receivedVia,
    receivedBy: r.receivedBy,
    locationId: r.location?.id ?? '',
    responsible: r.responsibleEmployee,
    priority: r.priority,
    careRequirements: r.careRequirements ?? '',
    expectedStartDate: r.expectedStartDate ?? '',
    requestedHoursPerWeek: r.requestedHoursPerWeek != null ? String(r.requestedHoursPerWeek) : '',
    fundingTypeId: r.fundingType?.id ?? '',
    funderId: r.funder?.id ?? '',
    fundingNotes: r.fundingNotes ?? '',
    nextFollowUpAt: r.nextFollowUpAt ? isoToOrgDatetimeLocal(r.nextFollowUpAt) : '',
    notes: r.notes ?? '',
  }
}

/** Anything worth saving beyond the defaults (Add Service User skips the referral when blank). */
export function referralFormHasContent(f: ReferralFormState): boolean {
  return Boolean(
    f.sourceType ||
      f.referringOrganisation.trim() ||
      f.referrerName.trim() ||
      f.careRequirements.trim() ||
      f.notes.trim(),
  )
}

export function validateReferralForm(f: ReferralFormState): string | null {
  if (!f.sourceType) return 'Select the referral source.'
  if (!f.receivedAt) return 'Enter when the referral was received.'
  if (f.requestedHoursPerWeek && !(Number(f.requestedHoursPerWeek) >= 0)) return 'Hours per week must be a number.'
  return null
}

export function referralPayload(f: ReferralFormState): ReferralPayload {
  return {
    sourceType: f.sourceType as ReferralSourceType,
    referringOrganisation: f.referringOrganisation.trim(),
    referrerName: f.referrerName.trim(),
    referrerRole: f.referrerRole.trim(),
    referrerPhone: f.referrerPhone.trim(),
    referrerEmail: f.referrerEmail.trim(),
    referralDate: f.referralDate ? orgDatetimeLocalToIso(f.referralDate) : null,
    receivedAt: orgDatetimeLocalToIso(f.receivedAt),
    receivedVia: f.receivedVia,
    receivedByEmployeeId: f.receivedBy?.id ?? null,
    locationId: f.locationId || null,
    responsibleEmployeeId: f.responsible?.id ?? null,
    priority: f.priority,
    careRequirements: f.careRequirements.trim(),
    expectedStartDate: f.expectedStartDate || null,
    requestedHoursPerWeek: f.requestedHoursPerWeek ? Number(f.requestedHoursPerWeek) : null,
    fundingTypeId: f.fundingTypeId || null,
    funderId: f.funderId || null,
    fundingNotes: f.fundingNotes.trim(),
    nextFollowUpAt: f.nextFollowUpAt ? orgDatetimeLocalToIso(f.nextFollowUpAt) : null,
    notes: f.notes.trim(),
  }
}

/** Organisation label depends on who referred. Family / self / private referrals have no organisation. */
const ORG_LABEL: Partial<Record<ReferralSourceType, string>> = {
  LOCAL_AUTHORITY: 'Council / local authority',
  NHS: 'NHS trust / ICB',
  HOSPITAL: 'Hospital and ward',
  SOCIAL_WORKER: 'Social work team / council',
  GP: 'GP practice',
  OTHER: 'Organisation',
}

/** Privately funded: the payer is a person, captured on the quotation instead of a funding organisation. */
const PRIVATE_CODES = new Set(['PRIVATE', 'SELF_FUNDED', 'FAMILY_FUNDED'])

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className ?? 'space-y-1.5'}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  )
}

/**
 * Referral fields in groups. `compact` (Add Service User) shows who/when/how and the essentials,
 * with assignment, funding and follow-up behind "More referral details".
 */
export function ReferralFormFields({
  value,
  onChange,
  compact = false,
  currentUserName,
}: {
  value: ReferralFormState
  onChange: (next: ReferralFormState) => void
  compact?: boolean
  currentUserName?: string
}) {
  const [moreOpen, setMoreOpen] = React.useState(!compact)
  const set = <K extends keyof ReferralFormState>(k: K) => (v: ReferralFormState[K]) => onChange({ ...value, [k]: v })
  const fundingTypes = useEnterpriseFundingTypes().data ?? []
  const funders = useEnterpriseFunders(moreOpen).data ?? []
  const branches = (useServiceUserLocations(moreOpen).data?.zones ?? []).flatMap(z =>
    z.branches.map(b => ({ id: b.id, name: b.name })),
  )

  const orgLabel = value.sourceType ? ORG_LABEL[value.sourceType] : 'Referring organisation'
  const personLabel =
    value.sourceType === 'SELF_REFERRAL'
      ? 'Name (if different from the service user)'
      : value.sourceType === 'FAMILY' || value.sourceType === 'PRIVATE'
        ? 'Name of the person enquiring'
        : 'Contact person'
  const fundingCode = fundingTypes.find(t => t.id === value.fundingTypeId)?.code ?? ''
  const showFunder = !PRIVATE_CODES.has(fundingCode)

  return (
    <div className="space-y-5" data-testid="referral-form-fields">
      <Group title="Who referred">
        <Field label="Referral source *">
          <select
            className={referralSelectClass}
            value={value.sourceType}
            onChange={e => set('sourceType')(e.target.value as ReferralSourceType)}
            data-testid="referral-source"
          >
            <option value="">— Select —</option>
            {Object.entries(REFERRAL_SOURCE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        {orgLabel ? (
          <Field label={orgLabel}>
            <Input
              value={value.referringOrganisation}
              onChange={e => set('referringOrganisation')(e.target.value)}
              placeholder="e.g. Hounslow Council"
              data-testid="referral-organisation"
            />
          </Field>
        ) : null}
        <Field label={personLabel}>
          <Input
            value={value.referrerName}
            onChange={e => set('referrerName')(e.target.value)}
            placeholder="e.g. Jane Smith"
            data-testid="referral-referrer-name"
          />
        </Field>
        {orgLabel ? (
          <Field label="Role">
            <Input value={value.referrerRole} onChange={e => set('referrerRole')(e.target.value)} placeholder="e.g. Social worker" />
          </Field>
        ) : null}
        <Field label="Phone">
          <Input value={value.referrerPhone} onChange={e => set('referrerPhone')(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={value.referrerEmail} onChange={e => set('referrerEmail')(e.target.value)} />
        </Field>
      </Group>

      <Group title="When and how">
        <Field label="Referral date & time" hint="As written on the referral.">
          <Input type="datetime-local" value={value.referralDate} onChange={e => set('referralDate')(e.target.value)} />
        </Field>
        <Field label="Received date & time *" hint="When it actually reached you.">
          <Input
            type="datetime-local"
            value={value.receivedAt}
            onChange={e => set('receivedAt')(e.target.value)}
            data-testid="referral-received-at"
          />
        </Field>
        <Field label="Received via">
          <select
            className={referralSelectClass}
            value={value.receivedVia}
            onChange={e => set('receivedVia')(e.target.value as ReferralReceivedVia)}
            data-testid="referral-received-via"
          >
            {Object.entries(REFERRAL_VIA_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Received by">
          <EmployeePicker value={value.receivedBy} onChange={set('receivedBy')} placeholder="Staff member" testId="referral-received-by" />
        </Field>
        <Field label="Priority">
          <select
            className={referralSelectClass}
            value={value.priority}
            onChange={e => set('priority')(e.target.value as ReferralPriority)}
            data-testid="referral-priority"
          >
            {Object.entries(REFERRAL_PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        {currentUserName !== undefined ? (
          <Field label="Recorded in system">
            <p className="flex h-9 items-center text-sm text-muted-foreground">
              {currentUserName ? `By ${currentUserName}, when saved` : 'When saved'}
            </p>
          </Field>
        ) : null}
      </Group>

      <Group title="Care needed">
        <Field label="Initial care requirements" className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <textarea
            rows={3}
            className={referralTextareaClass}
            value={value.careRequirements}
            onChange={e => set('careRequirements')(e.target.value)}
            placeholder="e.g. Double-up morning and evening calls for personal care after hip replacement"
            data-testid="referral-care-requirements"
          />
        </Field>
        <Field label="Expected start date">
          <Input
            type="date"
            value={value.expectedStartDate}
            onChange={e => set('expectedStartDate')(e.target.value)}
            data-testid="referral-expected-start"
          />
        </Field>
        <Field label="Hours per week requested">
          <Input
            type="number"
            min={0}
            step="0.25"
            value={value.requestedHoursPerWeek}
            onChange={e => set('requestedHoursPerWeek')(e.target.value)}
          />
        </Field>
        <Field label="Funding arrangement" hint="Leave as 'To be confirmed' if not known yet.">
          <select
            className={referralSelectClass}
            value={value.fundingTypeId}
            onChange={e => onChange({ ...value, fundingTypeId: e.target.value, funderId: '' })}
            data-testid="referral-funding-type"
          >
            <option value="">To be confirmed</option>
            {fundingTypes
              .filter(t => t.code !== 'UNKNOWN')
              .map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </Field>
      </Group>

      {compact ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          onClick={() => setMoreOpen(o => !o)}
          data-testid="referral-more-toggle"
        >
          {moreOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          More referral details (assignment, funding organisation, follow-up)
        </button>
      ) : null}

      {moreOpen ? (
        <>
          <Group title="Assignment">
            <Field label="Assigned branch" hint="Defaults to the service user's branch.">
              <select
                className={referralSelectClass}
                value={value.locationId}
                onChange={e => set('locationId')(e.target.value)}
                data-testid="referral-branch"
              >
                <option value="">— Service user's branch —</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsible employee">
              <EmployeePicker
                value={value.responsible}
                onChange={set('responsible')}
                placeholder="Who is handling it"
                testId="referral-responsible"
              />
            </Field>
            <Field label="Next follow-up">
              <Input
                type="datetime-local"
                value={value.nextFollowUpAt}
                onChange={e => set('nextFollowUpAt')(e.target.value)}
              />
            </Field>
          </Group>

          <Group title="Funding">
            {showFunder ? (
              <Field
                label="Funding organisation"
                hint="Who funds the care (may differ from who referred). Payer and invoice details stay on the Funding tab."
              >
                <select
                  className={referralSelectClass}
                  value={value.funderId}
                  onChange={e => set('funderId')(e.target.value)}
                  data-testid="referral-funder"
                >
                  <option value="">— Not set —</option>
                  {funders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="self-end pb-2 text-xs text-muted-foreground sm:col-span-2">
                Privately funded — record the payer and costs in a quotation on the Referral &amp; Quotes tab.
              </p>
            )}
            <Field label="Funding notes" className="space-y-1.5 sm:col-span-2">
              <Input
                value={value.fundingNotes}
                onChange={e => set('fundingNotes')(e.target.value)}
                placeholder="e.g. Awaiting CHC decision; council to confirm personal budget"
              />
            </Field>
          </Group>
        </>
      ) : null}

      <Field label="Referral notes">
        <textarea
          rows={2}
          className={referralTextareaClass}
          value={value.notes}
          onChange={e => set('notes')(e.target.value)}
          placeholder="Anything else about the referral"
          data-testid="referral-notes"
        />
      </Field>
    </div>
  )
}
