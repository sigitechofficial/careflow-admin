import * as React from 'react'
import { MapPin, ShieldAlert } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import {
  ALLEGED_PERSON_OPTIONS,
  DEATH_CONFIRMED_BY_ROLES,
  PRESSURE_ULCER_GRADES,
  WOUND_STATUS_OPTIONS,
  type AllegedPerson,
  type CategoryDetails,
} from '@/features/incidents/category-details'
import type { IncidentVisitOption } from '@/features/incidents/types'
import { formatOrganisationTime } from '@/shared/lib/organisation-display-format.store'

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const OTHER_MEDICATION = '__other__'

/** Yes / No radio pair (optionally with "Not known" = null). */
export function YesNoField({
  name,
  value,
  onChange,
  allowUnknown = false,
}: {
  name: string
  value: boolean | null | undefined
  onChange: (v: boolean | null) => void
  allowUnknown?: boolean
}) {
  const options: { label: string; v: boolean | null }[] = [
    { label: 'Yes', v: true },
    { label: 'No', v: false },
    ...(allowUnknown ? [{ label: 'Not known', v: null }] : []),
  ]
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => {
        const checked = allowUnknown ? (value ?? null) === o.v : value === o.v
        return (
          <label
            key={o.label}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/40',
              checked ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <input type="radio" name={name} checked={checked} onChange={() => onChange(o.v)} className="h-4 w-4" />
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function time(iso: string | null | undefined) {
  return iso ? formatOrganisationTime(iso) : '—'
}

/**
 * The extra questions for the selected category (only categories listed in
 * CATEGORY_DETAILS_TITLE have any). Data already captured elsewhere — who was informed,
 * injuries, the linked visit and SOS — is reused/shown read-only rather than asked again.
 */
export function IncidentCategoryDetailsFields({
  categoryKey,
  subtypeKey,
  value,
  onChange,
  errors,
  serviceUserId,
  selectedVisit,
  visitLinked,
  bodyMap,
}: {
  categoryKey: string
  subtypeKey?: string
  value: CategoryDetails
  onChange: (next: CategoryDetails) => void
  errors: Record<string, string>
  serviceUserId?: string
  selectedVisit: IncidentVisitOption | null
  /** False when "No matching visit found" was chosen. */
  visitLinked: boolean
  bodyMap?: { needed: boolean; pinned: boolean; onAdd: () => void; error?: string }
}) {
  const patch = (p: CategoryDetails) => onChange({ ...value, ...p })
  const set = (key: string, v: unknown) => patch({ [key]: v })

  if (categoryKey === 'MEDICATION') return <MedicationFields {...{ value, set, patch, errors, serviceUserId }} />
  if (categoryKey === 'SAFEGUARDING') return <SafeguardingFields {...{ value, set, errors }} />

  if (categoryKey === 'SKIN_WOUND') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="New, existing or deteriorated?" required error={errors.woundStatus} className="sm:col-span-2">
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {WOUND_STATUS_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/40',
                  value.woundStatus === o.value ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <input
                  type="radio"
                  name="cd-wound-status"
                  checked={value.woundStatus === o.value}
                  onChange={() => set('woundStatus', o.value)}
                  className="h-4 w-4"
                />
                {o.label}
              </label>
            ))}
          </div>
        </FormField>
        {subtypeKey === 'PRESSURE_ULCER' && (
          <FormField label="Pressure ulcer grade" htmlFor="cd-pu-grade" required error={errors.pressureUlcerGrade}>
            <select
              id="cd-pu-grade"
              className={selectClass}
              value={String(value.pressureUlcerGrade ?? '')}
              onChange={(e) => set('pressureUlcerGrade', e.target.value || undefined)}
            >
              <option value="">Select…</option>
              {PRESSURE_ULCER_GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {bodyMap?.needed && (
          <div className="space-y-1 sm:col-span-2">
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2',
                bodyMap.pinned ? 'border-border bg-muted/20' : 'border-primary/50 bg-primary/5',
              )}
            >
              <p className="text-sm text-foreground">
                {bodyMap.pinned
                  ? 'Marked on the body map (see Injuries below).'
                  : 'Mark where it is on the service user’s body map.'}
              </p>
              <Button type="button" size="sm" variant={bodyMap.pinned ? 'outline' : 'default'} onClick={bodyMap.onAdd}>
                <MapPin className="mr-1 h-3.5 w-3.5" /> {bodyMap.pinned ? 'Add another' : 'Add on body map'}
              </Button>
            </div>
            {bodyMap.error && <p className="text-xs font-medium text-destructive dark:text-red-400">{bodyMap.error}</p>}
          </div>
        )}
      </div>
    )
  }

  if (categoryKey === 'CARE_DELIVERY') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {selectedVisit ? (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/20 p-3 sm:col-span-2 sm:grid-cols-4">
            <ReadOnly label="Scheduled" value={`${time(selectedVisit.startsAt)}–${time(selectedVisit.endsAt)}`} />
            <ReadOnly label="Actual arrival" value={time(selectedVisit.actualStartsAt)} />
            <ReadOnly label="Actual departure" value={time(selectedVisit.actualEndsAt)} />
            <ReadOnly label="Visit status" value={selectedVisit.status.charAt(0) + selectedVisit.status.slice(1).toLowerCase().replace(/_/g, ' ')} />
          </div>
        ) : !visitLinked ? (
          <FormField
            label="Why no visit matches"
            htmlFor="cd-no-visit"
            required
            error={errors.noMatchingVisitReason}
            className="sm:col-span-2"
          >
            <Textarea
              id="cd-no-visit"
              rows={2}
              value={String(value.noMatchingVisitReason ?? '')}
              onChange={(e) => set('noMatchingVisitReason', e.target.value)}
              placeholder="e.g. visit was never scheduled, wrong service user on the rota"
            />
          </FormField>
        ) : (
          <p className="text-sm text-muted-foreground sm:col-span-2">Choose the visit above to see its times.</p>
        )}
        <FormField
          label="Reason it was missed, late, short or not completed"
          htmlFor="cd-reason"
          required
          error={errors.reason}
          className="sm:col-span-2"
        >
          <Textarea
            id="cd-reason"
            rows={2}
            value={String(value.reason ?? '')}
            onChange={(e) => set('reason', e.target.value)}
            placeholder="e.g. carer delayed at previous visit, no access to the property"
          />
        </FormField>
      </div>
    )
  }

  if (categoryKey === 'DEATH') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Who confirmed / notified the death" htmlFor="cd-death-name" required error={errors.confirmedByName}>
          <Input
            id="cd-death-name"
            value={String(value.confirmedByName ?? '')}
            onChange={(e) => set('confirmedByName', e.target.value)}
            placeholder="Full name"
          />
        </FormField>
        <FormField label="Their role" htmlFor="cd-death-role" required error={errors.confirmedByRole}>
          <select
            id="cd-death-role"
            className={selectClass}
            value={String(value.confirmedByRole ?? '')}
            onChange={(e) => set('confirmedByRole', e.target.value || undefined)}
          >
            <option value="">Select…</option>
            {DEATH_CONFIRMED_BY_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    )
  }

  if (categoryKey === 'INFECTION') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Symptoms / details" htmlFor="cd-inf-symptoms" required error={errors.symptoms} className="sm:col-span-2">
          <Textarea
            id="cd-inf-symptoms"
            rows={2}
            value={String(value.symptoms ?? '')}
            onChange={(e) => set('symptoms', e.target.value)}
          />
        </FormField>
        <FormField label="Symptoms started on" htmlFor="cd-inf-start" error={errors.symptomsStartedOn}>
          <Input
            id="cd-inf-start"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={String(value.symptomsStartedOn ?? '')}
            onChange={(e) => set('symptomsStartedOn', e.target.value || undefined)}
          />
        </FormField>
        <FormField
          label="PPE / infection-control action taken"
          htmlFor="cd-inf-action"
          required
          error={errors.infectionControlAction}
          className="sm:col-span-2"
        >
          <Textarea
            id="cd-inf-action"
            rows={2}
            value={String(value.infectionControlAction ?? '')}
            onChange={(e) => set('infectionControlAction', e.target.value)}
          />
        </FormField>
      </div>
    )
  }

  if (categoryKey === 'VIOLENCE_TO_STAFF') {
    return (
      <p className="text-sm text-foreground">
        {selectedVisit ? (
          selectedVisit.sosRaised ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-destructive dark:text-red-400">
              <ShieldAlert className="h-4 w-4" aria-hidden /> A carer SOS was raised during this visit.
            </span>
          ) : (
            'No carer SOS was raised during this visit.'
          )
        ) : (
          <span className="text-muted-foreground">Link the visit above to check whether an SOS was raised.</span>
        )}
        <span className="mt-1 block text-xs text-muted-foreground">
          Record any staff injury under Injuries, and police contact under “Who was informed?”.
        </span>
      </p>
    )
  }

  if (categoryKey === 'DATA_BREACH') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Type of information affected"
          htmlFor="cd-db-type"
          required
          error={errors.informationType}
          className="sm:col-span-2"
        >
          <Input
            id="cd-db-type"
            value={String(value.informationType ?? '')}
            onChange={(e) => set('informationType', e.target.value)}
            placeholder="e.g. care plan, medication record, contact details"
          />
        </FormField>
        <FormField label="Number of people affected" htmlFor="cd-db-count" required error={errors.peopleAffected}>
          <Input
            id="cd-db-count"
            type="number"
            min={0}
            step={1}
            value={value.peopleAffected == null ? '' : String(value.peopleAffected)}
            onChange={(e) => set('peopleAffected', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </FormField>
        <FormField label="Has the information / device been recovered or secured?" required error={errors.recoveredOrSecured}>
          <YesNoField
            name="cd-db-recovered"
            value={value.recoveredOrSecured as boolean | undefined}
            onChange={(v) => set('recoveredOrSecured', v)}
          />
        </FormField>
      </div>
    )
  }

  return null
}

