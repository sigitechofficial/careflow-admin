import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Info, Loader2, Upload } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AddressPlacesField,
  type AddressPlacesValue,
} from '@/shared/ui/address-places-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { ApiError } from '@/shared/api/api-client'
import { parseApiFieldErrors } from '@/shared/api/api-error-format'
import { extractApiErrorMessage, toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { type EmployeeListRow } from '@/features/employees/types'
import {
  type CreateServiceUserPayload,
  type ServiceUserLookupsBundle,
} from '@/features/service-users/types'
import { useEmployeeLookups, useEmployees } from '@/features/employees/hooks/useEmployees'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useCreateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import {
  patchServiceUserDomCare,
  uploadServiceUserPhoto,
} from '@/features/service-users/api/service-users.api'
import { upsertServiceUserPortalAccount } from '@/features/service-user-portal/api/portal.api'
import { ServiceUserZoneBranchSelect } from '@/features/service-users/components/ServiceUserZoneBranchSelect'
import {
  emptyCarerPreferences,
  ServiceUserCarerPreferencesSection,
  toDomCareCarerPayload,
  type ServiceUserCarerPreferencesState,
} from '@/features/service-users/components/ServiceUserCarerPreferencesSection'
import {
  profileLookupSelectRows,
} from '@/features/service-users/utils/service-user-profile-lookup-rows'
import {
  buildSuProfileReferences,
  SU_PROFILE_REF,
} from '@/features/service-users/utils/service-user-profile-refs'
import { HomeAccessFields } from '@/features/service-users/components/HomeAccessFields'

type FormState = {
  firstName: string
  middleName: string
  lastName: string
  preferredName: string
  suffix: string
  maidenName: string
  nhsNumber: string
  nhsNumberStatus: string
  nationalInsuranceNumber: string
  email: string
  emailType: string
  emailPreference: boolean
  phone: string
  phoneType: string
  phonePreference: boolean
  mobile: string
  preferredContactMethod: string
  otherContactMethod: string
  dateOfBirth: string
  placeOfBirth: string
  religion: string
  ethnicity: string
  sex: string
  sexualOrientation: string
  maternity: string
  disability: string
  language: string
  serviceStartDate: string
  serviceEndDate: string
  dateOfDeath: string
  serviceUserNumber: string
  notes: string
  statusId: string
  titleId: string
  genderId: string
  maritalStatusId: string
  careTypeId: string
  fundingTypeId: string
  riskLevelId: string
  locationId: string
  serviceUserAreaId: string
  keyWorkerId: string
  namedNurseId: string
  changePreference: string
  orderNumber: string
  asNumber: string
  scanType: string
  scanCode: string
  caseNumber: string
  sprocNumber: string
  lasNumber: string
  nhsReferences: string
  residentId: string
  residentGuid: string
  accessServiceUserApp: boolean
  keySafeNumber: string
  accessInstructions: string
  accessMethod: string
  keySafeLocation: string
  postcode: string
  secondaryPostcode: string
} & Omit<AddressPlacesValue, 'postcode'>

const emptyForm: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',
  suffix: '',
  maidenName: '',
  nhsNumber: '',
  nhsNumberStatus: '',
  nationalInsuranceNumber: '',
  email: '',
  emailType: '',
  emailPreference: false,
  phone: '',
  phoneType: '',
  phonePreference: false,
  mobile: '',
  preferredContactMethod: '',
  otherContactMethod: '',
  dateOfBirth: '',
  placeOfBirth: '',
  religion: '',
  ethnicity: '',
  sex: '',
  sexualOrientation: '',
  maternity: 'No',
  disability: '',
  language: '',
  serviceStartDate: '',
  serviceEndDate: '',
  dateOfDeath: '',
  serviceUserNumber: '',
  notes: '',
  statusId: '',
  titleId: '',
  genderId: '',
  maritalStatusId: '',
  careTypeId: '',
  fundingTypeId: '',
  riskLevelId: '',
  locationId: '',
  serviceUserAreaId: '',
  keyWorkerId: '',
  namedNurseId: '',
  changePreference: '',
  orderNumber: '',
  asNumber: '',
  scanType: 'None',
  scanCode: '',
  caseNumber: '',
  sprocNumber: '',
  lasNumber: '',
  nhsReferences: '',
  residentId: '',
  residentGuid: '',
  accessServiceUserApp: false,
  keySafeNumber: '',
  accessInstructions: '',
  accessMethod: '',
  keySafeLocation: '',
  postcode: '',
  secondaryPostcode: '',
  addressLine1: '',
  addressLine2: '',
  town: '',
  county: '',
  country: '',
  latitude: '',
  longitude: '',
}

