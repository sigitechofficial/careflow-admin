import type { EmployeeVisaType } from '@/features/settings/types'

export const DEFAULT_EMPLOYEE_VISA_TYPES: EmployeeVisaType[] = [
  { id: 'full_time', label: 'Full time visa', weeklyHours: 40 },
  { id: 'student', label: 'Student visa', weeklyHours: 20 },
]

export function resolveEmployeeVisaTypes(types: EmployeeVisaType[] | undefined): EmployeeVisaType[] {
  return types?.length ? types : DEFAULT_EMPLOYEE_VISA_TYPES
}

export function weeklyHoursForVisaType(
  types: EmployeeVisaType[],
  visaTypeId: string | undefined,
): number | undefined {
  if (!visaTypeId) return undefined
  return types.find(t => t.id === visaTypeId)?.weeklyHours
}
