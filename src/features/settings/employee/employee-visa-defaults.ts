import type { EmployeeVisaType } from '@/features/settings/types'

/** Keep in sync with careflow-api prisma/seed-data/employee-visa-catalog.ts */
export const DEFAULT_EMPLOYEE_VISA_TYPES: EmployeeVisaType[] = [
  { id: 'british_citizen', label: 'British citizen', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'irish_citizen', label: 'Irish citizen', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'settled_status', label: 'Settled status / ILR', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'pre_settled_euss', label: 'Pre-settled status (EUSS)', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'skilled_worker', label: 'Skilled Worker', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'health_care_worker', label: 'Health and Care Worker', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'student_visa', label: 'Student visa', maxWeeklyHours: 20, defaultContractedHours: 20 },
  {
    id: 'student_visa_sub_degree',
    label: 'Student visa (sub-degree course)',
    maxWeeklyHours: 10,
    defaultContractedHours: 10,
  },
  { id: 'graduate_visa', label: 'Graduate visa', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'dependent_family', label: 'Dependent / family visa', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'other_time_limited', label: 'Other time-limited leave', maxWeeklyHours: 40, defaultContractedHours: null },
  { id: 'not_applicable', label: 'Not applicable', maxWeeklyHours: 40, defaultContractedHours: null },
]

export function resolveEmployeeVisaTypes(types: EmployeeVisaType[] | undefined): EmployeeVisaType[] {
  return types?.length ? types : DEFAULT_EMPLOYEE_VISA_TYPES
}

export function maxWeeklyHoursForVisaType(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
): number | undefined {
  if (!visaTypeId) return undefined
  const row = types.find(t => t.id === visaTypeId)
  return row?.maxWeeklyHours ?? (row as { weeklyHours?: number } | undefined)?.weeklyHours
}

export function defaultContractedHoursForVisaType(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
): number | undefined {
  if (!visaTypeId) return undefined
  const row = types.find(t => t.id === visaTypeId)
  if (row?.defaultContractedHours == null) return undefined
  return row.defaultContractedHours
}

/** @deprecated Use maxWeeklyHoursForVisaType */
export function weeklyHoursForVisaType(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
): number | undefined {
  return maxWeeklyHoursForVisaType(types, visaTypeId)
}

export function labelForVisaType(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
): string | undefined {
  if (!visaTypeId) return undefined
  return types.find(t => t.id === visaTypeId)?.label
}

export function visaTypeAutoFillsContractedHours(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
): boolean {
  return defaultContractedHoursForVisaType(types, visaTypeId) != null
}

export function isBuiltInVisaTypeId(id: string): boolean {
  return DEFAULT_EMPLOYEE_VISA_TYPES.some(t => t.id === id)
}

export type WeeklyHoursCapOverride = {
  weeklyHoursCapOverride?: number | string | null
  weeklyHoursCapOverrideReason?: string | null
  weeklyHoursCapOverrideExpiresAt?: string | Date | null
}

function parseCapOverrideValue(raw: number | string | null | undefined): number | undefined {
  if (raw == null || raw === '') return undefined
  const value = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export function isWeeklyHoursCapOverrideActive(
  override: WeeklyHoursCapOverride | null | undefined,
  at: Date = new Date(),
): boolean {
  const cap = parseCapOverrideValue(override?.weeklyHoursCapOverride ?? null)
  if (cap == null) return false
  const expiresRaw = override?.weeklyHoursCapOverrideExpiresAt
  if (expiresRaw) {
    const d = expiresRaw instanceof Date ? expiresRaw : new Date(expiresRaw)
    if (!Number.isNaN(d.getTime()) && d < at) return false
  }
  return true
}

export function effectiveWeeklyHoursCap(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
  override?: WeeklyHoursCapOverride | null,
  at: Date = new Date(),
): number | undefined {
  if (isWeeklyHoursCapOverrideActive(override, at)) {
    return parseCapOverrideValue(override!.weeklyHoursCapOverride ?? null)
  }
  return maxWeeklyHoursForVisaType(types, visaTypeId)
}

export function employmentHoursVisaError(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
  hours: {
    contractedWeeklyHours?: string | number | null
    maximumWeeklyHours?: string | number | null
  },
  override?: WeeklyHoursCapOverride | null,
  at: Date = new Date(),
): string | null {
  if (!visaTypeId) return null
  const cap = effectiveWeeklyHoursCap(types, visaTypeId, override, at)
  if (cap == null) return null
  const label = labelForVisaType(types, visaTypeId) ?? visaTypeId
  const overrideActive = isWeeklyHoursCapOverrideActive(override, at)
  for (const [field, raw] of [
    ['Contracted weekly hours', hours.contractedWeeklyHours],
    ['Maximum weekly hours', hours.maximumWeeklyHours],
  ] as const) {
    if (raw == null || raw === '') continue
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(value) && value > cap) {
      const capNote = overrideActive
        ? `${cap}h/week approved override`
        : `${cap}h/week allowed limit for "${label}"`
      return `${field} (${value}h) exceeds the ${capNote}.`
    }
  }
  return null
}

export function normalizeVisaTypeRow(row: EmployeeVisaType & { weeklyHours?: number }): EmployeeVisaType {
  return {
    id: row.id,
    label: row.label,
    maxWeeklyHours: row.maxWeeklyHours ?? row.weeklyHours ?? 40,
    defaultContractedHours: row.defaultContractedHours ?? null,
  }
}
