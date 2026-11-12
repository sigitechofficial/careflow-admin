import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import type { SalaryPeriod } from '@/features/hr/recruitment/api/recruitment.api'
import { daysUntilClosing, formatClosingDate } from '@/features/hr/recruitment/utils/recruitment-display.util'

export { formatPay } from '@/features/hr/recruitment/utils/recruitment-display.util'

/** "Apply by 30 Nov 2026" plus how soon: "Closes today", "Closes in 3 days". Null when there is no closing date. */
export function closingInfo(ymd: string | null): { date: string; soon: string | null; urgent: boolean } | null {
  if (!ymd) return null
  const days = daysUntilClosing(ymd)
  const soon =
    days <= 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : days <= 14 ? `Closes in ${days} days` : null
  return { date: formatClosingDate(ymd) ?? ymd, soon, urgent: days <= 3 }
}

/** An open job as the public sees it (no internal details). */
export type PublicVacancy = {
  id: string
  reference: string
  title: string
  jobTitle: string | null
  location: string | null
  employmentType: string
  salaryRange: string | null
  salaryPeriod: SalaryPeriod | null
  /** Last day to apply (YYYY-MM-DD), inclusive. */
  closingDate: string | null
  numberOfPositions: number
  description: string | null
  requirements: string | null
  postedAt: string
}

export type ApplicationInput = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  hasRightToWork: boolean
  drivesForWork?: boolean
  coverLetter?: string
  consent: boolean
  /** Honeypot: hidden from people; must stay empty. */
  website?: string
  cv?: File | null
}

export async function fetchOpenVacancies() {
  const res = await apiJson<ApiEnvelope<PublicVacancy[]>>('/careers')
  return res.data
}

export async function fetchOpenVacancy(id: string) {
  const res = await apiJson<ApiEnvelope<PublicVacancy>>(`/careers/${encodeURIComponent(id)}`)
  return res.data
}

/** Sends the application (multipart, with the optional CV). Throws an Error with a readable message. */
export async function submitApplication(vacancyId: string, input: ApplicationInput) {
  const form = new FormData()
  form.append('firstName', input.firstName)
  form.append('lastName', input.lastName)
  form.append('email', input.email)
  form.append('phone', input.phone)
  if (input.address) form.append('address', input.address)
  form.append('hasRightToWork', String(input.hasRightToWork))
  if (input.drivesForWork !== undefined) form.append('drivesForWork', String(input.drivesForWork))
  if (input.coverLetter) form.append('coverLetter', input.coverLetter)
  form.append('consent', String(input.consent))
  if (input.website) form.append('website', input.website)
  if (input.cv) form.append('cv', input.cv)

  const res = await fetch(`${getApiBaseUrl()}/careers/${encodeURIComponent(vacancyId)}/apply`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      // Validation errors come as { message: 'Validation failed', errors: [...] }: show the reasons.
      const body = (await res.json()) as { message?: unknown; errors?: unknown }
      if (Array.isArray(body.errors) && body.errors.length) message = body.errors.map(String).join(' ')
      else if (Array.isArray(body.message)) message = body.message.join(' ')
      else if (typeof body.message === 'string') message = body.message
    } catch {
      /* keep the default */
    }
    if (res.status === 413) message = 'Your CV is too large. Please upload a file under 10 MB.'
    if (res.status === 429) message = 'Too many attempts. Please wait a minute and try again.'
    throw new Error(message)
  }
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  PERMANENT: 'Permanent',
  FIXED_TERM: 'Fixed term',
  BANK: 'Bank (as and when)',
  AGENCY: 'Agency',
  APPRENTICE: 'Apprenticeship',
  VOLUNTEER: 'Volunteer',
}

export function employmentTypeText(type: string): string {
  return EMPLOYMENT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase()
}

/** "Posted 3 days ago" */
export function postedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 30) return `Posted ${days} days ago`
  return `Posted ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
