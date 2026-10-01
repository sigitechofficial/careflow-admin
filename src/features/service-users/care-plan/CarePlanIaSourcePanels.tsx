import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { InitialAssessmentActionsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentActionsPanel'
import { InitialAssessmentCarePlanRecommendationsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanRecommendationsPanel'
import { InitialAssessmentRiskRecordsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentRiskRecordsPanel'
import { buildInitialAssessmentEnterpriseSearch } from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
import { firstHolisticTabForEnterpriseSection } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { useCarePlanIaSource } from '@/features/service-users/hooks/useCarePlanIaSource'
import { useCarePlanRecommendations } from '@/features/service-users/hooks/useCarePlanRecommendations'
import type { InitialAssessmentStatus } from '@/features/service-users/initial-assessment/types'

const EDITABLE: InitialAssessmentStatus[] = ['DRAFT', 'IN_PROGRESS']

function OpenIaLink({
  serviceUserId,
  submissionId,
  section,
  tab,
  children,
}: {
  serviceUserId: string
  submissionId?: string
  section?: number
  tab?: 'form' | 'schedule' | 'review'
  children: React.ReactNode
}) {
  return (
    <Link
      to="/service-users/initial-assessment"
      search={buildInitialAssessmentEnterpriseSearch({
        serviceUserId,
        submissionId,
        section,
        tab,
      })}
      className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
    >
      {children}
    </Link>
  )
}

function SourceEmpty({ serviceUserId, canRead }: { serviceUserId: string; canRead: boolean }) {
  return (
    <p className="text-sm text-muted-foreground" data-testid="care-plan-ia-empty">
      No initial assessment for this service user yet.
      {canRead ? (
        <>
          {' '}
          <OpenIaLink serviceUserId={serviceUserId}>Open initial assessment</OpenIaLink>
        </>
      ) : null}
    </p>
  )
}

function SourceLoading() {
  return (
    <div className="flex justify-center py-6">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export function CarePlanRiskProfileBody({ serviceUserId }: { serviceUserId: string }) {
  const { canRead, canUpdate, submissionsQuery, submission } = useCarePlanIaSource(serviceUserId)

  if (submissionsQuery.isLoading) return <SourceLoading />
  if (!canRead) {
    return <p className="text-sm text-muted-foreground">You do not have permission to view initial assessment risks.</p>
  }
  if (!submission) return <SourceEmpty serviceUserId={serviceUserId} canRead={canRead} />

  const editable = EDITABLE.includes(submission.status)

  return (
    <div className="space-y-4" data-testid="care-plan-risk-profile">
      <p className="text-xs text-muted-foreground">
        From initial assessment ({submission.status.toLowerCase().replace('_', ' ')}) ·{' '}
        <OpenIaLink serviceUserId={serviceUserId} submissionId={submission.id} tab="review">
          View assessment
        </OpenIaLink>
      </p>
      <InitialAssessmentRiskRecordsPanel
        serviceUserId={serviceUserId}
        submissionId={submission.id}
        canUpdate={canUpdate}
        editable={editable || submission.status === 'SUBMITTED'}
      />
      <InitialAssessmentActionsPanel
        serviceUserId={serviceUserId}
        submissionId={submission.id}
        canUpdate={canUpdate}
        editable={editable}
      />
    </div>
  )
}

export function CarePlanIaRecommendationsBody({
  serviceUserId,
  layout = 'full',
  includePendingFormIds,
  cataloguedFormIds,
}: {
  serviceUserId: string
  layout?: 'full' | 'lifecycle'
  includePendingFormIds?: ReadonlySet<string>
  cataloguedFormIds?: ReadonlySet<string>
}) {
  const navigate = useNavigate()
  const {
    canRead,
    canUpdate,
    canReview,
    canCreateCarePlan,
    submission,
    recommendations,
    isLoading,
  } = useCarePlanRecommendations(serviceUserId)

  if (isLoading) return <SourceLoading />
  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">You do not have permission to view care plan recommendations.</p>
    )
  }

  if (!submission && recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="care-plan-ia-empty">
        No care plans recommended yet. Save medical conditions (for example High Risk of Falls) or{' '}
        {canRead ? (
          <OpenIaLink serviceUserId={serviceUserId}>open an initial assessment</OpenIaLink>
        ) : (
          'complete an initial assessment'
        )}
        .
      </p>
    )
  }

  return (
    <div className="space-y-3" data-testid="care-plan-ia-recommendations">
      {layout === 'lifecycle' ? null : (
        <p className="text-xs text-muted-foreground">
          {submission ? (
            <>
              Triggered from the latest initial assessment and medical conditions ·{' '}
              <OpenIaLink serviceUserId={serviceUserId} submissionId={submission.id} tab="schedule">
                Open IA recommendations
              </OpenIaLink>
            </>
          ) : (
            <>
              Recommended from medical conditions ·{' '}
              <Link
                to="/service-users/$serviceUserId/alerts"
                params={{ serviceUserId }}
                className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
              >
                Medical &amp; Alerts
              </Link>
            </>
          )}
        </p>
      )}
      <InitialAssessmentCarePlanRecommendationsPanel
        serviceUserId={serviceUserId}
        submissionId={submission?.id ?? null}
        recommendations={recommendations}
        submissionStatus={submission?.status}
        canDecide={Boolean(
          (canReview || canUpdate) && submission && submission.status === 'REVIEWED',
        )}
        canCreate={canCreateCarePlan}
        layout={layout}
        includePendingFormIds={includePendingFormIds}
        cataloguedFormIds={cataloguedFormIds}
        onGoToSection={
          submission
            ? (sectionNumber) => {
                void navigate({
                  to: '/service-users/initial-assessment',
                  search: buildInitialAssessmentEnterpriseSearch({
                    serviceUserId,
                    submissionId: submission.id,
                    // Recommendations carry the enterprise § number — open the tab that shows it.
                    section: firstHolisticTabForEnterpriseSection(sectionNumber),
                    tab: 'form',
                  }),
                })
              }
            : undefined
        }
      />
    </div>
  )
}

export function useCarePlanIaAccordionTitles(serviceUserId: string) {
  const { recommendations, submission } = useCarePlanRecommendations(serviceUserId)
  const recCount = recommendations.length
  const pendingCount = recommendations.filter((r) => r.status === 'pending').length

  const { summaryQuery } = useCarePlanIaSource(serviceUserId)
  const riskCount = summaryQuery.data?.riskCount
  const actionCount = summaryQuery.data?.openActionsCount

  const riskTitle =
    submission && riskCount != null
      ? `Risk Profile (${riskCount} risk${riskCount === 1 ? '' : 's'}${
          actionCount != null ? ` · ${actionCount} open action${actionCount === 1 ? '' : 's'}` : ''
        })`
      : 'Risk Profile'

  const recTitle =
    recCount > 0
      ? `Recommended Care Plans (${pendingCount} pending)`
      : submission
        ? 'Recommended Care Plans from Initial Assessment'
        : 'Recommended Care Plans'

  return { riskTitle, recTitle }
}
