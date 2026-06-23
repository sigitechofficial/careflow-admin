import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Info, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AddressPlacesField,
  emptyAddressPlacesValue,
  type AddressPlacesValue,
} from '@/shared/ui/address-places-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { type EmployeeListRow, type LookupRow } from '@/features/employees/types'
import {
  type CreateServiceUserPayload,
  type ServiceUserLookupsBundle,
} from '@/features/service-users/types'
import { useEmployeeLookups, useEmployees } from '@/features/employees/hooks/useEmployees'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useCreateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import { patchServiceUserDomCare } from '@/features/service-users/api/service-users.api'
import { ServiceUserZoneBranchSelect } from '@/features/service-users/components/ServiceUserZoneBranchSelect'
import {
  emptyCarerPreferences,
  ServiceUserCarerPreferencesSection,
  toDomCareCarerPayload,
  type ServiceUserCarerPreferencesState,
} from '@/features/service-users/components/ServiceUserCarerPreferencesSection'

type FormState = {
  firstName: string
  middleName: string
  lastName: string
  preferredName: string
  nhsNumber: string
  nationalInsuranceNumber: string
  email: string
  phone: string
  mobile: string
  dateOfBirth: string
  serviceStartDate: string
  serviceEndDate: string
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
  keyWorkerId: string
  namedNurseId: string
  keySafeNumber: string
  accessInstructions: string
} & AddressPlacesValue

const emptyForm: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',
  nhsNumber: '',
  nationalInsuranceNumber: '',
  email: '',
  phone: '',
  mobile: '',
  dateOfBirth: '',
  serviceStartDate: '',
  serviceEndDate: '',
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
  keyWorkerId: '',
  namedNurseId: '',
  keySafeNumber: '',
  accessInstructions: '',
  ...emptyAddressPlacesValue(),
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 dark:bg-card dark:border-border">
      {children}
    </div>
  )
}

function SHead({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-blue-600 mb-4 dark:text-blue-400">{children}</h2>
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-sm font-medium text-slate-700 mb-1.5 dark:text-muted-foreground">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </p>
  )
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
  p.dateOfBirth = opt(f.dateOfBirth)
  p.serviceStartDate = opt(f.serviceStartDate)
  p.serviceEndDate = opt(f.serviceEndDate)
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
  p.keyWorkerId = optId(f.keyWorkerId)
  p.namedNurseId = optId(f.namedNurseId)
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
    f.latitude,
    f.longitude,
    f.keySafeNumber,
    f.accessInstructions,
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
    latitude: lat != null && Number.isFinite(lat) ? lat : undefined,
    longitude: lng != null && Number.isFinite(lng) ? lng : undefined,
    keySafeNumber: f.keySafeNumber.trim() || undefined,
    accessInstructions: f.accessInstructions.trim() || undefined,
  }
}

