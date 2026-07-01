import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  usePatchPortalProfile,
  usePortalLookups,
  usePortalProfile,
} from '@/features/service-user-portal/hooks/usePortalAboutMe'
import type { PortalProfile } from '@/features/service-user-portal/api/portal.api'
import {
  employeeDisplayName,
  formatPortalDate,
  PortalReadOnlyField,
  PortalSection,
  toInputDate,
} from '@/features/service-user-portal/components/portal-display.util'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

type FormState = {
  firstName: string
  middleName: string
  lastName: string
  preferredName: string
  titleId: string
  genderId: string
  maritalStatusId: string
  dateOfBirth: string
  suffix: string
  maidenName: string
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
  postcode: string
  country: string
  accessInstructions: string
  keySafeNumber: string
}

function profileToForm(data: PortalProfile): FormState {
  const e = data.profileExtras
  return {
    firstName: data.firstName ?? '',
    middleName: data.middleName ?? '',
    lastName: data.lastName ?? '',
    preferredName: data.preferredName ?? '',
    titleId: data.title?.id ?? '',
    genderId: data.gender?.id ?? '',
    maritalStatusId: data.maritalStatus?.id ?? '',
    dateOfBirth: toInputDate(data.dateOfBirth),
    suffix: e.suffix ?? '',
    maidenName: e.maidenName ?? '',
    placeOfBirth: e.placeOfBirth ?? '',
    religion: e.religion ?? '',
    ethnicity: e.ethnicity ?? '',
    sexualOrientation: e.sexualOrientation ?? '',
    disability: e.disability ?? '',
    maternity: e.maternity ?? '',
    language: e.language ?? '',
    preferredContactMethod: e.preferredContactMethod ?? '',
    emailType: e.emailType ?? '',
    otherContactMethod: e.otherContactMethod ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    mobile: data.mobile ?? '',
    addressLine1: data.address?.addressLine1 ?? '',
    addressLine2: data.address?.addressLine2 ?? '',
    town: data.address?.town ?? '',
    county: data.address?.county ?? '',
    postcode: data.address?.postcode ?? '',
    country: data.address?.country ?? '',
    accessInstructions: data.address?.accessInstructions ?? '',
    keySafeNumber: data.address?.keySafeNumber ?? '',
  }
}

function EditableField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

