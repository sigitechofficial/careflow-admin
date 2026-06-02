import { z } from 'zod'
import { formatPhoneForApi } from '@/features/employees/dial-codes'

const emptyToUndef = (v: unknown) => (v === '' || v === undefined || v === null ? undefined : v)

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

/** Step 1 — matches backend `CreateEmployeeDto` + optional personal PATCH fields. */
export const personalStepSchema = z.object({
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
  statusId: uuidOpt,
  dateOfBirth: z
    .string()
    .optional()
    .transform(v => emptyToUndef(v) as string | undefined)
    .refine(v => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
  addressLine1: z.string().max(200).optional().transform(v => emptyToUndef(v) as string | undefined),
  addressLine2: z.string().max(200).optional().transform(v => emptyToUndef(v) as string | undefined),
  town: z.string().max(100).optional().transform(v => emptyToUndef(v) as string | undefined),
  country: z.string().max(100).optional().transform(v => emptyToUndef(v) as string | undefined),
  postcode: z.string().max(20).optional().transform(v => emptyToUndef(v) as string | undefined),
  homeDialCode: dialCodeSchema,
  mobileDialCode: dialCodeSchema,
  homeTelephone: z.preprocess(
    v => (v === '' || v === undefined || v === null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(20, 'Local number is too long')])
  ),
  mobileTelephone: z.preprocess(
    v => (v === '' || v === undefined || v === null ? undefined : String(v).trim()),
    z.union([z.undefined(), z.string().max(20, 'Local number is too long')])
  ),
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
      'Use a valid URL or upload a photo from this form.',
    ),
})
  .superRefine((data, ctx) => {
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

const numOpt = z.preprocess(v => {
  if (v === '' || v === undefined || v === null) return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isNaN(n) ? undefined : n
}, z.number().nonnegative().optional())

/** Step 2 — backend `UpdateEmployeeEmploymentDto` subset used by the form. */
export const employmentStepSchema = z.object({
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
    z.string({ required_error: 'Select a location' }).uuid('Select a location')
  ),
  jobTitleId: uuidOpt,
  rbacLevelId: uuidOpt,
  gradeId: uuidOpt,
  contractTypeId: uuidOpt,
  travelPaymentTypeId: uuidOpt,
  baseLocationId: uuidOpt,
  startDate: z
    .string()
    .optional()
    .transform(v => emptyToUndef(v) as string | undefined)
    .refine(v => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
  endDate: z
    .string()
    .optional()
    .transform(v => emptyToUndef(v) as string | undefined)
    .refine(v => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
  nationalInsuranceNo: z.string().max(30).optional().transform(v => emptyToUndef(v) as string | undefined),
  nmcPinNumber: z.string().max(30).optional().transform(v => emptyToUndef(v) as string | undefined),
  employeeNumber: z.string().max(50).optional().transform(v => emptyToUndef(v) as string | undefined),
  payrollNumber: z.string().max(50).optional().transform(v => emptyToUndef(v) as string | undefined),
  accessAllZones: z.boolean(),
  contractedWeeklyHours: numOpt,
  maximumWeeklyHours: numOpt,
  minimumWeeklyHours: numOpt,
  optedOutOf48Hours: z.boolean(),
  isAgencyStaff: z.boolean(),
  agencyName: z.string().max(120).optional().transform(v => emptyToUndef(v) as string | undefined),
  agencyRating: z.string().max(50).optional().transform(v => emptyToUndef(v) as string | undefined),
  isPreferredAgency: z.boolean(),
  isBlacklisted: z.boolean(),
  dailyRate: numOpt,
  hourlyDayRate: numOpt,
  hourlyNightRate: numOpt,
})

export type EmploymentStepValues = z.infer<typeof employmentStepSchema>
