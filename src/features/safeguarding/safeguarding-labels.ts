import type {
  Capacity,
  MeetingHeld,
  PersonSafe,
  SafeguardingAction,
  SafeguardingCategory,
  SafeguardingReferralDecision,
  SafeguardingRisk,
  SafeguardingStatus,
} from '@/features/safeguarding/types/safeguarding.types'

export const STATUS_LABELS: Record<SafeguardingStatus, string> = {
  RAISED: 'Raised',
  SCREENING: 'Screening',
  INVESTIGATING: 'Investigating',
  REFERRED: 'Referred',
  CLOSED: 'Closed',
}

/** Ordered lifecycle for the stepper. */
export const STATUS_STEPS: SafeguardingStatus[] = [
  'RAISED',
  'SCREENING',
  'INVESTIGATING',
  'REFERRED',
  'CLOSED',
]

export const RISK_LABELS: Record<SafeguardingRisk, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const RISK_CLASS: Record<SafeguardingRisk, string> = {
  LOW: 'bg-emerald-100 text-emerald-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-800',
}

export const STATUS_CLASS: Record<SafeguardingStatus, string> = {
  RAISED: 'bg-sky-100 text-sky-800',
  SCREENING: 'bg-indigo-100 text-indigo-800',
  INVESTIGATING: 'bg-amber-100 text-amber-800',
  REFERRED: 'bg-violet-100 text-violet-800',
  CLOSED: 'bg-muted text-muted-foreground',
}

export const CATEGORY_LABELS: Record<SafeguardingCategory, string> = {
  PHYSICAL: 'Physical',
  EMOTIONAL: 'Emotional / Psychological',
  SEXUAL: 'Sexual',
  FINANCIAL: 'Financial / Material',
  NEGLECT: 'Neglect & Acts of Omission',
  SELF_NEGLECT: 'Self-Neglect',
  DISCRIMINATORY: 'Discriminatory',
  ORGANISATIONAL: 'Organisational',
  DOMESTIC_ABUSE: 'Domestic Abuse',
  MODERN_SLAVERY: 'Modern Slavery',
  OTHER: 'Other / Under investigation',
}

export const REFERRAL_LABELS: Record<SafeguardingReferralDecision, string> = {
  NOT_REQUIRED: 'Not required',
  PENDING: 'Pending',
  MADE: 'Made',
}

export const ACTION_LABELS: Record<SafeguardingAction, string> = {
  SCREEN: 'Screen',
  START_INVESTIGATION: 'Start investigation',
  REFER: 'Refer to LA',
  CLOSE: 'Close',
  REOPEN: 'Reopen',
}

/** Which workflow actions are offered from a given status (mirrors the server). */
export function availableActions(status: SafeguardingStatus): SafeguardingAction[] {
  switch (status) {
    case 'RAISED':
      return ['SCREEN', 'START_INVESTIGATION', 'CLOSE']
    case 'SCREENING':
      return ['START_INVESTIGATION', 'REFER', 'CLOSE']
    case 'INVESTIGATING':
      return ['REFER', 'CLOSE']
    case 'REFERRED':
      return ['CLOSE']
    case 'CLOSED':
      return ['REOPEN']
    default:
      return []
  }
}

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as SafeguardingCategory[]
export const RISK_OPTIONS = Object.keys(RISK_LABELS) as SafeguardingRisk[]
export const REFERRAL_OPTIONS = Object.keys(REFERRAL_LABELS) as SafeguardingReferralDecision[]

export const PERSON_SAFE_LABELS: Record<PersonSafe, string> = {
  YES: 'Yes',
  NO: 'No',
  NOT_KNOWN: 'Not known',
}

export const CAPACITY_LABELS: Record<Capacity, string> = {
  YES: 'Yes, has capacity',
  NO: 'No, lacks capacity',
  FLUCTUATING: 'Fluctuating',
  NOT_ASSESSED: 'Not assessed yet',
}

export const MEETING_LABELS: Record<MeetingHeld, string> = {
  YES: 'Yes',
  NO: 'No',
  PLANNED: 'Planned',
}

/** Agencies commonly involved in a safeguarding enquiry (from the reference case record). */
export const AGENCIES = [
  'CQC',
  'Police',
  'GP',
  'Social Worker',
  'Local Authority safeguarding team',
  'District / community nurse',
  'Advocate',
  'Family / representative',
  'Commissioner',
] as const

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '—')
export const fmtDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—')
