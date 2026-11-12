import type {
  CandidateCheckStatus,
  CandidateDocumentType,
  CandidateInterviewMode,
  CandidateInterviewOutcome,
  CandidateInterviewStatus,
  CandidateSource,
  CandidateStage,
  RecruitmentEmploymentType,
  SalaryPeriod,
  VacancyStatus,
} from '@/features/hr/recruitment/api/recruitment.api'

/** The recruitment steps, in order (one step at a time). */
export const PIPELINE_STAGES: CandidateStage[] = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'VETTING',
  'ACCEPTED',
]

const STAGE_LABELS: Record<CandidateStage, string> = {
  APPLIED: 'Application',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Conditional offer',
  VETTING: 'Pre-employment checks',
  ACCEPTED: 'Cleared to start',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

/** What the team does next at each step (shown on the pipeline cards). */
export const STAGE_NEXT_ACTION: Record<CandidateStage, string> = {
  APPLIED: 'Add employment history, then start screening',
  SCREENING: 'Answer screening questions, then arrange an interview',
  INTERVIEW: 'Record the interview, then make an offer',
  OFFER: "Record the candidate's reply",
  VETTING: 'Verify the checks, then clear to start',
  ACCEPTED: 'Create the employee record',
  REJECTED: 'Closed',
  WITHDRAWN: 'Closed',
}

export function candidateStageLabel(stage: CandidateStage): string {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ')
}

export function vacancyStatusLabel(status: VacancyStatus): string {
  return status.replace(/_/g, ' ')
}

const SOURCE_LABELS: Record<CandidateSource, string> = {
  WEBSITE: 'Careers page',
  REFERRAL: 'Referral',
  AGENCY: 'Agency',
  INTERNAL: 'Internal',
  MANUAL: 'Added by staff',
  EMAIL: 'Email (recruitment inbox)',
}

export function candidateSourceLabel(source: CandidateSource): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ')
}

/** "PART_TIME" → "Part time" */
export function employmentTypeLabel(type: RecruitmentEmploymentType): string {
  const text = type.replace(/_/g, ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const DOCUMENT_TYPE_LABELS: Record<CandidateDocumentType, string> = {
  CV: 'CV',
  CERTIFICATE: 'Certificate',
  ID_DOCUMENT: 'ID document',
  OFFER_LETTER: 'Offer letter',
  CHECK_EVIDENCE: 'Check evidence',
  OTHER: 'Other',
}

export function candidateDocumentTypeLabel(type: CandidateDocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}

export const CHECK_STATUS_LABELS: Record<CandidateCheckStatus, string> = {
  NOT_STARTED: 'Not started',
  REQUESTED: 'Requested',
  RECEIVED: 'Received — to verify',
  VERIFIED: 'Verified',
  FAILED: 'Failed',
  NOT_REQUIRED: 'Not needed',
}

export const INTERVIEW_MODE_LABELS: Record<CandidateInterviewMode, string> = {
  IN_PERSON: 'In person',
  PHONE: 'Phone',
  VIDEO: 'Video call',
}

export const INTERVIEW_STATUS_LABELS: Record<CandidateInterviewStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'Did not attend',
}

export const INTERVIEW_OUTCOME_LABELS: Record<CandidateInterviewOutcome, string> = {
  HIRE: 'Hire',
  MAYBE: 'Maybe',
  DO_NOT_HIRE: 'Do not hire',
}

/** Values-based questions asked at every care interview (each scored 1–5). */
export const DEFAULT_INTERVIEW_QUESTIONS = [
  'Why do you want to work in care?',
  'Tell us about a time you treated someone with dignity and respect.',
  'How would you support someone who refuses their care or medication?',
  'What would you do if you were worried a person was being abused or neglected?',
  'Tell us about a time you worked well in a team or on your own.',
  'How do you look after your own wellbeing in a demanding job?',
]

/** "2021-03" → "Mar 2021" */
export function formatMonth(ym: string | null | undefined): string {
  if (!ym) return 'Present'
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** ISO date → value for <input type="date"> */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

export const SALARY_PERIOD_OPTIONS: { value: SalaryPeriod; label: string }[] = [
  { value: 'HOUR', label: 'per hour' },
  { value: 'DAY', label: 'per day' },
  { value: 'WEEK', label: 'per week' },
  { value: 'MONTH', label: 'per month' },
  { value: 'YEAR', label: 'per year' },
]

/**
 * Salary as people should read it: "3000" + MONTH → "£3,000 per month",
 * "12.60 - 13.50" + HOUR → "£12.60 – £13.50 per hour". Text already saying "per …" is left as written.
 */
export function formatPay(salaryRange: string | null | undefined, period: SalaryPeriod | null | undefined): string | null {
  const text = salaryRange?.trim()
  if (!text) return null
  let pay = text
  // Bare numbers (no £, no words): add the £ sign and thousands separators.
  if (/^[\d.,\s–-]+$/.test(text)) {
    pay = text
      .replace(/\s*[–-]\s*/g, ' – ')
      .replace(/\d[\d,]*(\.\d+)?/g, n => {
        const value = Number(n.replace(/,/g, ''))
        if (!Number.isFinite(value)) return n
        const hasPence = /\.\d/.test(n)
        return `£${value.toLocaleString('en-GB', { minimumFractionDigits: hasPence ? 2 : 0, maximumFractionDigits: 2 })}`
      })
  }
  const periodLabel = SALARY_PERIOD_OPTIONS.find(o => o.value === period)?.label
  if (periodLabel && !/\bper\b|\/\s*(h|hr|hour|day|wk|week|month|mo|year|yr|annum)/i.test(pay)) {
    pay = `${pay} ${periodLabel}`
  }
  return pay
}

/** "2026-11-30" → that day at 00:00 UTC (ms). */
function ymdToUtc(ymd: string): number {
  const [y = 1970, m = 1, d = 1] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** "2026-11-30" → "30 Nov 2026" (closing dates are whole days). */
export function formatClosingDate(ymd: string | null | undefined): string | null {
  if (!ymd) return null
  return new Date(ymdToUtc(ymd)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Whole days from today to the closing date: 0 = closes today, negative = already closed. */
export function daysUntilClosing(ymd: string): number {
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((ymdToUtc(ymd) - today) / 86_400_000)
}

/** "Applied today", "Applied 3 days ago", or the date. */
export function appliedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Applied today'
  if (days === 1) return 'Applied yesterday'
  if (days < 30) return `Applied ${days} days ago`
  return `Applied ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
