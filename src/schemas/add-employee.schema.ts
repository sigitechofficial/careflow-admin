import { z } from 'zod'
import { formatPhoneForApi } from '@/features/employees/dial-codes'

const emptyToUndef = (v: unknown) => (v === '' || v === undefined || v === null ? undefined : v)

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i
const MIN_EMPLOYEE_AGE = 16
const MAX_WEEKLY_HOURS = 168

const dialCodeSchema = z.preprocess(
  v => (v === '' || v === undefined || v === null ? '+44' : String(v).trim()),
  z.string().regex(/^\+\d{1,4}$/, 'Select a valid country code')
)

const uuidOpt = z.preprocess(
  v => emptyToUndef(v),
  z.string().uuid().optional()
)

const optionalEmail = z.preprocess(
  v => emptyToUndef(v),
  z.union([z.undefined(), z.string().email('Enter a valid email')])
)

const phoneLocalOpt = z.preprocess(
  v => (v === '' || v === undefined || v === null ? undefined : String(v).replace(/\D/g, '')),
  z.union([
    z.undefined(),
    z
      .string()
      .max(20, 'Local number is too long')
      .regex(/^\d+$/, 'Enter digits only')
      .refine(s => s.length >= 6, 'Enter at least 6 digits'),
  ])
)

const optionalUkPostcode = z.preprocess(
  v => {
    const raw = emptyToUndef(v)
    return typeof raw === 'string' ? raw.trim().toUpperCase() : raw
  },
  z.union([
    z.undefined(),
    z.string().max(20).regex(UK_POSTCODE_REGEX, 'Enter a valid UK postcode'),
  ])
)

const optionalNiNumber = z.preprocess(
  v => {
    const raw = emptyToUndef(v)
    return typeof raw === 'string' ? raw.replace(/\s/g, '').toUpperCase() : raw
  },
  z.union([z.undefined(), z.string().max(30)]),
)

const optionalDateString = z.preprocess(
  v => emptyToUndef(v),
  z.union([
    z.undefined(),
    z
      .string()
      .refine(s => !Number.isNaN(Date.parse(s)), 'Invalid date'),
  ])
)

const optionalDecimal = (max: number, unit: string) =>
  z.preprocess(
    v => {
      const raw = emptyToUndef(v)
      if (raw === undefined) return undefined
      if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : undefined
      const s = String(raw).trim()
      return s === '' ? undefined : s
    },
    z.union([
      z.undefined(),
      z
        .string()
        .refine(s => /^\d+(\.\d{1,2})?$/.test(s), 'Enter a valid number')
        .refine(s => Number(s) >= 0, 'Must be zero or more')
        .refine(s => Number(s) <= max, `Cannot exceed ${max} ${unit}`),
    ])
  )