const NHS_STATUS_OPTIONS = ['Verified', 'Not verified', 'Tracing', 'Unknown']
const PREF_CONTACT_OPTIONS = ['Mobile', 'Phone', 'Email', 'Post', 'Other']
const PHONE_TYPE_OPTIONS = ['Mobile', 'Home', 'Work', 'Other']
const EMAIL_TYPE_OPTIONS = ['Personal', 'Work', 'Shared', 'Other']
const SEX_OPTIONS = ['Male', 'Female', 'Intersex', 'Not stated', 'Unknown']
const SCAN_TYPE_OPTIONS = ['None', 'QR', 'Barcode', 'NFC', 'Other']
const YES_NO_OPTIONS = ['No', 'Yes', 'Not applicable', 'Prefer not to say']

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
      {children}
    </div>
  )
}

function SHead({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-sm font-semibold text-primary">{children}</h2>
}

function LabelWithTip({
  children,
  required,
  tip,
}: {
  children: React.ReactNode
  required?: boolean
  tip?: string
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-muted-foreground">
      <span>
        {children}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {tip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-primary" aria-label="Help">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-left">{tip}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

function employeeDisplayName(r: EmployeeListRow): string {
  return (r.fullName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()) || r.id
}

// Must stay at module scope: defined inside the page it remounts on every render and the input loses focus after each keystroke.
function EmployeeSearch({
  label,
  search,
  setSearch,
  selectedId,
  selectedLabel,
  hits,
  onPick,
  onClear,
}: {
  label: string
  search: string
  setSearch: (v: string) => void
  selectedId: string
  selectedLabel: string
  hits: EmployeeListRow[]
  onPick: (r: EmployeeListRow) => void
  /** Drops the selected employee; the search text is left to the caller. */
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <LabelWithTip tip={`Search employees for ${label}`}>{label}</LabelWithTip>
      <Input
        placeholder="Employee name…"
        value={search}
        onChange={(e) => {
          const next = e.target.value
          setSearch(next)
          // Editing the picked name means the user is searching again.
          if (selectedId && next !== selectedLabel) onClear()
        }}
      />
      {selectedId ? (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedLabel || selectedId}{' '}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => {
              onClear()
              setSearch('')
            }}
          >
            Clear
          </button>
        </p>
      ) : null}
      {hits.length > 0 && !selectedId ? (
        <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm">
          {hits.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => onPick(r)}
              >
                {employeeDisplayName(r)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

type FieldErrors = Partial<Record<keyof FormState, string>>

/** Fields marked * on the form, in on-screen order (drives inline errors and the summary). */
const REQUIRED_FIELD_LABELS = {
  statusId: 'Status',
  firstName: 'First name',
  lastName: 'Last name',
  titleId: 'Title',
  dateOfBirth: 'Date of birth',
  genderId: 'Gender',
  locationId: 'Location',
} as const satisfies Partial<Record<keyof FormState, string>>

function requiredFieldErrors(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  for (const [key, label] of Object.entries(REQUIRED_FIELD_LABELS)) {
    if (!String(form[key as keyof FormState] ?? '').trim()) {
      errors[key as keyof FormState] = `${label} is required`
    }
  }
  return errors
}

function pickFormFieldErrors(parsed: Record<string, string>): FieldErrors {
  const next: FieldErrors = {}
  for (const [key, message] of Object.entries(parsed)) {
    if (key in emptyForm) next[key as keyof FormState] = message
  }
  return next
}

function ageFromDob(dob: string): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  return age >= 0 ? age : null
}

function buildPayload(f: FormState): CreateServiceUserPayload {
  const p: CreateServiceUserPayload = {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
  }
  const opt = (s: string) => {
    const t = s.trim()
    return t === '' ? undefined : t
  }
  const optId = (s: string) => (s.trim() === '' ? undefined : s.trim())
  p.middleName = opt(f.middleName)
  p.preferredName = opt(f.preferredName)
  p.nhsNumber = opt(f.nhsNumber)
  p.nationalInsuranceNumber = opt(f.nationalInsuranceNumber)
  p.email = opt(f.email)
  p.phone = opt(f.phone)
  p.mobile = opt(f.mobile)
  // Date inputs are YYYY-MM-DD; omit blanks — empty string fails Nest @IsDateString.
  const dateOfBirth = opt(f.dateOfBirth)
  if (dateOfBirth) p.dateOfBirth = dateOfBirth
  const serviceStartDate = opt(f.serviceStartDate)
  if (serviceStartDate) p.serviceStartDate = serviceStartDate
  const serviceEndDate = opt(f.serviceEndDate)
  if (serviceEndDate) p.serviceEndDate = serviceEndDate
  p.serviceUserNumber = opt(f.serviceUserNumber)
  p.notes = opt(f.notes)
  p.titleId = optId(f.titleId)
  p.genderId = optId(f.genderId)
  p.maritalStatusId = optId(f.maritalStatusId)
  p.statusId = optId(f.statusId)
  p.careTypeId = optId(f.careTypeId)
  p.fundingTypeId = optId(f.fundingTypeId)
  p.riskLevelId = optId(f.riskLevelId)
  p.locationId = optId(f.locationId)
  p.serviceUserAreaId = optId(f.serviceUserAreaId)
  p.keyWorkerId = optId(f.keyWorkerId)
  p.namedNurseId = optId(f.namedNurseId)
  p.residentId = opt(f.residentId)
  p.residentGuid = opt(f.residentGuid)

  const references = buildSuProfileReferences({
    [SU_PROFILE_REF.suffix]: f.suffix,
    [SU_PROFILE_REF.maidenName]: f.maidenName,
    [SU_PROFILE_REF.placeOfBirth]: f.placeOfBirth,
    [SU_PROFILE_REF.religion]: f.religion,
    [SU_PROFILE_REF.ethnicity]: f.ethnicity,
    [SU_PROFILE_REF.sexualOrientation]: f.sexualOrientation,
    [SU_PROFILE_REF.disability]: f.disability,
    [SU_PROFILE_REF.maternity]: f.maternity,
    [SU_PROFILE_REF.language]: f.language,
    [SU_PROFILE_REF.preferredContactMethod]: f.preferredContactMethod,
    [SU_PROFILE_REF.emailType]: f.emailType,
    [SU_PROFILE_REF.otherContactMethod]: f.otherContactMethod,
    [SU_PROFILE_REF.dateOfDeath]: f.dateOfDeath,
    [SU_PROFILE_REF.nhsNumberStatus]: f.nhsNumberStatus,
    [SU_PROFILE_REF.sex]: f.sex,
    [SU_PROFILE_REF.phoneType]: f.phoneType,
    [SU_PROFILE_REF.phonePreference]: f.phonePreference ? 'true' : '',
    [SU_PROFILE_REF.emailPreference]: f.emailPreference ? 'true' : '',
    [SU_PROFILE_REF.changePreference]: f.changePreference,
    [SU_PROFILE_REF.orderNumber]: f.orderNumber,
    [SU_PROFILE_REF.scanType]: f.scanType === 'None' ? '' : f.scanType,
    [SU_PROFILE_REF.scanCode]: f.scanCode,
    [SU_PROFILE_REF.caseNumber]: f.caseNumber,
    [SU_PROFILE_REF.sprocNumber]: f.sprocNumber,
    [SU_PROFILE_REF.lasNumber]: f.lasNumber,
    [SU_PROFILE_REF.nhsReferences]: f.nhsReferences,
    [SU_PROFILE_REF.asNumber]: f.asNumber,
  })
  if (references.length) p.references = references
  return p
}

function hasAddressData(f: FormState): boolean {
  return [
    f.addressLine1,
    f.addressLine2,
    f.town,
    f.county,
    f.country,
    f.postcode,
    f.secondaryPostcode,
    f.latitude,
    f.longitude,
    f.keySafeNumber,
    f.accessInstructions,
    f.accessMethod,
    f.keySafeLocation,
  ].some((s) => s.trim() !== '')
}

function buildAddressPayload(f: FormState) {
  const lat = f.latitude.trim() ? Number(f.latitude) : undefined
  const lng = f.longitude.trim() ? Number(f.longitude) : undefined
  return {
    addressLine1: f.addressLine1.trim() || undefined,
    addressLine2: f.addressLine2.trim() || undefined,
    town: f.town.trim() || undefined,
    county: f.county.trim() || undefined,
    country: f.country.trim() || undefined,
    postcode: f.postcode.trim() || undefined,
    secondaryPostcode: f.secondaryPostcode.trim() || undefined,
    latitude: lat != null && Number.isFinite(lat) ? lat : undefined,
    longitude: lng != null && Number.isFinite(lng) ? lng : undefined,
    keySafeNumber: f.keySafeNumber.trim() || undefined,
    accessInstructions: f.accessInstructions.trim() || undefined,
    accessMethod: f.accessMethod.trim() || null,
    keySafeLocation: f.keySafeLocation.trim() || null,
  }
}

function StringSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <Select
      value={value ? value : '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— None —</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function AddServiceUserPage() {
  const navigate = useNavigate()
  const apiConfigured = Boolean(getApiBaseUrl())
  const createMutation = useCreateServiceUser()
  const [form, setForm] = React.useState<FormState>({ ...emptyForm })
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [photoFile, setPhotoFile] = React.useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null)
  const submitting = createMutation.isPending

  const suLookupsQuery = useServiceUserLookups()
  const empLookupsQuery = useEmployeeLookups()
  const lookups: ServiceUserLookupsBundle | null = suLookupsQuery.data ?? null
  const loadError = suLookupsQuery.error
    ? extractApiErrorMessage(suLookupsQuery.error, 'Failed to load lookups')
    : empLookupsQuery.error
      ? extractApiErrorMessage(empLookupsQuery.error, 'Failed to load lookups')
      : null

  const [kwSearch, setKwSearch] = React.useState('')
  const [nnSearch, setNnSearch] = React.useState('')
  const [kwDebounced, setKwDebounced] = React.useState('')
  const [nnDebounced, setNnDebounced] = React.useState('')
  const [keyWorkerLabel, setKeyWorkerLabel] = React.useState('')
  const [namedNurseLabel, setNamedNurseLabel] = React.useState('')
  const [carerPreferences, setCarerPreferences] =
    React.useState<ServiceUserCarerPreferencesState>(emptyCarerPreferences)

  React.useEffect(() => {
    const t = window.setTimeout(() => setKwDebounced(kwSearch), 300)
    return () => clearTimeout(t)
  }, [kwSearch])

  React.useEffect(() => {
    const t = window.setTimeout(() => setNnDebounced(nnSearch), 300)
    return () => clearTimeout(t)
  }, [nnSearch])

  React.useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const kwQuery = useEmployees(
    { search: kwDebounced.trim(), limit: 15 },
    apiConfigured && kwDebounced.trim().length >= 2,
  )
  const nnQuery = useEmployees(
    { search: nnDebounced.trim(), limit: 15 },
    apiConfigured && nnDebounced.trim().length >= 2,
  )
  const kwHits: EmployeeListRow[] = kwQuery.data?.rows ?? []
  const nnHits: EmployeeListRow[] = nnQuery.data?.rows ?? []

  const set =
    (key: keyof FormState) =>
    (v: string): void => {
      setForm((prev) => ({ ...prev, [key]: v }))
      setFieldErrors((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    }

  const age = ageFromDob(form.dateOfBirth)
  const ethnicityRows = profileLookupSelectRows(lookups?.ethnicities ?? [], form.ethnicity)
  const languageRows = profileLookupSelectRows(lookups?.languages ?? [], form.language)

  const mapSelect = (
    field: keyof FormState,
    placeholder: string,
    rows: Array<{ id: string; name: string }>,
    required?: boolean,
  ) => (
    <>
      <Select
        value={form[field] ? String(form[field]) : '__none__'}
        onValueChange={(v) => set(field)(v === '__none__' ? '' : v)}
        disabled={!rows.length && !required}
      >
        <SelectTrigger
          className="w-full"
          data-testid={`service-user-${field}-select`}
          error={Boolean(fieldErrors[field])}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— None —</SelectItem>
          {rows.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError message={fieldErrors[field]} />
    </>
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setFieldErrors({})
    if (!apiConfigured) {
      setSubmitError('Set VITE_API_BASE_URL in .env and restart Vite.')
      toastError('Cannot create service user', 'Set VITE_API_BASE_URL in .env and restart Vite.')
      return
    }
    const required = requiredFieldErrors(form)
    const missing = Object.entries(REQUIRED_FIELD_LABELS)
      .filter(([key]) => required[key as keyof FormState])
      .map(([, label]) => label)
    if (missing.length) {
      setFieldErrors(required)
      const summary = `Please complete the required fields: ${missing.join(', ')}.`
      setSubmitError(summary)
      toastError('Cannot create service user', summary)
      return
    }
    try {
      const payload = buildPayload(form)
      const created = await createMutation.mutateAsync({
        payload,
        address: hasAddressData(form) ? buildAddressPayload(form) : undefined,
      })
      const hasCarerPrefs =
        carerPreferences.preferredCarers.length > 0 || carerPreferences.blockedCarers.length > 0
      if (hasCarerPrefs) {
        await patchServiceUserDomCare(created.id, toDomCareCarerPayload(carerPreferences))
      }
      if (photoFile) {
        try {
          await uploadServiceUserPhoto(created.id, photoFile)
        } catch (photoErr) {
          toastApiError(photoErr, 'Service user created, but photo upload failed')
        }
      }
      if (form.accessServiceUserApp && form.email.trim()) {
        try {
          await upsertServiceUserPortalAccount(created.id, {
            email: form.email.trim(),
            isEnabled: true,
          })
        } catch (portalErr) {
          toastApiError(portalErr, 'Service user created, but portal access could not be enabled')
        }
      }
      toastSuccess('Service user created', 'Redirecting to the service user list.')
      await navigate({ to: '/service-users/all' })
    } catch (err) {
      const parsed = pickFormFieldErrors(parseApiFieldErrors(err instanceof ApiError ? err.body : err))
      setFieldErrors(parsed)
      setSubmitError(extractApiErrorMessage(err, 'Could not create service user'))
      toastApiError(err, 'Could not create service user')
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <form className="space-y-4 pb-16" data-testid="service-user-add-form" onSubmit={onSubmit}>
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-1.5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-muted-foreground" />
              Add Service User
            </div>
            <p className="text-sm text-muted-foreground">
              Creates a service user via the CareAdmin API. Fields marked * are required for save.
            </p>
          </div>
        </div>

        {!apiConfigured && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            Add <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> to{' '}
            <code className="rounded bg-muted px-1">.env</code>, restart Vite, and sign in with an account that has{' '}
            <code className="rounded bg-muted px-1">service_users.create</code>.
          </div>
        )}
        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}
        {submitError && (
          <div
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            data-testid="service-user-add-error"
            role="alert"
          >
            {submitError}
          </div>
        )}

        {/* Header: Picture + NHS + Status */}
        <Section>
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
            <div>
              <LabelWithTip tip="Optional profile picture — uploaded after the record is created.">
                Picture
              </LabelWithTip>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground hover:bg-muted/50">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="h-16 w-16 rounded object-cover" />
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span>NO IMAGE AVAILABLE</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div>
              <LabelWithTip tip="NHS number (10 digits in England and Wales).">NHS Number</LabelWithTip>
              <Input value={form.nhsNumber} onChange={(e) => set('nhsNumber')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip tip="Verification status of the NHS number.">NHS Number Status</LabelWithTip>
              <StringSelect
                value={form.nhsNumberStatus}
                onChange={set('nhsNumberStatus')}
                options={NHS_STATUS_OPTIONS}
                placeholder="Select Status"
              />
            </div>
            <div>
              <LabelWithTip required tip="Service lifecycle status.">
                Status
              </LabelWithTip>
              {lookups ? (
                mapSelect('statusId', 'Select Status', lookups.statuses, true)
              ) : (
                <Input disabled placeholder="Loading…" />
              )}
            </div>
          </div>
        </Section>

        <Section>
          <SHead>Personal Details</SHead>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <LabelWithTip required tip="Legal or primary given name.">
                First Name
              </LabelWithTip>
              <Input
                data-testid="service-user-first-name"
                value={form.firstName}
                onChange={(e) => set('firstName')(e.target.value)}
                error={Boolean(fieldErrors.firstName)}
              />
              <FieldError message={fieldErrors.firstName} />
            </div>
            <div>
              <LabelWithTip tip="Additional given names if used.">Middle Name</LabelWithTip>
              <Input value={form.middleName} onChange={(e) => set('middleName')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip required tip="Family name or surname.">
                Last Name
              </LabelWithTip>
              <Input
                data-testid="service-user-last-name"
                value={form.lastName}
                onChange={(e) => set('lastName')(e.target.value)}
                error={Boolean(fieldErrors.lastName)}
              />
              <FieldError message={fieldErrors.lastName} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <LabelWithTip required tip="Courtesy title.">
                  Title
                </LabelWithTip>
                {lookups ? mapSelect('titleId', 'Select', lookups.titles) : <Input disabled />}
              </div>
              <div>
                <LabelWithTip tip="Name suffix if used.">Suffix</LabelWithTip>
                <Input value={form.suffix} onChange={(e) => set('suffix')(e.target.value)} />
              </div>
            </div>
            <div>
              <LabelWithTip tip="Previous family name if relevant.">Maiden Name</LabelWithTip>
              <Input value={form.maidenName} onChange={(e) => set('maidenName')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip tip="Day-to-day preferred name.">Preferred Name</LabelWithTip>
              <Input value={form.preferredName} onChange={(e) => set('preferredName')(e.target.value)} />
            </div>

            <div>
              <LabelWithTip required tip="Date of birth for age and safeguarding.">
                Date of Birth
              </LabelWithTip>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  data-testid="service-user-date-of-birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set('dateOfBirth')(e.target.value)}
                  className="max-w-[11rem]"
                  error={Boolean(fieldErrors.dateOfBirth)}
                />
                {age != null ? <span className="text-sm text-muted-foreground">{age} years</span> : null}
              </div>
              <FieldError message={fieldErrors.dateOfBirth} />
            </div>
            <div>
              <LabelWithTip tip="Marital or civil partnership status.">Marital Status</LabelWithTip>
              {lookups ? mapSelect('maritalStatusId', 'Select', lookups.maritalStatuses) : <Input disabled />}
            </div>
            <div>
              <LabelWithTip tip="Town, city, or country of birth.">Place of Birth</LabelWithTip>
              <Input
                value={form.placeOfBirth}
                onChange={(e) => set('placeOfBirth')(e.target.value)}
                placeholder="e.g. Manchester"
              />
            </div>

            <div>
              <LabelWithTip required tip="Gender from your configured list.">
                Gender
              </LabelWithTip>
              {lookups ? mapSelect('genderId', 'Select gender', lookups.genders) : <Input disabled />}
            </div>
            <div>
              <LabelWithTip tip="Religion or belief if provided.">Religion</LabelWithTip>
              <Input
                value={form.religion}
                onChange={(e) => set('religion')(e.target.value)}
                placeholder="e.g. Christian, Muslim, None"
              />
            </div>
            <div>
              <LabelWithTip tip="Ethnicity from Settings → Lookup data.">Ethnicity</LabelWithTip>
              <Select
                value={form.ethnicity || '__none__'}
                onValueChange={(v) => set('ethnicity')(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Please select a Ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {ethnicityRows.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <LabelWithTip tip="Pregnancy / maternity flag where needed for care.">Pregnant</LabelWithTip>
              <StringSelect
                value={form.maternity}
                onChange={set('maternity')}
                options={YES_NO_OPTIONS}
                placeholder="Select"
              />
            </div>
            <div>
              <LabelWithTip tip="Sex recorded separately from gender identity where collected.">Sex</LabelWithTip>
              <StringSelect
                value={form.sex}
                onChange={set('sex')}
                options={SEX_OPTIONS}
                placeholder="Select sex"
              />
            </div>
            <div>
              <LabelWithTip tip="Optional — collect only with consent.">Sexual Orientation</LabelWithTip>
              <Input
                value={form.sexualOrientation}
                onChange={(e) => set('sexualOrientation')(e.target.value)}
                placeholder="Only if the person chooses to share"
              />
            </div>
          </div>
        </Section>

        <Section>
          <SHead>Contact Details</SHead>
          <div className="space-y-4">
            <div className="max-w-md">
              <LabelWithTip tip="How this person prefers to be contacted first.">
                Preferred Contact Method
              </LabelWithTip>
              <StringSelect
                value={form.preferredContactMethod}
                onChange={set('preferredContactMethod')}
                options={PREF_CONTACT_OPTIONS}
                placeholder="Select"
              />
            </div>

            <div>
              <LabelWithTip tip="Primary service address (optional on create).">Address</LabelWithTip>
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
              />
            </div>

            <div>
              <LabelWithTip tip="Separate from the service address. Choose how carers get in.">
                How to enter the home
              </LabelWithTip>
              <div className="mt-2 rounded-xl border border-border bg-card p-4">
                <HomeAccessFields
                  value={{
                    accessMethod: form.accessMethod,
                    keySafeLocation: form.keySafeLocation,
                    keySafeNumber: form.keySafeNumber,
                    accessInstructions: form.accessInstructions,
                  }}
                  onChange={patch => setForm(prev => ({ ...prev, ...patch }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem] flex-1">
                <LabelWithTip tip="Main contact number.">Phone Number</LabelWithTip>
                <Input value={form.phone} onChange={(e) => set('phone')(e.target.value)} />
              </div>
              <div className="min-w-[8rem] w-40">
                <LabelWithTip>Phone Type</LabelWithTip>
                <StringSelect
                  value={form.phoneType}
                  onChange={set('phoneType')}
                  options={PHONE_TYPE_OPTIONS}
                  placeholder="Type"
                />
              </div>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.phonePreference}
                  onChange={(e) => setForm((p) => ({ ...p, phonePreference: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                Preference
              </label>
              <div className="min-w-[10rem] flex-1">
                <LabelWithTip tip="Mobile number.">Mobile</LabelWithTip>
                <Input value={form.mobile} onChange={(e) => set('mobile')(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] flex-1">
                <LabelWithTip tip="Email for notifications.">Email</LabelWithTip>
                <Input
                  data-testid="service-user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                />
              </div>
              <div className="min-w-[10rem] w-48">
                <LabelWithTip>Email Type</LabelWithTip>
                <StringSelect
                  value={form.emailType}
                  onChange={set('emailType')}
                  options={EMAIL_TYPE_OPTIONS}
                  placeholder="Please select email type."
                />
              </div>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.emailPreference}
                  onChange={(e) => setForm((p) => ({ ...p, emailPreference: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                Preference
              </label>
            </div>

            <div className="max-w-xl">
              <LabelWithTip tip="Any other agreed contact channel.">Other Contact Method</LabelWithTip>
              <Input
                value={form.otherContactMethod}
                onChange={(e) => set('otherContactMethod')(e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section>
          <SHead>Service User Login App Settings</SHead>
          <div className="flex flex-wrap items-center gap-3">
            <LabelWithTip tip="Allow this person to sign in at /portal/login (requires email).">
              Access Service User Application
            </LabelWithTip>
            <button
              type="button"
              role="switch"
              aria-checked={form.accessServiceUserApp}
              onClick={() =>
                setForm((p) => ({ ...p, accessServiceUserApp: !p.accessServiceUserApp }))
              }
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors',
                form.accessServiceUserApp ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  form.accessServiceUserApp ? 'left-5' : 'left-0.5',
                )}
              />
            </button>
            <span className="text-xs text-muted-foreground">
              {form.accessServiceUserApp ? 'YES' : 'NO'}
            </span>
          </div>
        </Section>

        <Section>
          <SHead>Reference Information</SHead>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <LabelWithTip tip="Organisation service user / case number.">Service User ID</LabelWithTip>
              <Input
                value={form.serviceUserNumber}
                onChange={(e) => set('serviceUserNumber')(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <LabelWithTip required tip="Zone, branch and area for scheduling.">
                Location
              </LabelWithTip>
              <ServiceUserZoneBranchSelect
                value={form.locationId}
                areaId={form.serviceUserAreaId}
                mainPostcode={form.postcode}
                onChange={({ locationId, serviceUserAreaId }) => {
                  set('locationId')(locationId)
                  setForm((prev) => ({ ...prev, serviceUserAreaId }))
                }}
                onApplyMainPostcode={(postcode) => setForm((prev) => ({ ...prev, postcode }))}
              />
              <FieldError message={fieldErrors.locationId} />
            </div>

            <div>
              <LabelWithTip tip="Date service started.">Service Start Date/Time</LabelWithTip>
              <Input
                data-testid="service-user-service-start"
                type="date"
                value={form.serviceStartDate}
                onChange={(e) => set('serviceStartDate')(e.target.value)}
              />
            </div>
            <div>
              <LabelWithTip tip="Last day of service if known.">Service End Date/Time</LabelWithTip>
              <Input
                type="date"
                value={form.serviceEndDate}
                onChange={(e) => set('serviceEndDate')(e.target.value)}
              />
            </div>
            <div>
              <LabelWithTip tip="Only when verified.">Date of Death</LabelWithTip>
              <Input
                type="date"
                value={form.dateOfDeath}
                onChange={(e) => set('dateOfDeath')(e.target.value)}
              />
            </div>

            <EmployeeSearch
              label="Key Worker"
              search={kwSearch}
              setSearch={setKwSearch}
              selectedId={form.keyWorkerId}
              selectedLabel={keyWorkerLabel}
              hits={kwHits}
              onPick={(r) => {
                const name = employeeDisplayName(r)
                setForm((p) => ({ ...p, keyWorkerId: r.id }))
                setKeyWorkerLabel(name)
                setKwSearch(name)
              }}
              onClear={() => {
                setForm((p) => ({ ...p, keyWorkerId: '' }))
                setKeyWorkerLabel('')
              }}
            />
            <EmployeeSearch
              label="Named Nurse"
              search={nnSearch}
              setSearch={setNnSearch}
              selectedId={form.namedNurseId}
              selectedLabel={namedNurseLabel}
              hits={nnHits}
              onPick={(r) => {
                const name = employeeDisplayName(r)
                setForm((p) => ({ ...p, namedNurseId: r.id }))
                setNamedNurseLabel(name)
                setNnSearch(name)
              }}
              onClear={() => {
                setForm((p) => ({ ...p, namedNurseId: '' }))
                setNamedNurseLabel('')
              }}
            />
            <div />

            <div>
              <LabelWithTip tip="Funding route / type.">Funding Route</LabelWithTip>
              {lookups ? mapSelect('fundingTypeId', 'Select funding', lookups.fundingTypes) : <Input disabled />}
            </div>
            <div>
              <LabelWithTip tip="Category or package of care.">Category of Care</LabelWithTip>
              {lookups ? mapSelect('careTypeId', 'Please select a Category of Care', lookups.careTypes) : <Input disabled />}
            </div>
            <div>
              <LabelWithTip tip="UK National Insurance number.">NI Number</LabelWithTip>
              <Input
                value={form.nationalInsuranceNumber}
                onChange={(e) => set('nationalInsuranceNumber')(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <LabelWithTip tip="Notes about change preferences for this person.">
                Change Preference
              </LabelWithTip>
              <textarea
                rows={3}
                className={cn(
                  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                )}
                value={form.changePreference}
                onChange={(e) => set('changePreference')(e.target.value)}
              />
            </div>

            <div>
              <LabelWithTip>Order Number</LabelWithTip>
              <Input value={form.orderNumber} onChange={(e) => set('orderNumber')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip tip="Adult social care / local-system AS reference.">AS Number</LabelWithTip>
              <Input value={form.asNumber} onChange={(e) => set('asNumber')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip tip="Risk band from your list.">Risk level</LabelWithTip>
              {lookups ? mapSelect('riskLevelId', 'Select risk level', lookups.riskLevels) : <Input disabled />}
            </div>

            <div>
              <LabelWithTip>Scan Type</LabelWithTip>
              <StringSelect
                value={form.scanType}
                onChange={set('scanType')}
                options={SCAN_TYPE_OPTIONS}
                placeholder="None"
              />
            </div>
            <div>
              <LabelWithTip tip="Scan code value when Scan Type is set.">Scan Code</LabelWithTip>
              <Input
                value={form.scanCode}
                onChange={(e) => set('scanCode')(e.target.value)}
                disabled={form.scanType === 'None' || !form.scanType}
                className={cn(
                  (form.scanType === 'None' || !form.scanType) && 'bg-muted',
                )}
              />
            </div>
            <div />

            <div>
              <LabelWithTip>Case Number</LabelWithTip>
              <Input value={form.caseNumber} onChange={(e) => set('caseNumber')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip>SPROC Number</LabelWithTip>
              <Input value={form.sprocNumber} onChange={(e) => set('sprocNumber')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip>LAS number</LabelWithTip>
              <Input value={form.lasNumber} onChange={(e) => set('lasNumber')(e.target.value)} />
            </div>

            <div>
              <LabelWithTip>NHS references</LabelWithTip>
              <Input
                value={form.nhsReferences}
                onChange={(e) => set('nhsReferences')(e.target.value)}
              />
            </div>
            <div>
              <LabelWithTip tip="Disability / long-term condition for adjustments.">Disability</LabelWithTip>
              <Input value={form.disability} onChange={(e) => set('disability')(e.target.value)} />
            </div>
            <div>
              <LabelWithTip tip="Preferred language.">Language</LabelWithTip>
              <Select
                value={form.language || '__none__'}
                onValueChange={(v) => set('language')(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {languageRows.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <LabelWithTip tip="Internal notes.">Notes</LabelWithTip>
              <textarea
                rows={3}
                className={cn(
                  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                )}
                value={form.notes}
                onChange={(e) => set('notes')(e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section>
          <ServiceUserCarerPreferencesSection
            value={carerPreferences}
            onChange={setCarerPreferences}
          />
        </Section>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="px-8"
            onClick={() => void navigate({ to: '/service-users/all' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="px-8"
            data-testid="service-user-save"
            disabled={submitting || !apiConfigured}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  )
}