function MedicationFields({
  value,
  set,
  patch,
  errors,
  serviceUserId,
}: {
  value: CategoryDetails
  set: (key: string, v: unknown) => void
  patch: (p: CategoryDetails) => void
  errors: Record<string, string>
  serviceUserId?: string
}) {
  const medsQuery = useServiceUserMedications(serviceUserId ?? '')
  const meds = serviceUserId ? (medsQuery.data?.rows ?? []) : []
  const [freeText, setFreeText] = React.useState(!value.medicationId && Boolean(value.medicationName))
  const choice = value.medicationId ? String(value.medicationId) : freeText ? OTHER_MEDICATION : ''

  function pick(id: string) {
    if (id === OTHER_MEDICATION) {
      setFreeText(true)
      patch({ medicationId: undefined, medicationName: undefined })
      return
    }
    setFreeText(false)
    const med = meds.find((m) => m.id === id)
    // One update so the id, name and dose pre-fill land together.
    patch({
      medicationId: id || undefined,
      medicationName: med?.medicationName,
      scheduledDose:
        value.scheduledDose || (med ? [med.dose, med.strength].filter(Boolean).join(' · ') || undefined : undefined),
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Medication" htmlFor="cd-med" required error={errors.medicationName} className="sm:col-span-2">
        {meds.length > 0 ? (
          <div className="space-y-2">
            <select id="cd-med" className={selectClass} value={choice} onChange={(e) => pick(e.target.value)}>
              <option value="">Select from the service user’s medication…</option>
              {meds.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.medicationName}
                  {m.strength ? ` (${m.strength})` : ''}
                </option>
              ))}
              <option value={OTHER_MEDICATION}>Not on the list — enter it</option>
            </select>
            {freeText && (
              <Input
                aria-label="Medication name"
                value={String(value.medicationName ?? '')}
                onChange={(e) => set('medicationName', e.target.value)}
                placeholder="Medication name"
              />
            )}
          </div>
        ) : (
          <Input
            id="cd-med"
            value={String(value.medicationName ?? '')}
            onChange={(e) => set('medicationName', e.target.value)}
            placeholder={serviceUserId ? 'No medication on record — enter the name' : 'Medication name'}
          />
        )}
      </FormField>
      <FormField label="Scheduled dose" htmlFor="cd-sched-dose">
        <Input
          id="cd-sched-dose"
          value={String(value.scheduledDose ?? '')}
          onChange={(e) => set('scheduledDose', e.target.value)}
          placeholder="e.g. 1 tablet 500 mg"
        />
      </FormField>
      <FormField label="Scheduled time" htmlFor="cd-sched-time" error={errors.scheduledTime}>
        <Input
          id="cd-sched-time"
          type="time"
          value={String(value.scheduledTime ?? '')}
          onChange={(e) => set('scheduledTime', e.target.value || undefined)}
        />
      </FormField>
      <FormField label="Actual dose (if given)" htmlFor="cd-actual-dose">
        <Input
          id="cd-actual-dose"
          value={String(value.actualDose ?? '')}
          onChange={(e) => set('actualDose', e.target.value)}
          placeholder="e.g. 2 tablets"
        />
      </FormField>
      <FormField label="MAR entry affected?" required error={errors.marEntryAffected}>
        <YesNoField
          name="cd-mar"
          value={value.marEntryAffected as boolean | undefined}
          onChange={(v) => set('marEntryAffected', v)}
        />
      </FormField>
    </div>
  )
}