function refineDateOfBirth(v: string | undefined, ctx: z.RefinementCtx) {
  if (!v) return
  const dob = new Date(v)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (dob > today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Date of birth cannot be in the future',
      path: ['dateOfBirth'],
    })
    return
  }
  const minDob = new Date()
  minDob.setFullYear(minDob.getFullYear() - MIN_EMPLOYEE_AGE)
  if (dob > minDob) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Employee must be at least ${MIN_EMPLOYEE_AGE} years old`,
      path: ['dateOfBirth'],
    })
  }
}

function refineEmploymentDates(
  data: { startDate?: string; endDate?: string },
  ctx: z.RefinementCtx
) {
  if (!data.startDate || !data.endDate) return
  const start = Date.parse(data.startDate)
  const end = Date.parse(data.endDate)
  if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be on or after start date',
      path: ['endDate'],
    })
  }
}

function parseOptionalDecimal(v: string | number | undefined): number | undefined {
  if (v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

function refineWeeklyHours(
  data: {
    minimumWeeklyHours?: string | number
    contractedWeeklyHours?: string | number
    maximumWeeklyHours?: string | number
  },
  ctx: z.RefinementCtx
) {
  const min = parseOptionalDecimal(data.minimumWeeklyHours)
  const contracted = parseOptionalDecimal(data.contractedWeeklyHours)
  const max = parseOptionalDecimal(data.maximumWeeklyHours)
  if (min !== undefined && contracted !== undefined && min > contracted) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum cannot exceed contracted hours',
      path: ['minimumWeeklyHours'],
    })
  }
  if (contracted !== undefined && max !== undefined && contracted > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Contracted hours cannot exceed maximum',
      path: ['contractedWeeklyHours'],
    })
  }
  if (min !== undefined && max !== undefined && min > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum cannot exceed maximum hours',
      path: ['minimumWeeklyHours'],
    })
  }
}

/** Step 1 — matches backend `CreateEmployeeDto` + optional personal PATCH fields. */
export const personalStepSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    username: z
      .string()
      .trim()
      .min(1, 'Username is required')
      .max(100)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, numbers, dot, underscore, and hyphen'),
    email: optionalEmail,
    titleId: uuidOpt,
    genderId: uuidOpt,
    nationalityId: uuidOpt,
    ethnicityId: uuidOpt,
    statusId: uuidOpt,
    dateOfBirth: optionalDateString,
    addressLine1: z
      .string()
      .max(200)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    addressLine2: z
      .string()
      .max(200)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    town: z.string().max(100).optional().transform(v => emptyToUndef(v) as string | undefined),
    county: z.string().max(100).optional().transform(v => emptyToUndef(v) as string | undefined),
    country: z.string().max(100).optional().transform(v => emptyToUndef(v) as string | undefined),
    postcode: optionalUkPostcode,
    latitude: z.string().max(32).optional().transform(v => emptyToUndef(v) as string | undefined),
    longitude: z.string().max(32).optional().transform(v => emptyToUndef(v) as string | undefined),
    homeDialCode: dialCodeSchema,
    mobileDialCode: dialCodeSchema,
    homeTelephone: phoneLocalOpt,
    mobileTelephone: phoneLocalOpt,
    photoUrl: z
      .string()
      .max(512)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined)
      .refine(
        v =>
          !v ||
          /^https?:\/\//i.test(v) ||
          (v.startsWith('/uploads/') && !v.includes('..')),
        'Use a valid URL or upload a photo from this form.'
      ),
  })
  .superRefine((data, ctx) => {
    refineDateOfBirth(data.dateOfBirth, ctx)
    const home = formatPhoneForApi(data.homeDialCode, data.homeTelephone)
    const mobile = formatPhoneForApi(data.mobileDialCode, data.mobileTelephone)
    if (home && home.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Home phone with country code is too long',
        path: ['homeTelephone'],
      })
    }
    if (mobile && mobile.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile phone with country code is too long',
        path: ['mobileTelephone'],
      })
    }
  })

export type PersonalStepValues = z.infer<typeof personalStepSchema>

/** Step 2 — backend `UpdateEmployeeEmploymentDto` subset used by the form. */
export const employmentStepSchema = z
  .object({
    workAreaId: z.preprocess(
      v => emptyToUndef(v),
      z.string({ required_error: 'Select a work area' }).uuid('Select a work area')
    ),
    roleId: z.preprocess(
      v => emptyToUndef(v),
      z.string({ required_error: 'Select a role' }).uuid('Select a role')
    ),
    locationId: z.preprocess(
      v => emptyToUndef(v),
      z.string({ required_error: 'Select at least one branch' }).uuid('Select at least one branch')
    ),
    jobTitleId: uuidOpt,
    rbacLevelId: uuidOpt,
    gradeId: uuidOpt,
    contractTypeId: uuidOpt,
    travelPaymentTypeId: uuidOpt,
    baseLocationIds: z.array(z.string().uuid()).optional().default([]),
    zoneIds: z.array(z.string()).optional().default([]),
    serviceUserAreaIds: z.array(z.string().uuid()).optional().default([]),
    startDate: optionalDateString,
    endDate: optionalDateString,
    nationalInsuranceNo: optionalNiNumber,
    nmcPinNumber: z
      .string()
      .max(30)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    employeeNumber: z
      .string()
      .max(50)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    payrollNumber: z
      .string()
      .max(50)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    accessAllZones: z.boolean(),
    visaTypeId: z
      .string()
      .max(64)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    isInCountry: z.boolean(),
    contractedWeeklyHours: optionalDecimal(MAX_WEEKLY_HOURS, 'hours per week'),
    maximumWeeklyHours: optionalDecimal(MAX_WEEKLY_HOURS, 'hours per week'),
    minimumWeeklyHours: optionalDecimal(MAX_WEEKLY_HOURS, 'hours per week'),
    weeklyHoursCapOverride: optionalDecimal(MAX_WEEKLY_HOURS, 'hours per week'),
    weeklyHoursCapOverrideReason: z
      .string()
      .max(500)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    weeklyHoursCapOverrideExpiresAt: z
      .string()
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    optedOutOf48Hours: z.boolean(),
    isAgencyStaff: z.boolean(),
    agencyName: z
      .string()
      .max(120)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    agencyRating: z
      .string()
      .max(50)
      .optional()
      .transform(v => emptyToUndef(v) as string | undefined),
    isPreferredAgency: z.boolean(),
    isBlacklisted: z.boolean(),
    dailyRate: optionalDecimal(10_000, 'per day'),
    hourlyDayRate: optionalDecimal(1_000, 'per hour'),
    hourlyNightRate: optionalDecimal(1_000, 'per hour'),
  })
  .superRefine((data, ctx) => {
    refineEmploymentDates(data, ctx)
    refineWeeklyHours(data, ctx)
    const capOverride = parseOptionalDecimal(data.weeklyHoursCapOverride)
    if (capOverride !== undefined) {
      if (!data.weeklyHoursCapOverrideReason?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Reason is required when approving extra weekly hours',
          path: ['weeklyHoursCapOverrideReason'],
        })
      }
    }
    if (data.isAgencyStaff && !data.agencyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agency name is required',
        path: ['agencyName'],
      })
    }
  })

export type EmploymentStepValues = z.infer<typeof employmentStepSchema>

/** Working-pattern tab — no field validation in this wizard step. */
export const employeeWizardPassthroughSchema = z.object({}).passthrough()

export type EmployeeWizardStepId = 'personal' | 'employment' | 'working-pattern'

export function resolveEmployeeWizardSchema(step: EmployeeWizardStepId) {
  if (step === 'employment') return employmentStepSchema
  if (step === 'personal') return personalStepSchema
  return employeeWizardPassthroughSchema
}
