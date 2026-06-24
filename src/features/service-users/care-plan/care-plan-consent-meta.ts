import type { CarePlanDraftValues } from './care-plan-draft-storage'
import { metaString, setMetaValue } from './care-plan-form-meta'
import { formatOrganisationDate, formatOrganisationTime } from '@/shared/lib/organisation-display-format.store'

export const CARE_PLAN_CONSENT_META = {
  records: '__meta.consentRecords',
  showClosed: '__meta.consentShowClosed',
} as const

export type CarePlanConsentCategory = {
  id: string
  name: string
}

/** Legacy consent categories (CareFlow). */
export const DEFAULT_CONSENT_CATEGORIES: CarePlanConsentCategory[] = [
  { id: '1', name: 'Day to Day Care' },
  { id: '9', name: 'GDPR/Information Sharing' },
  { id: '3', name: 'Medication' },
]

export type CarePlanConsentRecord = {
  id: string
  categoryId: string
  reason: string
  dateCreated: string
  status: 'Open' | 'Closed'
  outcome: string
  recordedBy: string
}

export function parseConsentRecords(values: CarePlanDraftValues): CarePlanConsentRecord[] {
  try {
    const raw = metaString(values, CARE_PLAN_CONSENT_META.records)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CarePlanConsentRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function serializeConsentRecords(records: CarePlanConsentRecord[]): string {
  return JSON.stringify(records)
}

export function setConsentRecords(
  values: CarePlanDraftValues,
  records: CarePlanConsentRecord[],
): CarePlanDraftValues {
  return setMetaValue(values, CARE_PLAN_CONSENT_META.records, serializeConsentRecords(records))
}

export function consentShowClosed(values: CarePlanDraftValues): boolean {
  const v = values[CARE_PLAN_CONSENT_META.showClosed]
  return v === true || v === 'true'
}

export function setConsentShowClosed(
  values: CarePlanDraftValues,
  show: boolean,
): CarePlanDraftValues {
  return setMetaValue(values, CARE_PLAN_CONSENT_META.showClosed, show)
}

export function formatConsentDateTime(date = new Date()): { date: string; time: string } {
  return {
    date: formatOrganisationDate(date),
    time: formatOrganisationTime(date),
  }
}
