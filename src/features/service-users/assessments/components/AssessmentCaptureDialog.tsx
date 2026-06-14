import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  AssessmentStandaloneToolPanel,
  useAssessmentToolCaptureState,
} from '@/features/service-users/assessments/components/AssessmentStandaloneToolPanel'
import { AssessmentConsentCaptureSection } from '@/features/service-users/assessments/components/AssessmentConsentCaptureSection'
import { hasStructuredAssessmentPanel } from '@/features/service-users/assessments/assessment-tool-registry'
import { useCreateAssessmentCompletion } from '@/features/service-users/assessments/hooks/useServiceUserAssessments'
import {
  attachAssessmentConsentToSnapshot,
  defaultAssessmentConsentMetadata,
  isAssessmentConsentCaptureExempt,
  validateAssessmentConsent,
  type AssessmentConsentMetadata,
} from '@/features/service-users/assessments/utils/assessment-consent'
import {
  buildAssessmentSummary,
  buildToolSnapshot,
  validateToolCapture,
} from '@/features/service-users/assessments/utils/assessment-snapshot.util'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  assessmentKey: string
  title: string
  initialSummary?: string | null
  initialSnapshot?: Record<string, unknown> | null
  repeatFromCompletionId?: string | null
  carePathwayFormId?: string | null
  mode: 'repeat' | 'add'
}

const notesFromSnapshot = (snapshot?: Record<string, unknown> | null) => {
  if (!snapshot || typeof snapshot !== 'object') return ''
  const notes = (snapshot as { notes?: unknown }).notes
  return typeof notes === 'string' ? notes : ''
}

