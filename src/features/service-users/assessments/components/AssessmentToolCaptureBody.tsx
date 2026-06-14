import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useCareForm } from '@/features/care-pathway/hooks/useCarePathwayTabs'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import { InitialAssessmentMustPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMustPanel'
import { InitialAssessmentWaterlowPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentWaterlowPanel'
import {
  defaultMustMetadata,
  enrichMustMetadata,
  type MustMetadata,
} from '@/features/service-users/initial-assessment/utils/must-scoring'
import {
  enrichWaterlowMetadata,
  type WaterlowMetadata,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import type { AssessmentCaptureKind } from '@/features/service-users/assessments/utils/assessment-snapshot.util'
import {
  extractMustFromSnapshot,
  extractPathwayFormValues,
  extractWaterlowFromSnapshot,
} from '@/features/service-users/assessments/utils/assessment-snapshot.util'

type Props = {
  kind: AssessmentCaptureKind
  carePathwayFormId?: string | null
  waterlow: WaterlowMetadata
  must: MustMetadata
  formValues: CarePlanDraftValues
  onWaterlowChange: (next: WaterlowMetadata) => void
  onMustChange: (next: MustMetadata) => void
  onFormValuesChange: (next: CarePlanDraftValues) => void
}

export function AssessmentToolCaptureBody({
  kind,
  carePathwayFormId,
  waterlow,
  must,
  formValues,
  onWaterlowChange,
  onMustChange,
  onFormValuesChange,
}: Props) {
  const formQuery = useCareForm(carePathwayFormId ?? '', kind === 'pathway-form' && Boolean(carePathwayFormId))

  if (kind === 'waterlow') {
    return (
      <div className="max-h-[min(52vh,28rem)] overflow-y-auto rounded-md border border-border/60">
        <InitialAssessmentWaterlowPanel value={waterlow} onChange={onWaterlowChange} />
      </div>
    )
  }

  if (kind === 'must') {
    return (
      <div className="max-h-[min(52vh,28rem)] overflow-y-auto rounded-md border border-border/60">
        <InitialAssessmentMustPanel value={must} onChange={onMustChange} />
      </div>
    )
  }

  if (kind === 'pathway-form') {
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
    return (
      <div className="max-h-[min(52vh,28rem)] overflow-y-auto rounded-md border border-border/60 p-3">
        <CarePathwayFormRenderer
          form={formQuery.data}
          values={formValues}
          onChange={onFormValuesChange}
          embedded
        />
      </div>
    )
  }

  return null
}

export function useAssessmentToolCaptureState(
  kind: AssessmentCaptureKind,
  open: boolean,
  initialSnapshot?: Record<string, unknown> | null,
) {
  const [waterlow, setWaterlow] = React.useState<WaterlowMetadata>(() =>
    enrichWaterlowMetadata(extractWaterlowFromSnapshot(initialSnapshot) || {}),
  )
  const [must, setMust] = React.useState<MustMetadata>(() =>
    enrichMustMetadata(extractMustFromSnapshot(initialSnapshot) || defaultMustMetadata()),
  )
  const [formValues, setFormValues] = React.useState<CarePlanDraftValues>(() =>
    extractPathwayFormValues(initialSnapshot),
  )

  React.useEffect(() => {
    if (!open) return
    setWaterlow(enrichWaterlowMetadata(extractWaterlowFromSnapshot(initialSnapshot) || {}))
    setMust(enrichMustMetadata(extractMustFromSnapshot(initialSnapshot) || defaultMustMetadata()))
    setFormValues(extractPathwayFormValues(initialSnapshot))
  }, [open, kind, initialSnapshot])

  return { waterlow, setWaterlow, must, setMust, formValues, setFormValues }
}