export default function AddServiceUserPage() {
  const navigate = useNavigate()
  const apiConfigured = Boolean(getApiBaseUrl())
  const createMutation = useCreateServiceUser()
  const [form, setForm] = React.useState<FormState>({ ...emptyForm })
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const submitting = createMutation.isPending

  const suLookupsQuery = useServiceUserLookups()
  const empLookupsQuery = useEmployeeLookups()
  const lookups: ServiceUserLookupsBundle | null = suLookupsQuery.data ?? null
  const loadError =
    suLookupsQuery.error instanceof ApiError
      ? suLookupsQuery.error.message
      : empLookupsQuery.error instanceof ApiError
        ? empLookupsQuery.error.message
        : suLookupsQuery.error || empLookupsQuery.error
          ? 'Failed to load lookups'
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
    }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!apiConfigured) {
      setSubmitError('Set VITE_API_BASE_URL in .env and restart Vite.')
      toastError('Cannot create service user', 'Set VITE_API_BASE_URL in .env and restart Vite.')
      return
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSubmitError('First name and last name are required.')
      toastError('Cannot create service user', 'First name and last name are required.')
      return
    }
    if (!form.statusId.trim()) {
      setSubmitError('Please select a service user status.')
      toastError('Cannot create service user', 'Please select a service user status.')
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
      toastSuccess('Service user created', 'Redirecting to the service user list.')
      await navigate({ to: '/service-users/all' })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not create service user')
      toastApiError(err, 'Could not create service user')
    }
  }

  const mapSelect = (field: keyof FormState, placeholder: string, rows: Array<{ id: string; name: string }>) => (
    <Select
      value={form[field] ? String(form[field]) : '__none__'}
      onValueChange={(v) => set(field)(v === '__none__' ? '' : v)}
      disabled={!rows.length}
    >
      <SelectTrigger className="w-full" data-testid={`service-user-${field}-select`}>
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
  )

  return (
    <form className="space-y-4 pb-16" data-testid="service-user-add-form" onSubmit={onSubmit}>
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
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
          Add <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> to <code className="rounded bg-muted px-1">.env</code>, restart Vite, and sign in with an account that has{' '}
          <code className="rounded bg-muted px-1">service_users.create</code>.
        </div>
      )}
      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}
      {submitError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <Section>
        <SHead>Identity and status</SHead>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>First name</FieldLabel>
            <Input
              data-testid="service-user-first-name"
              value={form.firstName}
              onChange={(e) => set('firstName')(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div>
            <FieldLabel>Middle name</FieldLabel>
            <Input value={form.middleName} onChange={(e) => set('middleName')(e.target.value)} />
          </div>
          <div>
            <FieldLabel required>Last name</FieldLabel>
            <Input
              data-testid="service-user-last-name"
              value={form.lastName}
              onChange={(e) => set('lastName')(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <div>
            <FieldLabel>Preferred name</FieldLabel>
            <Input value={form.preferredName} onChange={(e) => set('preferredName')(e.target.value)} />
            </div>
          <div>
            <FieldLabel>NHS number</FieldLabel>
            <Input value={form.nhsNumber} onChange={(e) => set('nhsNumber')(e.target.value)} />
          </div>
          <div>
            <FieldLabel>NI number</FieldLabel>
            <Input value={form.nationalInsuranceNumber} onChange={(e) => set('nationalInsuranceNumber')(e.target.value)} />
          </div>
          <div>
            <FieldLabel required>Status</FieldLabel>
            {lookups ? mapSelect('statusId', 'Select status', lookups.statuses) : <Input disabled placeholder="Loading statuses…" />}
            </div>
          <div>
            <FieldLabel>Date of birth</FieldLabel>
            <Input
              data-testid="service-user-date-of-birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth')(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section>
        <SHead>Lookups</SHead>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Title</FieldLabel>
            {lookups ? mapSelect('titleId', 'Select title', lookups.titles) : <Input disabled />}
        </div>
          <div>
            <FieldLabel>Gender</FieldLabel>
            {lookups ? mapSelect('genderId', 'Select gender', lookups.genders) : <Input disabled />}
        </div>
          <div>
            <FieldLabel>Marital status</FieldLabel>
            {lookups ? mapSelect('maritalStatusId', 'Select marital status', lookups.maritalStatuses) : <Input disabled />}
        </div>
          <div>
            <FieldLabel>Care type</FieldLabel>
            {lookups ? (
              <>
                {mapSelect('careTypeId', 'Select care type', lookups.careTypes)}
                {lookups.careTypes.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No care types yet. Add them in Settings → Lookup data → Care types.
                  </p>
                ) : null}
              </>
            ) : (
              <Input disabled placeholder="Loading care types…" />
            )}
        </div>
          <div>
            <FieldLabel>Funding type</FieldLabel>
            {lookups ? mapSelect('fundingTypeId', 'Select funding', lookups.fundingTypes) : <Input disabled />}
          </div>
          <div>
            <FieldLabel>Risk level</FieldLabel>
            {lookups ? mapSelect('riskLevelId', 'Select risk level', lookups.riskLevels) : <Input disabled />}
        </div>
        </div>
      </Section>

      <Section>
        <SHead>Contact</SHead>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              data-testid="service-user-email"
              type="email"
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <Input value={form.phone} onChange={(e) => set('phone')(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Mobile</FieldLabel>
            <Input value={form.mobile} onChange={(e) => set('mobile')(e.target.value)} />
          </div>
        </div>
      </Section>

      <Section>
        <SHead>Service and assignment</SHead>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Service user number</FieldLabel>
            <Input value={form.serviceUserNumber} onChange={(e) => set('serviceUserNumber')(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Zone & branch</FieldLabel>
            <ServiceUserZoneBranchSelect
              value={form.locationId}
              onChange={set('locationId')}
              className="mt-1.5"
            />
          </div>
          <div>
            <FieldLabel>Service start</FieldLabel>
            <Input
              data-testid="service-user-service-start"
              type="date"
              value={form.serviceStartDate}
              onChange={(e) => set('serviceStartDate')(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Service end</FieldLabel>
            <Input type="date" value={form.serviceEndDate} onChange={(e) => set('serviceEndDate')(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <FieldLabel>Key worker (search employees)</FieldLabel>
            <Input
              placeholder="Type at least 2 characters…"
              value={kwSearch}
              onChange={(e) => {
                setKwSearch(e.target.value)
                if (!e.target.value.trim()) {
                  setForm((p) => ({ ...p, keyWorkerId: '' }))
                  setKeyWorkerLabel('')
                }
              }}
            />
            {form.keyWorkerId && (
              <p className="text-xs text-muted-foreground">
                Selected: {keyWorkerLabel || form.keyWorkerId}{' '}
                <button
                  type="button"
                  className="text-blue-600 underline"
                  onClick={() => {
                    setForm((p) => ({ ...p, keyWorkerId: '' }))
                    setKeyWorkerLabel('')
                    setKwSearch('')
                  }}
                >
                  Clear
                </button>
              </p>
            )}
            {kwHits.length > 0 && !form.keyWorkerId && (
              <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm">
                {kwHits.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setForm((p) => ({ ...p, keyWorkerId: r.id }))
                        setKeyWorkerLabel(r.fullName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim())
                        setKwSearch('')
                      }}
                    >
                      {(r.fullName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()) || r.id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:col-span-2 space-y-2">
            <FieldLabel>Named nurse (search employees)</FieldLabel>
            <Input
              placeholder="Type at least 2 characters…"
              value={nnSearch}
              onChange={(e) => {
                setNnSearch(e.target.value)
                if (!e.target.value.trim()) {
                  setForm((p) => ({ ...p, namedNurseId: '' }))
                  setNamedNurseLabel('')
                }
              }}
            />
            {form.namedNurseId && (
              <p className="text-xs text-muted-foreground">
                Selected: {namedNurseLabel || form.namedNurseId}{' '}
                <button
                  type="button"
                  className="text-blue-600 underline"
                  onClick={() => {
                    setForm((p) => ({ ...p, namedNurseId: '' }))
                    setNamedNurseLabel('')
                    setNnSearch('')
                  }}
                >
                  Clear
                </button>
              </p>
            )}
            {nnHits.length > 0 && !form.namedNurseId && (
              <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm">
                {nnHits.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setForm((p) => ({ ...p, namedNurseId: r.id }))
                        setNamedNurseLabel(r.fullName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim())
                        setNnSearch('')
                      }}
                    >
                      {(r.fullName ?? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()) || r.id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Notes</FieldLabel>
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

      <Section>
        <SHead>Address (optional — includes map coordinates)</SHead>
        <AddressPlacesField
          value={{
            addressLine1: form.addressLine1,
            addressLine2: form.addressLine2,
            town: form.town,
            county: form.county,
            country: form.country,
            postcode: form.postcode,
            latitude: form.latitude,
            longitude: form.longitude,
          }}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Key safe number</FieldLabel>
              <Input value={form.keySafeNumber} onChange={(e) => set('keySafeNumber')(e.target.value)} autoComplete="off" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Access instructions</FieldLabel>
              <textarea
                rows={2}
                className={cn(
                  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                )}
                value={form.accessInstructions}
                onChange={(e) => set('accessInstructions')(e.target.value)}
              />
            </div>
          </div>
        </AddressPlacesField>
      </Section>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" className="px-8" onClick={() => void navigate({ to: '/service-users/all' })}>
          Cancel
        </Button>
        <Button type="submit" className="px-8" data-testid="service-user-save" disabled={submitting || !apiConfigured}>
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
  )
}
