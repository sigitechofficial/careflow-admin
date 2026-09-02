import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
import { extractApiErrorMessage, toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import type { LookupRow, EmployeeListRow } from '@/features/employees/types'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import type {
  ServiceUserDetail,
  ServiceUserDetailReference,
  ServiceUserLookupsBundle,
  ServiceUserReferenceItemPayload,
  UpdateServiceUserPayload,
} from '@/features/service-users/types'
import { useUpdateServiceUser, usePatchServiceUserDomCare } from '@/features/service-users/hooks/useServiceUserMutations'
import { useServiceUserDomCare } from '@/features/service-users/hooks/useServiceUserTabs'
import {
  carerPreferencesFromDomCare,
  emptyCarerPreferences,
  ServiceUserCarerPreferencesSection,
  toDomCareCarerPayload,
  type ServiceUserCarerPreferencesState,
} from '@/features/service-users/components/ServiceUserCarerPreferencesSection'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { AddressPlacesField } from '@/shared/ui/address-places-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { ServiceUserZoneBranchSelect } from '@/features/service-users/components/ServiceUserZoneBranchSelect'
import { cn } from '@/shared/lib/utils'
import {
  profileLookupSelectRows,
  resolveStoredLookupCode,
} from '@/features/service-users/utils/service-user-profile-lookup-rows'

/** Stored in `ServiceUserReference` for fields not on core `ServiceUser` model. */
const PROFILE_REF = {
  suffix: 'SU_PROFILE_SUFFIX',
  maidenName: 'SU_PROFILE_MAIDEN_NAME',
  placeOfBirth: 'SU_PROFILE_PLACE_OF_BIRTH',
  religion: 'SU_PROFILE_RELIGION',
  ethnicity: 'SU_PROFILE_ETHNICITY',
  sexualOrientation: 'SU_PROFILE_SEXUAL_ORIENTATION',
  disability: 'SU_PROFILE_DISABILITY',
  maternity: 'SU_PROFILE_MATERNITY',
  language: 'SU_PROFILE_LANGUAGE',
  preferredContactMethod: 'SU_PROFILE_PREF_CONTACT',
  emailType: 'SU_PROFILE_EMAIL_TYPE',
  otherContactMethod: 'SU_PROFILE_OTHER_CONTACT',
  dateOfDeath: 'SU_PROFILE_DATE_OF_DEATH',
} as const

const PROFILE_REF_TYPES = new Set<string>(Object.values(PROFILE_REF))

/** Short help shown next to each field (hover or focus the info icon). */
const FIELD_HELP = {
  nhsNumber:
    'The person’s NHS number (10 digits in England and Wales). Used to match hospital and GP records; enter only with consent and in line with your data policy.',
  status: 'Where this person is in your service lifecycle (for example active, on hold, or discharged). Drives reporting and access in many workflows.',
  firstName: 'Legal or primary given name as it should appear on formal records and correspondence.',
  middleName: 'Additional given names if used on ID or NHS records; leave blank if not applicable.',
  lastName: 'Family name or surname as used on formal records.',
  title: 'Courtesy title from your organisation’s list (for example Mr, Ms, Dr).',
  suffix: 'Suffix after the name if used (for example Jr, III, Esq).',
  maidenName: 'Previous family name, if relevant for identity checks or historical records.',
  preferredName: 'The name the person prefers day to day if it differs from their first name.',
  dateOfBirth: 'Used for age-appropriate care, safeguarding, and legal checks. Stored as a calendar date.',
  maritalStatus: 'Marital or civil partnership status from your lookup list, where you collect it.',
  placeOfBirth: 'Town, city, or country of birth if recorded for demographic or identity purposes.',
  gender: 'Gender or sex recorded for this person, from your configured list. Align collection with your privacy and equality policies.',
  religion: 'Religion or belief only if the person chooses to provide it; used sensitively for pastoral or dietary needs where relevant.',
  ethnicity:
    'Choose the option that best matches how the person identifies. Options are managed in Settings → Lookup data → Ethnicities.',
  preferredContactMethod: 'How this person prefers to be contacted first (for example phone, email, post).',
  addressLine1: 'Primary street address or building line for visits and post.',
  addressLine2: 'Second address line (flat, unit, or building detail) if needed.',
  town: 'Town or city for the service address.',
  county: 'County, region, or state if used in your address format.',
  country: 'Country for the service address.',
  postcode: 'Main postcode from the assigned service area (monitoring).',
  secondaryPostcode: 'Secondary postcode from the home / searched street address.',
  latitude: 'Optional latitude in decimal degrees for mapping or integrations; leave blank if unknown.',
  longitude: 'Optional longitude in decimal degrees for mapping or integrations; leave blank if unknown.',
  keySafeNumber:
    'Key safe code or location reference only where there is consent and a secure process. Restrict visibility to staff who need it for safe access.',
  accessInstructions: 'Practical instructions for staff to enter safely (codes, dogs, hazards). Avoid unnecessary personal detail.',
  phone: 'Main landline or fixed contact number, if used.',
  mobile: 'Mobile number for calls or SMS where your service uses them.',
  email: 'Email address for notifications and written contact.',
  emailType: 'Classifies the email (for example personal, work, shared) if your organisation tracks it.',
  otherContactMethod: 'Any other agreed channel (for example WhatsApp, relay service, or “via family member”).',
  serviceUserNumber: 'Your organisation’s own reference or case number for this person.',
  location: 'Zone and branch (e.g. Croydon) for rosters, location tree, and bulk scheduling.',
  serviceStartDate: 'Date the person became eligible for or started receiving this service.',
  serviceEndDate: 'Last day of service if known; leave blank while still active.',
  dateOfDeath: 'If applicable, date of death for record closure and statutory reporting. Only record when verified.',
  keyWorker: 'Search for the employee who coordinates this person’s care. Type at least two characters of their name.',
  namedNurse: 'Search for the named nurse where your care model uses one. Type at least two characters of their name.',
  fundingType: 'Source or route of funding (for example local authority, NHS CHC, self-funder).',
  careType:
    'Category or package of care from your lookups (for example residential, domiciliary). Manage options under Settings → Lookup data → Care types.',
  riskLevel: 'Assessed risk band from your list; used to align reviews and escalation.',
  nationalInsuranceNumber: 'UK National Insurance number if held for payroll, benefits, or statutory purposes.',
  asNumber: 'Adult social care or local-system identifier if your integration uses an “AS” reference.',
  residentId: 'Internal resident or care-home system ID if different from this record’s primary key.',
  residentGuid: 'Globally unique identifier from another system if you synchronise with it.',
  sexualOrientation: 'Optional. Collect only with consent; used for equality monitoring and person-centred care where relevant.',
  disability: 'Disability or long-term condition information used to plan reasonable adjustments under equality law; record accurately and minimally.',
  maternity: 'Pregnancy or maternity-related flag only where your service legitimately needs it for care planning.',
  language:
    'Preferred spoken or written language for communication and accessible information. Options are managed in Settings → Lookup data → Languages.',
} as const

function extValue(refs: ServiceUserDetailReference[], type: string): string {
  return refs.find((r) => r.referenceType === type)?.referenceValue ?? ''
}

function toInputDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function decStr(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v)
}

