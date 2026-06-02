import { ClipboardList } from 'lucide-react'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type { ServiceUserDomCareData } from '@/features/service-users/api/service-users.api'
import { InitialAssessmentStatusBadge } from '@/features/service-users/initial-assessment/components/InitialAssessmentStatusBadge'
import type { InitialAssessmentStatus } from '@/features/service-users/initial-assessment/types'

type Props = {
  detail: ServiceUserDetail
  domCare: ServiceUserDomCareData | null | undefined
  contactCount: number
  assessmentStatus?: InitialAssessmentStatus | null
  managerReviewRequired?: boolean
}

function displayName(detail: ServiceUserDetail): string {
  return [detail.firstName, detail.lastName].filter(Boolean).join(' ') || 'Service user'
}

function formatAddress(detail: ServiceUserDetail): string {
  const a = detail.address
  if (!a) return '—'
  return [a.addressLine1, a.addressLine2, a.town, a.postcode].filter(Boolean).join(', ') || '—'
}

function keyWorkerName(detail: ServiceUserDetail): string {
  const kw = detail.keyWorker
  if (!kw) return '—'
  return [kw.firstName, kw.lastName].filter(Boolean).join(' ') || '—'
}

export function InitialAssessmentProfileCard({
  detail,
  domCare,
  contactCount,
  assessmentStatus,
  managerReviewRequired,
}: Props) {
  const initials = displayName(detail)
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const knownAs = detail.preferredName?.trim() || detail.firstName
  const carers = domCare?.numberOfCarers ?? 0

  return (
    <div
      className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-card p-5 shadow-sm dark:border-teal-900 dark:from-teal-950/40"
      data-testid="ia-profile-card"
    >
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div
          className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl border-2 border-teal-200 bg-teal-100 font-semibold text-2xl text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-xl leading-tight">{displayName(detail)}</h2>
            {assessmentStatus ? (
              <InitialAssessmentStatusBadge
                status={assessmentStatus}
                managerReviewRequired={managerReviewRequired}
              />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Known as <strong className="font-medium text-foreground">{knownAs}</strong>
            {detail.serviceUserNumber ? ` · ${detail.serviceUserNumber}` : ''}
            {detail.careType?.name ? ` · ${detail.careType.name}` : ''}
          </p>
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of birth</dt>
          <dd className="mt-0.5 font-medium">
            {detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString() : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</dt>
          <dd className="mt-0.5 font-medium">{formatAddress(detail)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt>
          <dd className="mt-0.5 font-medium">{detail.phone || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mobile</dt>
          <dd className="mt-0.5 font-medium">{detail.mobile || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">NHS number</dt>
          <dd className="mt-0.5 font-medium">{detail.nhsNumber || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key worker</dt>
          <dd className="mt-0.5 font-medium">{keyWorkerName(detail)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-teal-200/80 pt-4 dark:border-teal-900">
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          Personal Details
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          Contacts ({contactCount})
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          About Me
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          DOM Care · {carers} carer(s)
        </span>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Section 1 confirms and extends this profile — start with who they are (1.1–1.8), then care starting
        context (1.0).
      </p>
    </div>
  )
}
