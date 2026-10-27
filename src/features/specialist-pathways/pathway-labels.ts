import type {
  ReviewOutcome,
  RiskLevel,
  SpecialistPathwayPlanStatus,
  SpecialistPathwayStatus,
  SpecialistPathwayType,
} from '@/features/specialist-pathways/types/specialist-pathway.types'

export const CASE_STATUS_LABELS: Record<SpecialistPathwayStatus, string> = {
  OPEN: 'Open',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
}

export const CASE_STATUS_CLASS: Record<SpecialistPathwayStatus, string> = {
  OPEN: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  CLOSED: 'bg-muted text-muted-foreground',
}

export const PLAN_STATUS_LABELS: Record<SpecialistPathwayPlanStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting approval',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
  SUPERSEDED: 'Superseded',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  VERY_HIGH: 'Very high',
}

export const RISK_LEVEL_CLASS: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  VERY_HIGH: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

/** Same bands as the backend: 1–4 Low, 5–9 Medium, 10–14 High, 15–25 Very high. */
export function riskLevelOf(score: number): RiskLevel {
  if (score >= 15) return 'VERY_HIGH'
  if (score >= 10) return 'HIGH'
  if (score >= 5) return 'MEDIUM'
  return 'LOW'
}

export const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'] as const
export const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'] as const

export const REVIEW_OUTCOME_LABELS: Record<ReviewOutcome, string> = {
  NO_CHANGE: 'No change needed',
  PLAN_UPDATE_NEEDED: 'Care plan needs updating',
  ESCALATED: 'Escalated',
  CASE_CLOSED: 'Close the case',
}

export const REVIEW_OUTCOME_OPTIONS = Object.keys(REVIEW_OUTCOME_LABELS) as ReviewOutcome[]

/** Suggested risk categories per pathway (free text is still allowed). */
export const RISK_CATEGORIES: Record<SpecialistPathwayType, string[]> = {
  LEARNING_DISABILITY: ['Choking', 'Epilepsy / seizures', 'Behaviour that challenges', 'Self-harm', 'Exploitation', 'Medication', 'Falls'],
  DEMENTIA: ['Wandering / getting lost', 'Falls', 'Nutrition & hydration', 'Medication', 'Distress / agitation', 'Fire / home safety', 'Financial abuse'],
  END_OF_LIFE: ['Pain', 'Pressure areas', 'Nutrition & hydration', 'Breathlessness', 'Moving & handling', 'Carer strain', 'Infection'],
  CHILDREN: ['Safeguarding', 'Choking', 'Epilepsy / seizures', 'Behaviour that challenges', 'Moving & handling', 'Medication', 'Online safety'],
  SUPPORTED_LIVING: ['Self-neglect', 'Exploitation', 'Money management', 'Medication', 'Mental health crisis', 'Home safety', 'Community access'],
}

/** Suggested roles for professionals involved in a case (free text is still allowed). */
export const PROFESSIONAL_ROLES = [
  'GP',
  'Social worker',
  'District nurse',
  'Community nurse',
  'Speech & language therapist (SALT)',
  'Occupational therapist',
  'Physiotherapist',
  'Dietitian',
  'Community psychiatric nurse (CPN)',
  'Psychiatrist',
  'Learning disability nurse',
  'Memory clinic',
  'Palliative / hospice nurse',
  'Pharmacist',
  'Advocate (IMCA)',
  'School / SENCO',
  'Housing officer',
] as const

/** Suggested document categories per pathway (free text is still allowed). */
export const DOCUMENT_CATEGORIES: Record<SpecialistPathwayType, string[]> = {
  LEARNING_DISABILITY: ['Hospital passport', 'Health action plan', 'Easy-read plan', 'Best interests decision', 'Behaviour support plan', 'Letter'],
  DEMENTIA: ['Diagnosis letter', 'Lasting power of attorney', 'Advance decision (ADRT)', 'Hospital passport', 'Life story', 'Letter'],
  END_OF_LIFE: ['DNACPR', 'ReSPECT form', 'Advance care plan', 'Anticipatory medicines chart', 'Lasting power of attorney', 'Letter'],
  CHILDREN: ['EHCP', 'Consent form', 'Health care plan', 'School report', 'Safeguarding plan', 'Letter'],
  SUPPORTED_LIVING: ['Tenancy agreement', 'Crisis plan', 'Mental Health Act paperwork', 'Benefits letter', 'Support agreement', 'Letter'],
}

/** Common areas of need for structured care-plan rows. */
export const NEED_AREAS = [
  'Personal care',
  'Communication',
  'Health & medication',
  'Eating & drinking',
  'Mobility',
  'Mental health & wellbeing',
  'Behaviour',
  'Daily living',
  'Social & community',
  'Safety',
  'End of life wishes',
] as const

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '—')
export const fmtFileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
export const fmtDateTime =(iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—')