function employeeLabel(e: { firstName: string | null; lastName: string | null; id: string } | null): string {
  if (!e) return ''
  const n = [e.firstName, e.lastName].filter(Boolean).join(' ').trim()
  return n || e.id
}

function buildReferencesPayload(
  existing: ServiceUserDetailReference[],
  profile: Record<string, string>,
): ServiceUserReferenceItemPayload[] {
  const kept = existing.filter((r) => !PROFILE_REF_TYPES.has(r.referenceType))
  const base: ServiceUserReferenceItemPayload[] = kept.map((r) => ({
    id: r.id,
    referenceType: r.referenceType,
    referenceValue: r.referenceValue,
    notes: r.notes ?? undefined,
  }))
  for (const type of Object.values(PROFILE_REF)) {
    const v = (profile[type] ?? '').trim()
    const prev = existing.find((r) => r.referenceType === type)
    if (!v) continue
    if (prev) base.push({ id: prev.id, referenceType: type, referenceValue: v })
    else base.push({ referenceType: type, referenceValue: v })
  }
  return base
}

type FormState = {
  nhsNumber: string
  statusId: string
  firstName: string
  middleName: string
  lastName: string
  titleId: string
  genderId: string
  maritalStatusId: string
  suffix: string
  maidenName: string
  preferredName: string
  dateOfBirth: string
  placeOfBirth: string
  religion: string
  ethnicity: string
  sexualOrientation: string
  disability: string
  maternity: string
  language: string
  preferredContactMethod: string
  emailType: string
  otherContactMethod: string
  email: string
  phone: string
  mobile: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  country: string
  postcode: string
  secondaryPostcode: string
  latitude: string
  longitude: string
  accessInstructions: string
  keySafeNumber: string
  serviceUserNumber: string
  locationId: string
  serviceUserAreaId: string
  serviceStartDate: string
  serviceEndDate: string
  dateOfDeath: string
  keyWorkerId: string
  namedNurseId: string
  fundingTypeId: string
  careTypeId: string
  riskLevelId: string
  nationalInsuranceNumber: string
  asNumber: string
  residentId: string
  residentGuid: string
}