function SafeguardingFields({
  value,
  set,
  errors,
}: {
  value: CategoryDetails
  set: (key: string, v: unknown) => void
  errors: Record<string, string>
}) {
  const ap = (value.allegedPerson ?? {}) as AllegedPerson
  const update = (patch: Partial<AllegedPerson>) => set('allegedPerson', { ...ap, ...patch })
  const [search, setSearch] = React.useState('')
  const staffQuery = useEmployees({ limit: 50, search: search || undefined }, ap.kind === 'STAFF')
  const [pickedName, setPickedName] = React.useState('')
  const staffOptions: ComboboxOption[] = React.useMemo(() => {
    const options = (staffQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    if (ap.employeeId && pickedName && !options.some((o) => o.value === ap.employeeId)) {
      options.unshift({ value: ap.employeeId, label: pickedName, description: undefined })
    }
    return options
  }, [staffQuery.data, ap.employeeId, pickedName])

  return (
    <div className="space-y-3">
      <FormField label="Alleged person causing harm" required error={errors.allegedPerson}>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {ALLEGED_PERSON_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/40',
                ap.kind === o.value ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <input
                type="radio"
                name="cd-alleged"
                checked={ap.kind === o.value}
                onChange={() => set('allegedPerson', { kind: o.value })}
                className="h-4 w-4"
              />
              {o.label}
            </label>
          ))}
        </div>
      </FormField>
      {ap.kind === 'STAFF' && (
        <div className="space-y-2 sm:max-w-md">
          <Combobox
            options={staffOptions}
            value={ap.employeeId ?? ''}
            onChange={(id) => {
              setPickedName(staffOptions.find((o) => o.value === id)?.label ?? '')
              update({ employeeId: id || undefined })
            }}
            onSearchChange={setSearch}
            loading={staffQuery.isLoading}
            placeholder="Search staff…"
            searchPlaceholder="Search staff…"
          />
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Because a staff member is named, this incident will be restricted to managers with confidential access.
          </p>
        </div>
      )}
      {ap.kind === 'OTHER_PERSON' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            aria-label="Alleged person name"
            value={ap.name ?? ''}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Full name"
          />
          <Input
            aria-label="Relationship"
            value={ap.relationship ?? ''}
            onChange={(e) => update({ relationship: e.target.value })}
            placeholder="Relationship (e.g. son, neighbour)"
          />
        </div>
      )}
    </div>
  )
}
