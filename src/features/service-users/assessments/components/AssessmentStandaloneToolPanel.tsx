import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useCareForm } from '@/features/care-pathway/hooks/useCarePathwayTabs'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import { InitialAssessmentAdvanceCarePlanningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAdvanceCarePlanningPanel'
import { InitialAssessmentEndOfLifeAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEndOfLifeAssessmentPanel'
import { InitialAssessmentEnvironmentAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEnvironmentAssessmentPanel'
import { InitialAssessmentFallsScreeningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentFallsScreeningPanel'
import { InitialAssessmentMcaScreeningStandalonePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMcaScreeningStandalonePanel'
import { InitialAssessmentMentalCapacityChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMentalCapacityChecklistPanel'
import { InitialAssessmentMovingHandlingOperationsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMovingHandlingOperationsPanel'
import { InitialAssessmentMustPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMustPanel'
import { InitialAssessmentPainAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPainAssessmentPanel'
import { InitialAssessmentPhotographyConsentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPhotographyConsentPanel'
import { InitialAssessmentTherapyAideMemoirePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTherapyAideMemoirePanel'
import { InitialAssessmentTotalSkinIntegrityCheckPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTotalSkinIntegrityCheckPanel'
import { InitialAssessmentWaterlowPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentWaterlowPanel'
import { patchSkinIntegrityCheckRow } from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import { resolveAssessmentPanelId } from '@/features/service-users/assessments/assessment-tool-registry'
import type { AssessmentToolCaptureState } from '@/features/service-users/assessments/utils/assessment-snapshot.util'
import { emptyToolCaptureState } from '@/features/service-users/assessments/utils/assessment-snapshot.util'

type Props = {
  assessmentKey: string
  serviceUserId: string
  carePathwayFormId?: string | null
  disabled?: boolean
  state: AssessmentToolCaptureState
  onStateChange: (next: AssessmentToolCaptureState) => void
}

export function AssessmentStandaloneToolPanel({
  assessmentKey,
  serviceUserId,
  carePathwayFormId,
  disabled,
  state,
  onStateChange,
}: Props) {
  const panelId = resolveAssessmentPanelId(assessmentKey, carePathwayFormId)
  const formQuery = useCareForm(carePathwayFormId ?? '', panelId === 'pathway-form' && Boolean(carePathwayFormId))

  const shell = (children: React.ReactNode) => {
    if (disabled) {
      return (
        <div className="min-w-0 overflow-x-auto rounded-md border border-border/60 bg-card">
          {children}
        </div>
      )
    }
    return (
      <div className="max-h-[min(52vh,28rem)] overflow-y-auto rounded-md border border-border/60">
        {children}
      </div>
    )
  }

  if (panelId === 'waterlow') {
    return shell(
      <InitialAssessmentWaterlowPanel
        value={state.waterlow}
        disabled={disabled}
        onChange={(waterlow) => onStateChange({ ...state, waterlow })}
      />,
    )
  }

  if (panelId === 'must') {
    return shell(
      <InitialAssessmentMustPanel
        value={state.must}
        disabled={disabled}
        onChange={(must) => onStateChange({ ...state, must })}
      />,
    )
  }

  if (panelId === 'falls-screening') {
    return shell(
      <InitialAssessmentFallsScreeningPanel
        value={state.fallsScreening}
        disabled={disabled}
        hideEmbeddedConsent
        onChange={(fallsScreening) => onStateChange({ ...state, fallsScreening })}
      />,
    )
  }

  if (panelId === 'skin-integrity') {
    return shell(
      <InitialAssessmentTotalSkinIntegrityCheckPanel
        value={state.skinIntegrityCheck}
        disabled={disabled}
        serviceUserId={serviceUserId}
        onRowSideChange={(rowId, side, text) =>
          onStateChange({
            ...state,
            skinIntegrityCheck: {
              rows: patchSkinIntegrityCheckRow(state.skinIntegrityCheck.rows, rowId, side, text),
            },
          })
        }
      />,
    )
  }

  if (panelId === 'mca-screening') {
    return shell(
      <InitialAssessmentMcaScreeningStandalonePanel
        value={state.mcaScreening}
        disabled={disabled}
        onChange={(mcaScreening) => onStateChange({ ...state, mcaScreening })}
      />,
    )
  }

  if (panelId === 'moving-handling') {
    return shell(
      <InitialAssessmentMovingHandlingOperationsPanel
        value={state.movingHandlingOperations}
        disabled={disabled}
        onChange={(movingHandlingOperations) => onStateChange({ ...state, movingHandlingOperations })}
      />,
    )
  }

  if (panelId === 'pain-tool') {
    return shell(
      <InitialAssessmentPainAssessmentPanel
        value={state.painAssessment}
        disabled={disabled}
        onChange={(painAssessment) => onStateChange({ ...state, painAssessment })}
      />,
    )
  }

  if (panelId === 'therapy-memoire') {
    return shell(
      <InitialAssessmentTherapyAideMemoirePanel
        value={state.therapyAideMemoire}
        disabled={disabled}
        onChange={(therapyAideMemoire) => onStateChange({ ...state, therapyAideMemoire })}
      />,
    )
  }

  if (panelId === 'environment-assessment') {
    return shell(
      <InitialAssessmentEnvironmentAssessmentPanel
        value={state.environmentAssessment}
        disabled={disabled}
        onChange={(environmentAssessment) => onStateChange({ ...state, environmentAssessment })}
      />,
    )
  }

  if (panelId === 'advance-care-planning') {
    return shell(
      <InitialAssessmentAdvanceCarePlanningPanel
        value={state.advanceCarePlanning}
        disabled={disabled}
        onChange={(advanceCarePlanning) => onStateChange({ ...state, advanceCarePlanning })}
      />,
    )
  }

  if (panelId === 'end-of-life-assessment') {
    return shell(
      <InitialAssessmentEndOfLifeAssessmentPanel
        value={state.endOfLifeAssessment}
        disabled={disabled}
        onChange={(endOfLifeAssessment) => onStateChange({ ...state, endOfLifeAssessment })}
      />,
    )
  }

  if (panelId === 'mental-capacity-checklist') {
    return shell(
      <InitialAssessmentMentalCapacityChecklistPanel
        value={state.mentalCapacityChecklist}
        disabled={disabled}
        onChange={(updater) => {
          const next =
            typeof updater === 'function' ? updater(state.mentalCapacityChecklist) : updater
          onStateChange({ ...state, mentalCapacityChecklist: next })
        }}
      />,
    )
  }

  if (panelId === 'photography-consent') {
    return shell(
      <InitialAssessmentPhotographyConsentPanel
        value={state.photographyConsent}
        disabled={disabled}
        onChange={(photographyConsent) => onStateChange({ ...state, photographyConsent })}
      />,
    )
  }

  if (panelId === 'pathway-form') {
    if (formQuery.isLoading) {
      return (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading form…
        </div>
      )
    }
    if (formQuery.error || !formQuery.data) {
      return (
        <p className="text-sm text-destructive" role="alert">
          Unable to load care pathway form.
        </p>
      )
    }
    return shell(
      <div className="p-3">
        <CarePathwayFormRenderer
          form={formQuery.data}
          values={state.formValues}
          onChange={(formValues) => onStateChange({ ...state, formValues })}
          disabled={disabled}
          embedded
        />
      </div>,
    )
  }

  return null
}

export function useAssessmentToolCaptureState(
  assessmentKey: string,
  carePathwayFormId: string | null | undefined,
  open: boolean,
  initialSnapshot?: Record<string, unknown> | null,
) {
  const [state, setState] = React.useState<AssessmentToolCaptureState>(() =>
    emptyToolCaptureState(initialSnapshot),
  )

  React.useEffect(() => {
    if (!open) return
    setState(emptyToolCaptureState(initialSnapshot))
  }, [open, assessmentKey, carePathwayFormId, initialSnapshot])

  return { state, setState }
}

