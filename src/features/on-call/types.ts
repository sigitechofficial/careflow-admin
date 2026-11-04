/** On-call rota and out-of-hours calls (Operations › On-call). */

export type OnCallTier = 'FIRST_LINE' | 'SECOND_LINE'
export type OnCallCallerType = 'CARER' | 'SERVICE_USER' | 'FAMILY' | 'PROFESSIONAL' | 'OTHER'
export type OnCallCallCategory =
  | 'CARER_SICKNESS'
  | 'LATE_OR_MISSED_VISIT'
  | 'ACCESS_PROBLEM'
  | 'SERVICE_USER_UNWELL'
  | 'MEDICATION'
  | 'CONCERN_OR_COMPLAINT'
  | 'OTHER'
export type OnCallCallStatus = 'OPEN' | 'CLOSED'

export type OnCallShiftRow = {
  id: string
  employeeId: string
  employeeName: string | null
  locationId: string | null
  locationName: string | null
  tier: OnCallTier
  startsAt: string
  endsAt: string
  notes: string | null
}

export type OnCallShiftInput = {
  employeeId: string
  /** null (on change) = covers every branch. */
  locationId?: string | null
  tier: OnCallTier
  startsAt: string
  endsAt: string
  notes?: string
}

export type OnCallCallRow = {
  id: string
  receivedAt: string
  takenByName: string | null
  callerType: OnCallCallerType
  callerName: string
  callerPhone: string | null
  callerEmployeeId: string | null
  callerEmployeeName: string | null
  serviceUserId: string | null
  serviceUserName: string | null
  locationId: string | null
  locationName: string | null
  category: OnCallCallCategory
  summary: string
  actionTaken: string | null
  followUpRequired: boolean
  status: OnCallCallStatus
  closedAt: string | null
  closedByName: string | null
  closingNote: string | null
}

export type OnCallCallInput = {
  receivedAt: string
  callerType: OnCallCallerType
  callerName: string
  callerPhone?: string | null
  callerEmployeeId?: string | null
  serviceUserId?: string | null
  locationId?: string | null
  category: OnCallCallCategory
  summary: string
  actionTaken?: string | null
  followUpRequired?: boolean
}

export const TIER_LABEL: Record<OnCallTier, string> = {
  FIRST_LINE: 'First line',
  SECOND_LINE: 'Second line (escalation)',
}

export const CALLER_TYPE_LABEL: Record<OnCallCallerType, string> = {
  CARER: 'Carer',
  SERVICE_USER: 'Service user',
  FAMILY: 'Family / representative',
  PROFESSIONAL: 'Professional (GP, hospital, nurse…)',
  OTHER: 'Other',
}

export const CATEGORY_LABEL: Record<OnCallCallCategory, string> = {
  CARER_SICKNESS: 'Carer sickness / can’t work',
  LATE_OR_MISSED_VISIT: 'Late or missed visit',
  ACCESS_PROBLEM: 'Can’t get into the home',
  SERVICE_USER_UNWELL: 'Service user unwell',
  MEDICATION: 'Medication',
  CONCERN_OR_COMPLAINT: 'Concern or complaint',
  OTHER: 'Other',
}