function detailToForm(d: ServiceUserDetail, lookups?: ServiceUserLookupsBundle): FormState {
  const r = d.references
  return {
    nhsNumber: d.nhsNumber ?? '',
    statusId: d.status?.id ?? '',
    firstName: d.firstName,
    middleName: d.middleName ?? '',
    lastName: d.lastName,
    titleId: d.title?.id ?? '',
    genderId: d.gender?.id ?? '',
    maritalStatusId: d.maritalStatus?.id ?? '',
    suffix: extValue(r, PROFILE_REF.suffix),
    maidenName: extValue(r, PROFILE_REF.maidenName),
    preferredName: d.preferredName ?? '',
    dateOfBirth: toInputDate(d.dateOfBirth),
    placeOfBirth: extValue(r, PROFILE_REF.placeOfBirth),
    religion: extValue(r, PROFILE_REF.religion),
    ethnicity: lookups
      ? resolveStoredLookupCode(extValue(r, PROFILE_REF.ethnicity), lookups.ethnicities)
      : extValue(r, PROFILE_REF.ethnicity),
    sexualOrientation: extValue(r, PROFILE_REF.sexualOrientation),
    disability: extValue(r, PROFILE_REF.disability),
    maternity: extValue(r, PROFILE_REF.maternity),
    language: lookups
      ? resolveStoredLookupCode(extValue(r, PROFILE_REF.language), lookups.languages)
      : extValue(r, PROFILE_REF.language),
    preferredContactMethod: extValue(r, PROFILE_REF.preferredContactMethod),
    emailType: extValue(r, PROFILE_REF.emailType),
    otherContactMethod: extValue(r, PROFILE_REF.otherContactMethod),
    email: d.email ?? '',
    phone: d.phone ?? '',
    mobile: d.mobile ?? '',
    addressLine1: d.address?.addressLine1 ?? '',
    addressLine2: d.address?.addressLine2 ?? '',
    town: d.address?.town ?? '',
    county: d.address?.county ?? '',
    country: d.address?.country ?? '',
    postcode: d.address?.postcode ?? '',
    secondaryPostcode: d.address?.secondaryPostcode ?? '',
    latitude: decStr(d.address?.latitude),
    longitude: decStr(d.address?.longitude),
    accessInstructions: d.address?.accessInstructions ?? '',
    keySafeNumber: d.address?.keySafeNumber ?? '',
    serviceUserNumber: d.serviceUserNumber ?? '',
    locationId: d.location?.id ?? '',
    serviceUserAreaId: d.serviceUserAreaId ?? d.serviceUserArea?.id ?? '',
    serviceStartDate: toInputDate(d.serviceStartDate),
    serviceEndDate: toInputDate(d.serviceEndDate),
    dateOfDeath: extValue(r, PROFILE_REF.dateOfDeath),
    keyWorkerId: d.keyWorker?.id ?? '',
    namedNurseId: d.namedNurse?.id ?? '',
    fundingTypeId: d.fundingType?.id ?? '',
    careTypeId: d.careType?.id ?? '',
    riskLevelId: d.riskLevel?.id ?? '',
    nationalInsuranceNumber: d.nationalInsuranceNumber ?? '',
    asNumber: extValue(r, 'AS_NUMBER'),
    residentId: d.residentId ?? '',
    residentGuid: d.residentGuid ?? '',
  }
}

