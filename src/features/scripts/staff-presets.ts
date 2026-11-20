/**
 * Staff Creation presets: the kinds of staff the Scripts page can create, by lookup NAME (matched case-insensitively
 * against Settings → Lookup data when the run starts, so they work on any database that has these lookups).
 */
import type { WorkingPatternDay } from '@/features/employees/api/employees.api'

export type StaffPresetId = 'carer' | 'senior-carer' | 'care-coordinator' | 'office-manager' | 'hr'

/** What they can sign in to. `officeRole`: an office login made in Office users with this role (not from an RBAC level). */
export type PresetSignIn = { website: boolean; app: boolean; officeRole?: string }

export type StaffPreset = {
  id: StaffPresetId
  label: string
  /** Used in generated names and usernames: "Test Carer 01", test.carer.01. */
  nameWord: string
  jobTitle: string
  role: string
  workArea: string
  /** Empty: no RBAC level (their office access comes from `signIn.officeRole`). */
  rbacLevel: string | null
  contractType: string
  travelPaymentType: string | null
  contractedWeeklyHours: number
  signIn: PresetSignIn
  /** Weekdays they are available, with the same hours each day. */
  pattern: { days: WorkingPatternDay[]; start: string; end: string }
  /** Skill names added when "Add skills" is on; names missing from Settings → Skill types are skipped. */
  skills: string[]
  summary: string
}

const EVERY_DAY: WorkingPatternDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const WEEKDAYS: WorkingPatternDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
const CARE_SKILLS = ['Manual Handling', 'Medication Competency', 'Safeguarding Adults', 'Food hygiene', 'Infection control']

export const STAFF_PRESETS: StaffPreset[] = [
  {
    id: 'carer',
    label: 'Carer',
    nameWord: 'Carer',
    jobTitle: 'Carer',
    role: 'Carer',
    workArea: 'Care',
    rbacLevel: 'Carer/Domestic',
    contractType: 'Hourly paid',
    travelPaymentType: 'Driver',
    contractedWeeklyHours: 30,
    signIn: { website: false, app: true },
    pattern: { days: EVERY_DAY, start: '07:00', end: '22:00' },
    skills: CARE_SKILLS,
    summary: 'Care app sign-in, available every day 07:00–22:00, ready for Visit Creation.',
  },
  {
    id: 'senior-carer',
    label: 'Senior Carer',
    nameWord: 'Senior',
    jobTitle: 'Senior Carer',
    role: 'Senior Carer',
    workArea: 'Care',
    rbacLevel: 'Senior Carer/Nurse',
    contractType: 'Hourly paid',
    travelPaymentType: 'Driver',
    contractedWeeklyHours: 35,
    signIn: { website: false, app: true },
    pattern: { days: EVERY_DAY, start: '07:00', end: '22:00' },
    skills: [...CARE_SKILLS, 'Pressure area care', 'Catheter care'],
    summary: 'Care app sign-in, available every day 07:00–22:00.',
  },
  {
    id: 'care-coordinator',
    label: 'Care Coordinator',
    nameWord: 'Coordinator',
    jobTitle: 'Allocator Coordinator',
    role: 'Care Coordinator',
    workArea: 'Administration',
    rbacLevel: 'Staff Allocation',
    contractType: 'Salaried',
    travelPaymentType: null,
    contractedWeeklyHours: 37.5,
    signIn: { website: true, app: true },
    pattern: { days: WEEKDAYS, start: '09:00', end: '17:00' },
    skills: ['Safeguarding Adults', 'GDPR'],
    summary: 'Office login (Staff Allocation level) and the Care app, one password. Mon–Fri 09:00–17:00.',
  },
  {
    id: 'office-manager',
    label: 'Office Manager',
    nameWord: 'Manager',
    jobTitle: 'Office Manager',
    role: 'Office Manager',
    workArea: 'Administration',
    rbacLevel: 'Manager',
    contractType: 'Salaried',
    travelPaymentType: null,
    contractedWeeklyHours: 37.5,
    signIn: { website: true, app: false },
    pattern: { days: WEEKDAYS, start: '09:00', end: '17:00' },
    skills: ['Safeguarding Adults', 'GDPR'],
    summary: 'Office login at the Manager level. Mon–Fri 09:00–17:00.',
  },
  {
    id: 'hr',
    label: 'HR',
    nameWord: 'HR',
    jobTitle: 'Human Resources',
    role: 'Office Administrator',
    workArea: 'Administration',
    rbacLevel: null,
    contractType: 'Salaried',
    travelPaymentType: null,
    contractedWeeklyHours: 37.5,
    signIn: { website: true, app: false, officeRole: 'HR' },
    pattern: { days: WEEKDAYS, start: '09:00', end: '17:00' },
    skills: ['GDPR'],
    summary: 'Office login with the HR role (made as Office users does), linked to the staff record by email. Mon–Fri 09:00–17:00.',
  },
]

export function presetById(id: StaffPresetId): StaffPreset {
  const p = STAFF_PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`Unknown staff preset "${id}"`)
  return p
}

/** Test addresses (Croydon area) with coordinates, so travel and distances work without looking them up. */
export const TEST_ADDRESSES = [
  { addressLine1: '1 Katharine Street', town: 'Croydon', postcode: 'CR0 1NX', latitude: 51.3722, longitude: -0.0996 },
  { addressLine1: '24 Lower Addiscombe Road', town: 'Croydon', postcode: 'CR0 6AA', latitude: 51.3784, longitude: -0.0858 },
  { addressLine1: '110 Brighton Road', town: 'South Croydon', postcode: 'CR2 6AA', latitude: 51.3561, longitude: -0.0978 },
  { addressLine1: '35 Thornton Road', town: 'Thornton Heath', postcode: 'CR7 6BA', latitude: 51.3941, longitude: -0.1119 },
  { addressLine1: '8 London Road', town: 'Croydon', postcode: 'CR0 2TA', latitude: 51.3807, longitude: -0.1057 },
  { addressLine1: '52 Selsdon Road', town: 'South Croydon', postcode: 'CR2 6PB', latitude: 51.3618, longitude: -0.0938 },
] as const

/** Generated test emails go to this reserved domain, which can never receive mail. */
export const TEST_EMAIL_DOMAIN = 'careflow.test'