export function AssessmentCaptureDialog({
  open,
  onOpenChange,
  serviceUserId,
  assessmentKey,
  title,
  initialSummary,
  initialSnapshot,
  repeatFromCompletionId,
  carePathwayFormId,
  mode,
}: Props) {
  const showStructuredPanel = hasStructuredAssessmentPanel(assessmentKey, carePathwayFormId)
  const requiresConsent = !isAssessmentConsentCaptureExempt(assessmentKey)
  const createMutation = useCreateAssessmentCompletion(serviceUserId, assessmentKey)
  const { state, setState } = useAssessmentToolCaptureState(
    assessmentKey,
    carePathwayFormId,
    open,
    initialSnapshot,
  )

  const [summary, setSummary] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [consent, setConsent] = React.useState<AssessmentConsentMetadata>(() =>
    defaultAssessmentConsentMetadata({ assessmentKey, assessmentTitle: title }),
  )
  const [error, setError] = React.useState<string | null>(null)
  const [consentError, setConsentError] = React.useState<string | null>(null)
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    if (!open) setDirty(false)
  }, [open])

  React.useEffect(() => {
    if (!open || dirty) return
    setSummary(initialSummary ?? '')
    setNotes(notesFromSnapshot(initialSnapshot))
    setConsent(
      defaultAssessmentConsentMetadata({
        assessmentKey,
        assessmentTitle: title,
      }),
    )
    setError(null)
    setConsentError(null)
  }, [open, dirty, assessmentKey, mode, initialSummary, initialSnapshot, title])

  React.useEffect(() => {
    if (!open || dirty) return
    const snapshot = buildToolSnapshot(assessmentKey, carePathwayFormId, {
      ...state,
      formName: title,
      notes,
    })
    const autoSummary = buildAssessmentSummary(assessmentKey, snapshot)
    if (autoSummary) setSummary(autoSummary)
  }, [open, dirty, assessmentKey, carePathwayFormId, state, title, notes])

  async function handleSubmit() {
    const consentPayload: AssessmentConsentMetadata = {
      ...consent,
      assessmentKey,
      assessmentTitle: title,
    }

    const nextConsentError = requiresConsent
      ? validateAssessmentConsent(consentPayload, assessmentKey)
      : null
    if (nextConsentError) {
      setConsentError(nextConsentError)
      return
    }
    setConsentError(null)

    const toolError = validateToolCapture(assessmentKey, carePathwayFormId, state, {
      assessmentConsent: requiresConsent ? consentPayload : undefined,
    })
    if (toolError) {
      setError(toolError)
      return
    }

    let captureState = state
    if (
      assessmentKey === 'falls-screening' &&
      consentPayload.consentObtained === true &&
      captureState.fallsScreening.consentToSixQuestions == null
    ) {
      captureState = {
        ...captureState,
        fallsScreening: {
          ...captureState.fallsScreening,
          consentToSixQuestions: true,
        },
      }
    }

    let snapshot = buildToolSnapshot(assessmentKey, carePathwayFormId, {
      ...captureState,
      formName: title,
      notes,
    })

    if (requiresConsent) {
      snapshot = attachAssessmentConsentToSnapshot(snapshot, consentPayload)
    }

    const trimmedSummary =
      summary.trim() || buildAssessmentSummary(assessmentKey, snapshot) || ''

    if (!trimmedSummary && consentPayload.consentObtained !== false) {
      setError('Summary is required.')
      return
    }

    const finalSummary =
      trimmedSummary ||
      (consentPayload.consentObtained === false
        ? `Consent not obtained — ${title}`
        : '')

    if (!finalSummary) {
      setError('Summary is required.')
      return
    }

    setError(null)
    try {
      const saved = await createMutation.mutateAsync({
        summary: finalSummary,
        snapshot,
        title: mode === 'add' ? title : undefined,
        carePathwayFormId: mode === 'add' ? carePathwayFormId ?? undefined : undefined,
        repeatFromCompletionId:
          mode === 'repeat' && repeatFromCompletionId ? repeatFromCompletionId : undefined,
      })
      const linkedPlans = saved.carePlanLinks?.filter((link) => link.carePlanFormName) ?? []
      if (linkedPlans.length > 0) {
        toastSuccess(
          'Assessment saved',
          `Linked automatically to ${linkedPlans.map((link) => link.carePlanFormName).join(', ')}.`,
        )
      } else {
        toastSuccess('Assessment saved', 'The assessment completion was recorded.')
      }
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, 'Unable to save assessment')
    }
  }

  const canSave =
    requiresConsent
      ? consent.consentObtained === false || Boolean(summary.trim())
      : Boolean(summary.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={showStructuredPanel ? 'xl' : 'md'}>
        <DialogHeader>
          <DialogTitle>{mode === 'repeat' ? 'Repeat assessment' : 'Add assessment'}</DialogTitle>
          <DialogDescription>
            Complete <strong>{title}</strong> here — same tool as Initial Assessment, saved to this
            service user&apos;s assessment history (IA document is not changed on repeat).
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {requiresConsent ? (
            <AssessmentConsentCaptureSection
              assessmentTitle={title}
              value={consent}
              error={consentError}
              onChange={(next) => {
                setConsent(next)
                setDirty(true)
                setConsentError(null)
              }}
            />
          ) : null}

          {showStructuredPanel && consent.consentObtained !== false ? (
            <AssessmentStandaloneToolPanel
              assessmentKey={assessmentKey}
              serviceUserId={serviceUserId}
              carePathwayFormId={carePathwayFormId}
              state={state}
              onStateChange={(next) => {
                setState(next)
                setDirty(true)
              }}
            />
          ) : null}

          {consent.consentObtained !== false ? (
            <FormField label="Summary" htmlFor="assessment-summary" required error={error ?? undefined}>
              <Textarea
                id="assessment-summary"
                value={summary}
                onChange={(event) => {
                  setSummary(event.target.value)
                  setDirty(true)
                }}
                placeholder={
                  showStructuredPanel
                    ? 'Auto-filled when the form is complete — edit if needed.'
                    : 'What was observed or agreed?'
                }
                rows={showStructuredPanel ? 2 : 4}
              />
            </FormField>
          ) : null}

          {consent.consentObtained !== false ? (
            <FormField
              label="Notes (optional)"
              htmlFor="assessment-notes"
              hint="Add any supporting context for this completion."
            >
              <Textarea
                id="assessment-notes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value)
                  setDirty(true)
                }}
                placeholder="Additional details…"
                rows={3}
              />
            </FormField>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createMutation.isPending || !canSave}
          >
            {createMutation.isPending ? 'Saving…' : 'Save completion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