function LabelWithTooltip({
  label,
  required,
  tooltip,
}: {
  label: string
  required?: boolean
  tooltip: string
}) {
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <span>
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-sky-600 outline-none ring-offset-background hover:text-sky-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Help: ${label}`}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function FieldEditable({
  label,
  tooltip,
  value,
  onChange,
  required,
  type = 'text',
  disabled,
}: {
  label: string
  tooltip: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <LabelWithTooltip label={label} required={required} tooltip={tooltip} />
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border"
        disabled={disabled}
      />
    </div>
  )
}

function LookupSelect({
  label,
  tooltip,
  value,
  onChange,
  rows,
  required,
  placeholder,
  fieldKey,
  emptyHint,
}: {
  label: string
  tooltip: string
  value: string
  onChange: (v: string) => void
  rows: Array<{ id: string; name: string }>
  required?: boolean
  placeholder: string
  fieldKey?: string
  emptyHint?: string
}) {
  return (
    <div className="space-y-1">
      <LabelWithTooltip label={label} required={required} tooltip={tooltip} />
      <Select
        value={value ? value : '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
        disabled={rows.length === 0}
      >
        <SelectTrigger
          className="w-full"
          data-testid={fieldKey ? `service-user-${fieldKey}-select` : undefined}
        >
          <SelectValue placeholder={rows.length === 0 ? 'No options available' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— None —</SelectItem>
          {rows.map((row) => (
            <SelectItem key={row.id} value={row.id}>
              {row.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {rows.length === 0 && emptyHint ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : null}
    </div>
  )
}

export function ServiceUserPersonalDetailsForm({
  detail,
  lookups,
  locations,
  serviceUserId,
  onSaved,
}: {
  detail: ServiceUserDetail
  lookups: ServiceUserLookupsBundle
  locations: LookupRow[]
  serviceUserId: string
  onSaved: (d: ServiceUserDetail) => void
}) {
  const canUpdate = useAuthStore((s) => s.can('service_users.update'))
  const canAddress = useAuthStore((s) => s.can('service_users.address.update'))
  const canDomCare =
    useAuthStore((s) => s.can('service_users.dom_care.update')) || canUpdate
  const updateMutation = useUpdateServiceUser(serviceUserId)
  const domCarePatchMutation = usePatchServiceUserDomCare(serviceUserId)
  const domCareQuery = useServiceUserDomCare(serviceUserId, canDomCare)

  const [carerPreferences, setCarerPreferences] =
    React.useState<ServiceUserCarerPreferencesState>(emptyCarerPreferences)
  const [carerPrefsLoaded, setCarerPrefsLoaded] = React.useState(false)

  const [form, setForm] = React.useState<FormState>(() => detailToForm(detail, lookups))
  const [kwSearch, setKwSearch] = React.useState('')
  const [nnSearch, setNnSearch] = React.useState('')
  const [debouncedKwSearch, setDebouncedKwSearch] = React.useState('')
  const [debouncedNnSearch, setDebouncedNnSearch] = React.useState('')
  const [kwLabel, setKwLabel] = React.useState(() => employeeLabel(detail.keyWorker))
  const [nnLabel, setNnLabel] = React.useState(() => employeeLabel(detail.namedNurse))
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveOk, setSaveOk] = React.useState(false)
  const saving = updateMutation.isPending

  const kwEmployeesQuery = useEmployees(
    { search: debouncedKwSearch.trim(), limit: 15 },
    debouncedKwSearch.trim().length >= 2,
  )
  const nnEmployeesQuery = useEmployees(
    { search: debouncedNnSearch.trim(), limit: 15 },
    debouncedNnSearch.trim().length >= 2,
  )
  const kwHits = kwEmployeesQuery.data?.rows ?? []
  const nnHits = nnEmployeesQuery.data?.rows ?? []

  React.useEffect(() => {
    setForm(detailToForm(detail, lookups))
    setKwLabel(employeeLabel(detail.keyWorker))
    setNnLabel(employeeLabel(detail.namedNurse))
    setKwSearch('')
    setNnSearch('')
    setDebouncedKwSearch('')
    setDebouncedNnSearch('')
  }, [detail, lookups])

  React.useEffect(() => {
    if (domCareQuery.data && !carerPrefsLoaded) {
      setCarerPreferences(carerPreferencesFromDomCare(domCareQuery.data))
      setCarerPrefsLoaded(true)
    }
  }, [domCareQuery.data, carerPrefsLoaded])

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedKwSearch(kwSearch), 300)
    return () => clearTimeout(t)
  }, [kwSearch])

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedNnSearch(nnSearch), 300)
    return () => clearTimeout(t)
  }, [nnSearch])

  const set =
    (key: keyof FormState) =>
    (v: string): void => {
      setForm((p) => ({ ...p, [key]: v }))
    }

  const age =
    form.dateOfBirth && !Number.isNaN(new Date(form.dateOfBirth + 'T00:00:00Z').getTime())
      ? (() => {
          const d = new Date(form.dateOfBirth + 'T00:00:00Z')
          const today = new Date()
          let a = today.getFullYear() - d.getUTCFullYear()
          const m = today.getMonth() - d.getUTCMonth()
          if (m < 0 || (m === 0 && today.getDate() < d.getUTCDate())) a -= 1
          return a
        })()
      : null

  const ethnicityLookupRows = React.useMemo(
    () => profileLookupSelectRows(lookups.ethnicities, form.ethnicity),
    [lookups.ethnicities, form.ethnicity],
  )
  const languageLookupRows = React.useMemo(
    () => profileLookupSelectRows(lookups.languages, form.language),
    [lookups.languages, form.language],
  )

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canUpdate) return
    setSaveError(null)
    setSaveOk(false)
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSaveError('First name and last name are required.')
      toastError('Cannot save', 'First name and last name are required.')
      return
    }
    if (!form.statusId.trim()) {
      setSaveError('Please select a status.')
      toastError('Cannot save', 'Please select a status.')
      return
    }
    try {
      const profileMap: Record<string, string> = {
        [PROFILE_REF.suffix]: form.suffix,
        [PROFILE_REF.maidenName]: form.maidenName,
        [PROFILE_REF.placeOfBirth]: form.placeOfBirth,
        [PROFILE_REF.religion]: form.religion,
        [PROFILE_REF.ethnicity]: form.ethnicity,
        [PROFILE_REF.sexualOrientation]: form.sexualOrientation,
        [PROFILE_REF.disability]: form.disability,
        [PROFILE_REF.maternity]: form.maternity,
        [PROFILE_REF.language]: form.language,
        [PROFILE_REF.preferredContactMethod]: form.preferredContactMethod,
        [PROFILE_REF.emailType]: form.emailType,
        [PROFILE_REF.otherContactMethod]: form.otherContactMethod,
        [PROFILE_REF.dateOfDeath]: form.dateOfDeath,
      }

      const refs = buildReferencesPayload(detail.references, profileMap)

      const asTrim = form.asNumber.trim()
      const withoutAs = refs.filter((r) => r.referenceType !== 'AS_NUMBER')
      const asPrev = detail.references.find((r) => r.referenceType === 'AS_NUMBER')
      if (asTrim) {
        if (asPrev) withoutAs.push({ id: asPrev.id, referenceType: 'AS_NUMBER', referenceValue: asTrim })
        else withoutAs.push({ referenceType: 'AS_NUMBER', referenceValue: asTrim })
      }

      const payload: UpdateServiceUserPayload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        middleName: form.middleName.trim() || undefined,
        preferredName: form.preferredName.trim() || undefined,
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        nhsNumber: form.nhsNumber.trim() || undefined,
        nationalInsuranceNumber: form.nationalInsuranceNumber.trim() || undefined,
        serviceStartDate: form.serviceStartDate.trim() || undefined,
        serviceEndDate: form.serviceEndDate.trim() || undefined,
        serviceUserNumber: form.serviceUserNumber.trim() || undefined,
        residentId: form.residentId.trim() || undefined,
        residentGuid: form.residentGuid.trim() || undefined,
        titleId: form.titleId || undefined,
        genderId: form.genderId || undefined,
        maritalStatusId: form.maritalStatusId || undefined,
        statusId: form.statusId || undefined,
        careTypeId: form.careTypeId || undefined,
        fundingTypeId: form.fundingTypeId || undefined,
        riskLevelId: form.riskLevelId || undefined,
        locationId: form.locationId || undefined,
        serviceUserAreaId: form.serviceUserAreaId || null,
        keyWorkerId: form.keyWorkerId || undefined,
        namedNurseId: form.namedNurseId || undefined,
        references: withoutAs,
      }

      await updateMutation.mutateAsync({
        body: payload,
        address: canAddress
          ? {
              addressLine1: form.addressLine1.trim() || undefined,
              addressLine2: form.addressLine2.trim() || undefined,
              town: form.town.trim() || undefined,
              county: form.county.trim() || undefined,
              country: form.country.trim() || undefined,
              postcode: form.postcode.trim() || undefined,
              secondaryPostcode: form.secondaryPostcode.trim() || undefined,
              accessInstructions: form.accessInstructions.trim() || undefined,
              keySafeNumber: form.keySafeNumber.trim() || undefined,
              latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
              longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
            }
          : undefined,
      })

      if (canDomCare) {
        await domCarePatchMutation.mutateAsync(toDomCareCarerPayload(carerPreferences))
      }

      onSaved(detail)
      setSaveOk(true)
      toastSuccess('Personal details saved', 'Your changes were applied successfully.')
      window.setTimeout(() => setSaveOk(false), 4000)
    } catch (err) {
      setSaveError(extractApiErrorMessage(err, 'Save failed'))
      toastApiError(err, 'Save failed')
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
    <form className="space-y-8" onSubmit={onSave}>
      {saveError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </div>
      )}
      {saveOk && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          Personal details saved successfully.
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Picture & identifiers</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FieldEditable
            label="NHS Number"
            tooltip={FIELD_HELP.nhsNumber}
            value={form.nhsNumber}
            onChange={set('nhsNumber')}
          />
          <LookupSelect
            label="Status"
            tooltip={FIELD_HELP.status}
            value={form.statusId}
            onChange={set('statusId')}
            rows={lookups.statuses}
            required
            placeholder="Select status"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Personal Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldEditable
            label="First Name"
            tooltip={FIELD_HELP.firstName}
            value={form.firstName}
            onChange={set('firstName')}
            required
          />
          <FieldEditable
            label="Middle Name"
            tooltip={FIELD_HELP.middleName}
            value={form.middleName}
            onChange={set('middleName')}
          />
          <FieldEditable
            label="Last Name"
            tooltip={FIELD_HELP.lastName}
            value={form.lastName}
            onChange={set('lastName')}
            required
          />
          <LookupSelect
            label="Title"
            tooltip={FIELD_HELP.title}
            value={form.titleId}
            onChange={set('titleId')}
            rows={lookups.titles}
            required
            placeholder="Select title"
          />
          <FieldEditable label="Suffix" tooltip={FIELD_HELP.suffix} value={form.suffix} onChange={set('suffix')} />
          <FieldEditable
            label="Maiden Name"
            tooltip={FIELD_HELP.maidenName}
            value={form.maidenName}
            onChange={set('maidenName')}
          />
          <FieldEditable
            label="Preferred Name"
            tooltip={FIELD_HELP.preferredName}
            value={form.preferredName}
            onChange={set('preferredName')}
          />
          <div className="space-y-1 sm:col-span-2">
            <LabelWithTooltip label="Date of Birth" required tooltip={FIELD_HELP.dateOfBirth} />
            <div className="flex flex-wrap items-center gap-3">
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} className="max-w-xs" />
              {age != null && <span className="text-sm text-muted-foreground">{age} years</span>}
            </div>
          </div>
          <LookupSelect
            label="Marital Status"
            tooltip={FIELD_HELP.maritalStatus}
            value={form.maritalStatusId}
            onChange={set('maritalStatusId')}
            rows={lookups.maritalStatuses}
            placeholder="Select marital status"
          />
          <FieldEditable
            label="Place of Birth"
            tooltip={FIELD_HELP.placeOfBirth}
            value={form.placeOfBirth}
            onChange={set('placeOfBirth')}
          />
          <LookupSelect
            label="Gender"
            tooltip={FIELD_HELP.gender}
            value={form.genderId}
            onChange={set('genderId')}
            rows={lookups.genders}
            required
            placeholder="Select gender"
          />
          <FieldEditable label="Religion" tooltip={FIELD_HELP.religion} value={form.religion} onChange={set('religion')} />
          <LookupSelect
            label="Ethnicity"
            tooltip={FIELD_HELP.ethnicity}
            value={form.ethnicity}
            onChange={set('ethnicity')}
            rows={ethnicityLookupRows}
            placeholder="Select ethnicity"
            emptyHint="No ethnicities yet. Add them in Settings → Lookup data → Ethnicities."
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Contact Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldEditable
            label="Preferred Contact Method"
            tooltip={FIELD_HELP.preferredContactMethod}
            value={form.preferredContactMethod}
            onChange={set('preferredContactMethod')}
          />
          <FieldEditable label="Phone Number" tooltip={FIELD_HELP.phone} value={form.phone} onChange={set('phone')} />
          <FieldEditable label="Mobile" tooltip={FIELD_HELP.mobile} value={form.mobile} onChange={set('mobile')} />
          <FieldEditable label="Email" tooltip={FIELD_HELP.email} value={form.email} onChange={set('email')} type="email" />
          <FieldEditable label="Email type" tooltip={FIELD_HELP.emailType} value={form.emailType} onChange={set('emailType')} />
          <FieldEditable
            label="Other Contact Method"
            tooltip={FIELD_HELP.otherContactMethod}
            value={form.otherContactMethod}
            onChange={set('otherContactMethod')}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">
          Service location
        </h2>
        <div className="space-y-1.5">
          <LabelWithTooltip label="Zone, branch & area" required tooltip={FIELD_HELP.location} />
          <ServiceUserZoneBranchSelect
            value={form.locationId}
            areaId={form.serviceUserAreaId}
            mainPostcode={form.postcode}
            onChange={({ locationId, serviceUserAreaId }) =>
              setForm(prev => ({ ...prev, locationId, serviceUserAreaId }))
            }
            onApplyMainPostcode={postcode => setForm(prev => ({ ...prev, postcode }))}
            required
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">
          Address (optional — includes map coordinates)
        </h2>
        <AddressPlacesField
          postcodeLabel="Secondary postcode"
          value={{
            addressLine1: form.addressLine1,
            addressLine2: form.addressLine2,
            town: form.town,
            county: form.county,
            country: form.country,
            postcode: form.secondaryPostcode,
            latitude: form.latitude,
            longitude: form.longitude,
          }}
          onChange={(patch) =>
            setForm((prev) => {
              const { postcode, ...rest } = patch
              return {
                ...prev,
                ...rest,
                ...(postcode !== undefined ? { secondaryPostcode: postcode } : {}),
              }
            })
          }
          disabled={!canAddress}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldEditable
              label="Key safe number"
              tooltip={FIELD_HELP.keySafeNumber}
              value={form.keySafeNumber}
              onChange={set('keySafeNumber')}
              disabled={!canAddress}
            />
            <div className="md:col-span-2">
              <div className="space-y-1">
                <LabelWithTooltip label="Access instructions" tooltip={FIELD_HELP.accessInstructions} />
                <textarea
                  rows={2}
                  className={cn(
                    'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
                    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    !canAddress && 'cursor-not-allowed opacity-60',
                  )}
                  value={form.accessInstructions}
                  onChange={(e) => set('accessInstructions')(e.target.value)}
                  disabled={!canAddress}
                />
              </div>
            </div>
          </div>
        </AddressPlacesField>
        {!canAddress && (
          <p className="mt-3 text-xs text-muted-foreground">
            Address fields require the service_users.address.update permission to save.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Reference Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldEditable
            label="Service User Number"
            tooltip={FIELD_HELP.serviceUserNumber}
            value={form.serviceUserNumber}
            onChange={set('serviceUserNumber')}
          />
          <FieldEditable
            label="Service Start Date"
            tooltip={FIELD_HELP.serviceStartDate}
            value={form.serviceStartDate}
            onChange={set('serviceStartDate')}
            type="date"
            required
          />
          <FieldEditable
            label="Service End Date"
            tooltip={FIELD_HELP.serviceEndDate}
            value={form.serviceEndDate}
            onChange={set('serviceEndDate')}
            type="date"
          />
          <FieldEditable
            label="Date of Death"
            tooltip={FIELD_HELP.dateOfDeath}
            value={form.dateOfDeath}
            onChange={set('dateOfDeath')}
            type="date"
          />
          <div className="sm:col-span-2 space-y-2">
            <LabelWithTooltip label="Key Worker (search employees)" tooltip={FIELD_HELP.keyWorker} />
            <Input
              placeholder="Type 2+ characters to search…"
              value={kwSearch}
              onChange={(e) => {
                setKwSearch(e.target.value)
                if (!e.target.value.trim()) {
                  setForm((p) => ({ ...p, keyWorkerId: '' }))
                  setKwLabel('')
                }
              }}
            />
            {form.keyWorkerId && (
              <p className="text-xs text-muted-foreground">
                Selected: {kwLabel || form.keyWorkerId}{' '}
                <button type="button" className="text-primary underline" onClick={() => { setForm((p) => ({ ...p, keyWorkerId: '' })); setKwLabel(''); setKwSearch('') }}>
                  Clear
                </button>
              </p>
            )}
            {kwHits.length > 0 && !form.keyWorkerId && (
              <ul className="max-h-36 overflow-auto rounded border bg-popover text-sm">
                {kwHits.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setForm((p) => ({ ...p, keyWorkerId: r.id }))
                        setKwLabel(r.fullName ?? ([r.firstName, r.lastName].filter(Boolean).join(' ') || r.id))
                        setKwSearch('')
                      }}
                    >
                      {r.fullName ?? ([r.firstName, r.lastName].filter(Boolean).join(' ') || r.id)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="sm:col-span-2 space-y-2">
            <LabelWithTooltip label="Named Nurse (search employees)" tooltip={FIELD_HELP.namedNurse} />
            <Input
              placeholder="Type 2+ characters to search…"
              value={nnSearch}
              onChange={(e) => {
                setNnSearch(e.target.value)
                if (!e.target.value.trim()) {
                  setForm((p) => ({ ...p, namedNurseId: '' }))
                  setNnLabel('')
                }
              }}
            />
            {form.namedNurseId && (
              <p className="text-xs text-muted-foreground">
                Selected: {nnLabel || form.namedNurseId}{' '}
                <button type="button" className="text-primary underline" onClick={() => { setForm((p) => ({ ...p, namedNurseId: '' })); setNnLabel(''); setNnSearch('') }}>
                  Clear
                </button>
              </p>
            )}
            {nnHits.length > 0 && !form.namedNurseId && (
              <ul className="max-h-36 overflow-auto rounded border bg-popover text-sm">
                {nnHits.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setForm((p) => ({ ...p, namedNurseId: r.id }))
                        setNnLabel(r.fullName ?? ([r.firstName, r.lastName].filter(Boolean).join(' ') || r.id))
                        setNnSearch('')
                      }}
                    >
                      {r.fullName ?? ([r.firstName, r.lastName].filter(Boolean).join(' ') || r.id)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <LookupSelect
            label="Funding Route"
            tooltip={FIELD_HELP.fundingType}
            value={form.fundingTypeId}
            onChange={set('fundingTypeId')}
            rows={lookups.fundingTypes}
            placeholder="Select funding"
          />
          <LookupSelect
            label="Category of Care"
            tooltip={FIELD_HELP.careType}
            value={form.careTypeId}
            onChange={set('careTypeId')}
            rows={lookups.careTypes}
            placeholder="Select care type"
            fieldKey="careTypeId"
            emptyHint="No care types yet. Add them in Settings → Lookup data → Care types."
          />
          <LookupSelect
            label="Risk level"
            tooltip={FIELD_HELP.riskLevel}
            value={form.riskLevelId}
            onChange={set('riskLevelId')}
            rows={lookups.riskLevels}
            placeholder="Select risk level"
          />
          <FieldEditable
            label="NI Number"
            tooltip={FIELD_HELP.nationalInsuranceNumber}
            value={form.nationalInsuranceNumber}
            onChange={set('nationalInsuranceNumber')}
          />
          <FieldEditable label="AS Number" tooltip={FIELD_HELP.asNumber} value={form.asNumber} onChange={set('asNumber')} />
          <FieldEditable label="Resident ID" tooltip={FIELD_HELP.residentId} value={form.residentId} onChange={set('residentId')} />
          <FieldEditable
            label="Resident GUID"
            tooltip={FIELD_HELP.residentGuid}
            value={form.residentGuid}
            onChange={set('residentGuid')}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Additional demographics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldEditable
            label="Sexual Orientation"
            tooltip={FIELD_HELP.sexualOrientation}
            value={form.sexualOrientation}
            onChange={set('sexualOrientation')}
          />
          <FieldEditable label="Disability" tooltip={FIELD_HELP.disability} value={form.disability} onChange={set('disability')} />
          <FieldEditable label="Pregnant/Maternity" tooltip={FIELD_HELP.maternity} value={form.maternity} onChange={set('maternity')} />
          <LookupSelect
            label="Language"
            tooltip={FIELD_HELP.language}
            value={form.language}
            onChange={set('language')}
            rows={languageLookupRows}
            placeholder="Select language"
            emptyHint="No languages yet. Add them in Settings → Lookup data → Languages."
          />
        </div>
      </section>

      {canDomCare ? (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <ServiceUserCarerPreferencesSection
            value={carerPreferences}
            onChange={setCarerPreferences}
            disabled={!canUpdate}
          />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {!canUpdate && (
          <p className="mr-auto text-xs text-muted-foreground">You need service_users.update to save changes.</p>
        )}
        <Button type="submit" disabled={!canUpdate || saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save personal details'
          )}
        </Button>
      </div>
    </form>
    </TooltipProvider>
  )
}
