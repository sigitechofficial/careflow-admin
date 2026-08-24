import type { CarePlanDraftValues } from './care-plan-draft-storage'

export type CarePlanReviewStatus = 'Active' | 'Monitor' | 'Inactive'

export type CarePlanRiskItem = {
  id: string
  name: string
}

export type CarePlanActionRow = {
  id: string
  actionName: string
  designation: string
  frequency: string
}

export type CarePlanHistoryRow = {
  id: string
  date: string
  time: string
  event: string
  action: string
  employee: string
  checklist: string
}

export const CARE_PLAN_META = {
  reviewStatus: '__meta.reviewStatus',
  reviewSummary: '__meta.reviewSummary',
  carePlanSummary: '__meta.carePlanSummary',
  consentName: '__meta.consentName',
  consentNote: '__meta.consentNote',
  signature: '__meta.signature',
  dependencyLevel: '__meta.dependencyLevel',
  nextReviewDate: '__meta.nextReviewDate',
  blisterPack: '__meta.blisterPack',
  anyNotes: '__meta.anyNotes',
  medicationList: '__meta.medicationList',
  published: '__meta.published',
  riskItems: '__meta.riskItems',
  assessmentTitle: '__meta.assessmentTitle',
  consentCapacityNotes: '__meta.consentCapacityNotes',
} as const

export function metaString(values: CarePlanDraftValues, key: string, fallback = ''): string {
  const v = values[key]
  return typeof v === 'string' ? v : fallback
}

export function metaBool(values: CarePlanDraftValues, key: string): boolean {
  const v = values[key]
  return v === true || v === 'true'
}

export function setMetaValue(
  values: CarePlanDraftValues,
  key: string,
  next: string | boolean,
): CarePlanDraftValues {
  return { ...values, [key]: next }
}

export function parseRiskItems(values: CarePlanDraftValues): CarePlanRiskItem[] {
  try {
    const raw = metaString(values, CARE_PLAN_META.riskItems)
    if (!raw) return DEFAULT_RISK_ITEMS
    const parsed = JSON.parse(raw) as CarePlanRiskItem[]
    return Array.isArray(parsed) ? parsed : DEFAULT_RISK_ITEMS
  } catch {
    return DEFAULT_RISK_ITEMS
  }
}

export function serializeRiskItems(items: CarePlanRiskItem[]): string {
  return JSON.stringify(items)
}

export const DEFAULT_RISK_ITEMS: CarePlanRiskItem[] = [
  { id: 'bleeding', name: 'Bleeding Risk' },
  { id: 'diabetes', name: 'Diabetes Risk' },
  { id: 'missed-medication', name: 'Missed medication' },
]

export const DEFAULT_CARE_ACTIONS: CarePlanActionRow[] = [
  {
    id: '1',
    actionName: 'Lunch Visit',
    designation: '',
    frequency: 'Daily',
  },
]

export const DEFAULT_CARE_HISTORY: CarePlanHistoryRow[] = [
  {
    id: '1',
    date: '03/06/2026',
    time: '12:18',
    event: 'Completed Action',
    action: 'Lunch Visit',
    employee: 'Moeisha Stevens',
    checklist: 'I consent to all ca...',
  },
  {
    id: '2',
    date: '02/06/2026',
    time: '12:15',
    event: 'Completed Action',
    action: 'Lunch Visit',
    employee: 'Jodan Purcell',
    checklist: 'I consent to all ca...',
  },
]

export const DEPENDENCY_LEVEL_OPTIONS = [
  'Independent',
  'Minimal assistance and prompting',
  'Moderate assistance',
  'Full assistance',
  'Total dependence',
] as const

export const REVIEW_SUMMARY_PLACEHOLDER = 'Enter review summary'
export const CARE_PLAN_SUMMARY_PLACEHOLDER = 'Enter care plan summary'

export function defaultReviewSummary(_serviceUserName?: string): string {
  return ''
}

export function defaultCarePlanSummary(_serviceUserName?: string): string {
  return ''
}

export function defaultAssessmentGuidance(): string {
  return `Assess the service user's capacity to manage their own medication safely. Level 0 — independent; Level 1 — prompting or supervision; Level 2 — full administration by a trained carer or nurse.

Ask whether they know what each medicine is for, when to take it, and what to do if a dose is missed. Confirm GP and pharmacy details, dispensing method (blister pack, dosette, original packaging), and storage arrangements.

Document any refusal, side effects, or PRN use. Refer to the 6 R's: Right person, Right medicine, Right route, Right time, Right dose, Right to refuse.`
}
