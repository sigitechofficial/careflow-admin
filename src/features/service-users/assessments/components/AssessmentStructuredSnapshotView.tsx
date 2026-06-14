import {
  hasStructuredAssessmentPanel,
  resolveAssessmentPanelId,
} from '@/features/service-users/assessments/assessment-tool-registry'
import { AssessmentStandaloneToolPanel } from '@/features/service-users/assessments/components/AssessmentStandaloneToolPanel'
import { emptyToolCaptureState } from '@/features/service-users/assessments/utils/assessment-snapshot.util'

type Props = {
  assessmentKey: string
  serviceUserId: string
  snapshot?: Record<string, unknown> | null
}

export function AssessmentStructuredSnapshotView({
  assessmentKey,
  serviceUserId,
  snapshot,
}: Props) {
  const carePathwayFormId =
    typeof snapshot?.carePathwayFormId === 'string' ? snapshot.carePathwayFormId : null

  if (!snapshot || typeof snapshot !== 'object') {
    return null
  }

  if (!hasStructuredAssessmentPanel(assessmentKey, carePathwayFormId)) {
    return null
  }

  return (
    <AssessmentStandaloneToolPanel
      assessmentKey={assessmentKey}
      serviceUserId={serviceUserId}
      carePathwayFormId={carePathwayFormId}
      disabled
      state={emptyToolCaptureState(snapshot)}
      onStateChange={() => undefined}
    />
  )
}

export function hasStructuredSnapshotView(
  assessmentKey: string,
  snapshot?: Record<string, unknown> | null,
): boolean {
  const carePathwayFormId =
    typeof snapshot?.carePathwayFormId === 'string' ? snapshot.carePathwayFormId : null
  return hasStructuredAssessmentPanel(assessmentKey, carePathwayFormId)
}

export { resolveAssessmentPanelId }
