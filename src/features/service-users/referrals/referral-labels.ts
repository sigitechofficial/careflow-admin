import type {
  CareQuotationStatus,
  QuotationChargeFrequency,
  QuotationPayerType,
  ReferralPriority,
  ReferralReceivedVia,
  ReferralSourceType,
  ReferralStatus,
} from '@/features/service-users/referrals/referral-types'

export const REFERRAL_SOURCE_LABEL: Record<ReferralSourceType, string> = {
  LOCAL_AUTHORITY: 'Local Authority',
  NHS: 'NHS (CHC / community)',
  HOSPITAL: 'Hospital (discharge)',
  SOCIAL_WORKER: 'Social worker',
  GP: 'GP / primary care',
  PRIVATE: 'Private enquiry',
  FAMILY: 'Family / next of kin',
  SELF_REFERRAL: 'Self-referral',
  OTHER: 'Other',
}

export const REFERRAL_VIA_LABEL: Record<ReferralReceivedVia, string> = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  PORTAL: 'Portal / online',
  IN_PERSON: 'In person',
  LETTER: 'Letter / post',
  OTHER: 'Other',
}

export const REFERRAL_PRIORITY_LABEL: Record<ReferralPriority, string> = {
  ROUTINE: 'Routine',
  URGENT: 'Urgent',
  EMERGENCY: 'Emergency / same day',
}

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under review',
  ASSESSMENT_BOOKED: 'Assessment booked',
  ON_HOLD: 'On hold',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn',
}

export const QUOTATION_STATUS_LABEL: Record<CareQuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  SUPERSEDED: 'Superseded',
}

export const PAYER_TYPE_LABEL: Record<QuotationPayerType, string> = {
  SERVICE_USER: 'Service user (self-funded)',
  FAMILY: 'Family member',
  REPRESENTATIVE: 'Representative / attorney',
  OTHER: 'Other',
}

export const CHARGE_FREQUENCY_LABEL: Record<QuotationChargeFrequency, string> = {
  ONE_OFF: 'One-off',
  WEEKLY: 'Per week',
  MONTHLY: 'Per month',
}

export const DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

export const ACCEPTANCE_METHODS = ['Signed agreement', 'Email', 'Verbal (phone)', 'In person', 'Portal']

export const REFERRAL_EVENT_LABEL: Record<string, string> = {
  RECORDED: 'Referral recorded',
  UPDATED: 'Referral details changed',
  ASSIGNED: 'Assignment changed',
  STATUS_CHANGED: 'Status changed',
  FOLLOW_UP: 'Follow-up',
  NOTE: 'Note',
  LEGACY_IMPORTED: 'Imported from earlier referral fields',
  QUOTE_CREATED: 'Quotation created',
  QUOTE_UPDATED: 'Quotation changed',
  QUOTE_SENT: 'Quotation sent',
  QUOTE_ACCEPTED: 'Quotation accepted',
  QUOTE_DECLINED: 'Quotation declined',
  QUOTE_WITHDRAWN: 'Quotation withdrawn',
  QUOTE_REVISED: 'Quotation revised',
}

export function referralStatusVariant(s: ReferralStatus) {
  if (s === 'ACCEPTED') return 'success' as const
  if (s === 'DECLINED' || s === 'WITHDRAWN') return 'muted' as const
  if (s === 'NEW') return 'warning' as const
  return 'info' as const
}

export function priorityVariant(p: ReferralPriority) {
  if (p === 'EMERGENCY') return 'destructive' as const
  if (p === 'URGENT') return 'warning' as const
  return 'muted' as const
}

export function quotationStatusVariant(s: CareQuotationStatus) {
  if (s === 'ACCEPTED') return 'success' as const
  if (s === 'SENT') return 'info' as const
  if (s === 'DRAFT') return 'warning' as const
  return 'muted' as const
}

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
export function formatGbp(n: number | null | undefined): string {
  return n == null ? '—' : gbp.format(n)
}

/** Same maths as the server (referral-workflow.util) for live totals while editing. */
export function lineWeekly(l: { visitsPerWeek: number; durationMinutes: number; numberOfCarers: number; hourlyRate: number }) {
  const hours = (l.visitsPerWeek * l.durationMinutes * l.numberOfCarers) / 60
  return { hours: Math.round(hours * 100) / 100, cost: Math.round(hours * l.hourlyRate * 100) / 100 }
}

export const WEEKS_PER_MONTH = 52 / 12
