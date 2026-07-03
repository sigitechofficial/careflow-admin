import type { EmployeeDetail } from '@/features/employees/types'

/** Form shape for add/edit employee (react-hook-form). */
export type EmployeeFormValues = {
  firstName: string
  lastName: string
  username: string
  email: string
  titleId: string
  genderId: string
  nationalityId: string
  ethnicityId: string
  statusId: string
  dateOfBirth: string
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  country: string
  postcode: string
  latitude: string
  longitude: string
  homeDialCode: string
  homeTelephone: string
  mobileDialCode: string
  mobileTelephone: string
  photoUrl: string
  workAreaId: string
  roleId: string
  locationId: string
  jobTitleId: string
  rbacLevelId: string
  gradeId: string
  contractTypeId: string
  travelPaymentTypeId: string
  baseLocationIds: string[]
  startDate: string
  endDate: string
  nationalInsuranceNo: string
  nmcPinNumber: string
  employeeNumber: string
  payrollNumber: string
  accessAllZones: boolean
  visaTypeId: string
  isInCountry: boolean
  contractedWeeklyHours: string
  maximumWeeklyHours: string
  minimumWeeklyHours: string
  weeklyHoursCapOverride: string
  weeklyHoursCapOverrideReason: string
  weeklyHoursCapOverrideExpiresAt: string
  optedOutOf48Hours: boolean
  isAgencyStaff: boolean
  agencyName: string
  agencyRating: string
  isPreferredAgency: boolean
  isBlacklisted: boolean
  dailyRate: string
  hourlyDayRate: string
  hourlyNightRate: string
  availableForWork: boolean
  workingPatternRequired: boolean
  workBankHoliday: boolean
}

type LookupRef = { id?: string | null; name?: string | null } | null | undefined

type EmployeeDetailPersonalApi = NonNullable<EmployeeDetail['personalDetail']> & {
  title?: LookupRef
  gender?: LookupRef
  nationality?: LookupRef
  ethnicity?: LookupRef
  status?: LookupRef
}

type EmployeeDetailEmploymentApi = NonNullable<EmployeeDetail['employment']> & {
  workArea?: LookupRef
  role?: LookupRef
  jobTitle?: LookupRef
  rbacLevel?: LookupRef
  grade?: LookupRef
  contractType?: LookupRef
  travelPaymentType?: LookupRef
  baseLocation?: LookupRef
  location?: LookupRef
  baseLocations?: Array<{ location?: LookupRef }> | null
}

function pickLookupId(scalar: string | null | undefined, relation: LookupRef): string {
  const fromScalar = typeof scalar === 'string' ? scalar.trim() : ''
  if (fromScalar) return fromScalar
  const fromRel = typeof relation?.id === 'string' ? relation.id.trim() : ''
  return fromRel
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function numToInput(v: unknown): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const s = String(v)
    if (s && s !== '[object Object]' && !Number.isNaN(Number(s))) return s
  }
  const n = Number(v)
  if (Number.isFinite(n)) return String(n)
  return String(v)
}

