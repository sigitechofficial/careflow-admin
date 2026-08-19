import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { InitialAssessmentActionsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentActionsPanel'
import { InitialAssessmentCarePlanRecommendationsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanRecommendationsPanel'
import { InitialAssessmentRiskRecordsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentRiskRecordsPanel'
import { buildInitialAssessmentEnterpriseSearch } from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
import { useCarePlanIaSource } from '@/features/service-users/hooks/useCarePlanIaSource'
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

export function CarePlanIaRecommendationsBody({ serviceUserId }: { serviceUserId: string }) {
  const navigate = useNavigate()
  const { canRead, canUpdate, canReview, canCreateCarePlan, submissionsQuery, summaryQuery, submission } =
    useCarePlanIaSource(serviceUserId)

  if (submissionsQuery.isLoading || (submission && summaryQuery.isLoading)) return <SourceLoading />
  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">You do not have permission to view care plan recommendations.</p>
    )
  }
  if (!submission) return <SourceEmpty serviceUserId={serviceUserId} canRead={canRead} />

  return (
    <div className="space-y-3" data-testid="care-plan-ia-recommendations">
      <p className="text-xs text-muted-foreground">
        Triggered from the latest initial assessment ·{' '}
        <OpenIaLink serviceUserId={serviceUserId} submissionId={submission.id} tab="schedule">
          Open IA recommendations
        </OpenIaLink>
      </p>
      <InitialAssessmentCarePlanRecommendationsPanel
        serviceUserId={serviceUserId}
        submissionId={submission.id}
        recommendations={summaryQuery.data?.carePlanRecommendations ?? []}
        submissionStatus={submission.status}
        canDecide={(canReview || canUpdate) && submission.status === 'REVIEWED'}
        canCreate={canCreateCarePlan}
        onGoToSection={(sectionNumber) => {
          void navigate({
            to: '/service-users/initial-assessment',
            search: buildInitialAssessmentEnterpriseSearch({
              serviceUserId,
              submissionId: submission.id,
              section: sectionNumber,
              tab: 'form',
            }),
          })
        }}
      />
    </div>
  )
}

export function useCarePlanIaAccordionTitles(serviceUserId: string) {
  const { summaryQuery, submission } = useCarePlanIaSource(serviceUserId)
  const riskCount = summaryQuery.data?.riskCount
  const actionCount = summaryQuery.data?.openActionsCount
  const recCount = summaryQuery.data?.carePlanRecommendations?.length

  const riskTitle =
    submission && riskCount != null
      ? `Risk Profile (${riskCount} risk${riskCount === 1 ? '' : 's'}${
          actionCount != null ? ` · ${actionCount} open action${actionCount === 1 ? '' : 's'}` : ''
        })`
      : 'Risk Profile'

  const pendingCount = summaryQuery.data?.carePlanRecommendations?.filter((r) => r.status === 'pending').length
  const recTitle =
    submission && recCount != null
      ? `Recommended Care Plans from Initial Assessment (${pendingCount ?? recCount} pending)`
      : 'Recommended Care Plans from Initial Assessment'

  return { riskTitle, recTitle }
}