export default function PortalProfilePage() {
  const { data, isLoading } = usePortalProfile()
  const { data: lookups } = usePortalLookups()
  const patch = usePatchPortalProfile()
  const [form, setForm] = React.useState<FormState | null>(null)

  React.useEffect(() => {
    if (!data) return
    setForm(profileToForm(data))
  }, [data])

  if (isLoading || !data || !form) {
    return <p className="text-sm text-muted-foreground">Loading your record…</p>
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    try {
      await patch.mutateAsync({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        preferredName: form.preferredName,
        titleId: form.titleId || null,
        genderId: form.genderId || null,
        maritalStatusId: form.maritalStatusId || null,
        dateOfBirth: form.dateOfBirth || null,
        suffix: form.suffix,
        maidenName: form.maidenName,
        placeOfBirth: form.placeOfBirth,
        religion: form.religion,
        ethnicity: form.ethnicity,
        sexualOrientation: form.sexualOrientation,
        disability: form.disability,
        maternity: form.maternity,
        language: form.language,
        preferredContactMethod: form.preferredContactMethod,
        emailType: form.emailType,
        otherContactMethod: form.otherContactMethod,
        email: form.email,
        phone: form.phone,
        mobile: form.mobile,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        town: form.town,
        county: form.county,
        postcode: form.postcode,
        country: form.country,
        accessInstructions: form.accessInstructions,
        keySafeNumber: form.keySafeNumber,
      })
      toastSuccess('Saved', 'Your personal details were updated.')
    } catch (err) {
      toastApiError(err, 'Save failed')
    }
  }

  const set = (key: keyof FormState, value: string) => setForm(f => (f ? { ...f, [key]: value } : f))
  const profilePhotoSrc = resolveMediaUrl(data.profilePhotoUrl)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Personal details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your full care record. You can update contact and personal information here; care team fields are shown
          read-only.
        </p>
      </div>

      {profilePhotoSrc ? (
        <div className="flex items-center gap-4">
          <img
            src={profilePhotoSrc}
            alt=""
            className="h-20 w-20 rounded-full border border-border object-cover"
          />
          <div>
            <p className="font-medium text-foreground">
              {[data.firstName, data.lastName].filter(Boolean).join(' ')}
            </p>
            {data.preferredName ? (
              <p className="text-sm text-muted-foreground">Preferred: {data.preferredName}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <PortalSection title="Care team record (read-only)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PortalReadOnlyField label="Status" value={data.status?.name} />
          <PortalReadOnlyField label="NHS number" value={data.nhsNumber} />
          <PortalReadOnlyField label="Service user number" value={data.serviceUserNumber} />
          <PortalReadOnlyField label="Resident ID" value={data.residentId} />
          <PortalReadOnlyField label="Resident GUID" value={data.residentGuid} />
          <PortalReadOnlyField label="National Insurance number" value={data.nationalInsuranceNumber} />
          <PortalReadOnlyField label="Social services reference" value={data.socialServicesRef} />
          <PortalReadOnlyField label="AS number" value={data.profileExtras.asNumber} />
          <PortalReadOnlyField label="Care type" value={data.careType?.name} />
          <PortalReadOnlyField label="Funding type" value={data.fundingType?.name} />
          <PortalReadOnlyField label="Risk level" value={data.riskLevel?.name} />
          <PortalReadOnlyField label="Location" value={data.location?.name} />
          <PortalReadOnlyField label="Key worker" value={employeeDisplayName(data.keyWorker)} />
          <PortalReadOnlyField label="Named nurse" value={employeeDisplayName(data.namedNurse)} />
          <PortalReadOnlyField label="Service start date" value={formatPortalDate(data.serviceStartDate)} />
          <PortalReadOnlyField label="Service end date" value={formatPortalDate(data.serviceEndDate)} />
          <PortalReadOnlyField label="Date of death" value={formatPortalDate(data.profileExtras.dateOfDeath)} />
        </div>
      </PortalSection>

      <form onSubmit={e => void onSave(e)} className="space-y-6">
        <PortalSection title="Identity">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <EditableField label="First name" value={form.firstName} onChange={v => set('firstName', v)} />
            <EditableField label="Middle name" value={form.middleName} onChange={v => set('middleName', v)} />
            <EditableField label="Last name" value={form.lastName} onChange={v => set('lastName', v)} />
            <EditableField label="Preferred name" value={form.preferredName} onChange={v => set('preferredName', v)} />
            <EditableField label="Suffix" value={form.suffix} onChange={v => set('suffix', v)} />
            <EditableField label="Maiden name" value={form.maidenName} onChange={v => set('maidenName', v)} />
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Title</span>
              <Select value={form.titleId} onValueChange={v => set('titleId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  {(lookups?.titles ?? []).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Gender</span>
              <Select value={form.genderId} onValueChange={v => set('genderId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {(lookups?.genders ?? []).map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Marital status</span>
              <Select value={form.maritalStatusId} onValueChange={v => set('maritalStatusId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(lookups?.maritalStatuses ?? []).map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <EditableField
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={v => set('dateOfBirth', v)}
            />
            <EditableField label="Place of birth" value={form.placeOfBirth} onChange={v => set('placeOfBirth', v)} />
            <EditableField label="Religion" value={form.religion} onChange={v => set('religion', v)} />
            <EditableField label="Ethnicity" value={form.ethnicity} onChange={v => set('ethnicity', v)} />
            <EditableField
              label="Sexual orientation"
              value={form.sexualOrientation}
              onChange={v => set('sexualOrientation', v)}
            />
            <EditableField label="Disability" value={form.disability} onChange={v => set('disability', v)} />
            <EditableField label="Maternity" value={form.maternity} onChange={v => set('maternity', v)} />
            <EditableField label="Language" value={form.language} onChange={v => set('language', v)} />
          </div>
        </PortalSection>

        <PortalSection title="Contact">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <EditableField label="Email" type="email" value={form.email} onChange={v => set('email', v)} />
            <EditableField label="Email type" value={form.emailType} onChange={v => set('emailType', v)} />
            <EditableField label="Phone" value={form.phone} onChange={v => set('phone', v)} />
            <EditableField label="Mobile" value={form.mobile} onChange={v => set('mobile', v)} />
            <EditableField
              label="Preferred contact method"
              value={form.preferredContactMethod}
              onChange={v => set('preferredContactMethod', v)}
            />
            <EditableField
              label="Other contact method"
              value={form.otherContactMethod}
              onChange={v => set('otherContactMethod', v)}
            />
          </div>
        </PortalSection>

        <PortalSection title="Address">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditableField
              label="Address line 1"
              value={form.addressLine1}
              onChange={v => set('addressLine1', v)}
            />
            <EditableField
              label="Address line 2"
              value={form.addressLine2}
              onChange={v => set('addressLine2', v)}
            />
            <EditableField label="Town" value={form.town} onChange={v => set('town', v)} />
            <EditableField label="County" value={form.county} onChange={v => set('county', v)} />
            <EditableField label="Postcode" value={form.postcode} onChange={v => set('postcode', v)} />
            <EditableField label="Country" value={form.country} onChange={v => set('country', v)} />
            <EditableField
              label="Access instructions"
              value={form.accessInstructions}
              onChange={v => set('accessInstructions', v)}
            />
            <EditableField label="Key safe number" value={form.keySafeNumber} onChange={v => set('keySafeNumber', v)} />
          </div>
        </PortalSection>

        <Button type="submit" disabled={patch.isPending} className="gap-1.5">
          {patch.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Save changes
        </Button>
      </form>
    </div>
  )
}