export function mapEmployeeDetailToFormValues(
  emp: EmployeeDetail,
  defaults: EmployeeFormValues,
  splitPhoneForForm: (raw?: string) => { dial: string; local: string },
): EmployeeFormValues {
  const pd = emp.personalDetail as EmployeeDetailPersonalApi | null | undefined
  const em = emp.employment as EmployeeDetailEmploymentApi | null | undefined

  const home = splitPhoneForForm(pd?.homeTelephone ?? undefined)
  const mobile = splitPhoneForForm(pd?.mobileTelephone ?? undefined)

  const personal: Partial<EmployeeFormValues> = pd
    ? {
        firstName: pd.firstName ?? '',
        lastName: pd.lastName ?? '',
        username: pd.username ?? '',
        email: pd.email ?? '',
        titleId: pickLookupId(pd.titleId, pd.title),
        genderId: pickLookupId(pd.genderId, pd.gender),
        nationalityId: pickLookupId(pd.nationalityId, pd.nationality),
        ethnicityId: pickLookupId(pd.ethnicityId, pd.ethnicity),
        statusId: pickLookupId(pd.statusId, pd.status),
        dateOfBirth: isoToDateInput(pd.dateOfBirth ?? undefined),
        addressLine1: pd.addressLine1 ?? '',
        addressLine2: pd.addressLine2 ?? '',
        town: pd.town ?? '',
        county: pd.county ?? '',
        country: pd.country ?? '',
        postcode: pd.postcode ?? '',
        latitude: pd.latitude != null ? String(pd.latitude) : '',
        longitude: pd.longitude != null ? String(pd.longitude) : '',
        homeDialCode: home.dial,
        homeTelephone: home.local,
        mobileDialCode: mobile.dial,
        mobileTelephone: mobile.local,
        photoUrl: pd.photoUrl ?? '',
      }
    : {}

  const employment: Partial<EmployeeFormValues> = em
    ? {
        workAreaId: pickLookupId(em.workAreaId, em.workArea),
        roleId: pickLookupId(em.roleId, em.role),
        locationId: pickLookupId(em.locationId, em.location),
        jobTitleId: pickLookupId(em.jobTitleId, em.jobTitle),
        rbacLevelId: pickLookupId(em.rbacLevelId, em.rbacLevel),
        gradeId: pickLookupId(em.gradeId, em.grade),
        contractTypeId: pickLookupId(em.contractTypeId, em.contractType),
        travelPaymentTypeId: pickLookupId(em.travelPaymentTypeId, em.travelPaymentType),
        baseLocationIds: (() => {
          const fromJoin =
            em.baseLocations
              ?.map((row) => pickLookupId(null, row.location))
              .filter((id) => id.length > 0) ?? []
          if (fromJoin.length > 0) return [...new Set(fromJoin)]
          const legacy = pickLookupId(em.baseLocationId, em.baseLocation)
          return legacy ? [legacy] : []
        })(),
        startDate: isoToDateInput(em.startDate ?? undefined),
        endDate: isoToDateInput(em.endDate ?? undefined),
        nationalInsuranceNo: em.nationalInsuranceNo ?? '',
        nmcPinNumber: em.nmcPinNumber ?? '',
        employeeNumber: em.employeeNumber ?? '',
        payrollNumber: em.payrollNumber ?? '',
        accessAllZones: Boolean(em.accessAllZones),
        visaTypeId: em.visaTypeId ?? '',
        isInCountry: em.isInCountry !== false,
        contractedWeeklyHours: numToInput(em.contractedWeeklyHours),
        maximumWeeklyHours: numToInput(em.maximumWeeklyHours),
        minimumWeeklyHours: numToInput(em.minimumWeeklyHours),
        weeklyHoursCapOverride: numToInput(
          (em as { weeklyHoursCapOverride?: unknown }).weeklyHoursCapOverride,
        ),
        weeklyHoursCapOverrideReason:
          (em as { weeklyHoursCapOverrideReason?: string | null }).weeklyHoursCapOverrideReason ??
          '',
        weeklyHoursCapOverrideExpiresAt: isoToDateInput(
          (em as { weeklyHoursCapOverrideExpiresAt?: string | null }).weeklyHoursCapOverrideExpiresAt,
        ),
        optedOutOf48Hours: Boolean(em.optedOutOf48Hours),
        isAgencyStaff: Boolean(em.isAgencyStaff),
        agencyName: em.agencyName ?? '',
        agencyRating: em.agencyRating ?? '',
        isPreferredAgency: Boolean(em.isPreferredAgency),
        isBlacklisted: Boolean(em.isBlacklisted),
        dailyRate: numToInput(em.dailyRate),
        hourlyDayRate: numToInput(em.hourlyDayRate),
        hourlyNightRate: numToInput(em.hourlyNightRate),
      }
    : {}

  return { ...defaults, ...personal, ...employment }
}
