import * as React from 'react'
import { FlaskConical, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import type { IaAutofillLevel } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'
import {
  IA_CONDITION_LEVEL_LABELS,
  IA_SECTION_DEMO_SUCCESS_TOAST,
  iaSectionDemoOverwriteConfirmText,
} from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'
import {
  generateIaSectionDemoDev,
  persistIaDemoProfilePatch,
  profilePatchHasValues,
} from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'

type Props = {
  tabId: number
  tabTitle: string
  /** The exact questionIds this tab renders (backend still drops profile/secure fields). */
  questionIds: string[]
  /** Active QA scenario, or null when none picked yet. */
  activeLevel: IaAutofillLevel | null
  /** Whether the assessment is editable (DRAFT/IN_PROGRESS). Read-only ones cannot be filled. */
  editable: boolean
  /** Whether this section already holds answers/worksheet data (drives the overwrite confirm). */
  sectionHasData: boolean
  /** Whether this section has already had demo data populated this session. */
  alreadyFilled: boolean
  /** Existing Service User identity so worksheet labels are not a different person. */
  identity?: import('@/features/service-users/initial-assessment/utils/ia-section-demo-dev').IaDemoIdentity | null
  /** Persist empty address/GP through the Service User profile APIs the widgets read. */
  serviceUserId?: string
  gpContactId?: string | null
  /** After profile persistence — typically invalidate the Service User detail query. */
  onProfilePersisted?: () => void | Promise<void>
  /** Merge generated values into the editable form draft IN MEMORY (no IA save/submit). */
  onApply: (
    tabId: number,
    answers: import('@/features/service-users/initial-assessment/utils/ia-section-demo-dev').GenerateIaSectionResult['answers'],
    metadata: Record<string, unknown>,
  ) => void
  /** Open the scenario selector (when no scenario is active yet). */
  onPickScenario: () => void
}

/**
 * Dev/QA-only panel: populates THIS section's fields with demo data at the active severity.
 * IA answers are generated (not saved as a submission) and merged into the editable form.
 * Empty Service User address/GP fields are persisted through the existing profile APIs
 * so the address and GP widgets have real values to display. Occupied profile values are never overwritten.
 * Callers must gate rendering behind `import.meta.env.DEV`.
 */
export function SectionQaDemoDataPanel({
  tabId,
  tabTitle,
  questionIds,
  activeLevel,
  editable,
  sectionHasData,
  alreadyFilled,
  identity,
  serviceUserId,
  gpContactId,
  onProfilePersisted,
  onApply,
  onPickScenario,
}: Props) {
  const [running, setRunning] = React.useState(false)
  const scenarioLabel = activeLevel ? IA_CONDITION_LEVEL_LABELS[activeLevel] : null

  const doFill = React.useCallback(async () => {
    if (!activeLevel || running || !editable) return
    setRunning(true)
    try {
      const { answers, metadata, profilePatch } = await generateIaSectionDemoDev(
        activeLevel,
        tabId,
        questionIds,
        identity,
      )
      onApply(tabId, answers, metadata)
      if (serviceUserId && profilePatchHasValues(profilePatch)) {
        await persistIaDemoProfilePatch(serviceUserId, profilePatch, { gpContactId })
        await onProfilePersisted?.()
      }
      toastSuccess(IA_SECTION_DEMO_SUCCESS_TOAST, 'Review the values and use Save when you are ready.')
    } catch (e) {
      toastApiError(e, 'Could not generate section demo data')
    } finally {
      setRunning(false)
    }
  }, [
    activeLevel,
    running,
    editable,
    tabId,
    questionIds,
    identity,
    onApply,
    serviceUserId,
    gpContactId,
    onProfilePersisted,
  ])

  const disabled = !activeLevel || running || !editable

  const fillButton = (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="shrink-0"
      data-testid={`ia-section-demo-fill-${tabId}`}
      disabled={disabled}
      aria-busy={running}
      // When there is data to overwrite, InlineConfirm intercepts the click instead.
      onClick={sectionHasData && activeLevel ? undefined : () => void doFill()}
    >
      {running ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" aria-hidden />
      )}
      {running ? 'Filling…' : 'Fill Demo Data'}
    </Button>
  )

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed border-amber-400/70 bg-amber-50/60 px-3 py-2.5 dark:border-amber-500/40 dark:bg-amber-950/20',
      )}
      data-testid={`ia-section-demo-panel-${tabId}`}
    >
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">Demo data</span>
          {scenarioLabel ? (
            <Badge variant="outline" className="text-[10px] font-medium">
              {scenarioLabel}
            </Badge>
          ) : null}
          {alreadyFilled ? (
            <Badge
              variant="outline"
              className="border-emerald-500/60 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
              data-testid={`ia-section-demo-filled-${tabId}`}
            >
              ✓ Filled
            </Badge>
          ) : null}
        </div>
        <p className="text-xs leading-snug text-amber-800/90 dark:text-amber-200/80">
          {!editable
            ? 'This assessment is read-only (submitted/reviewed). Reopen it (Actions ▸ Reopen) to fill demo data.'
            : activeLevel
              ? `Populate this section with realistic ${scenarioLabel} scenario data. Only this section is filled, in the form — nothing is saved until you Save.`
              : 'Select a QA scenario first to enable section demo data.'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {activeLevel && sectionHasData ? (
          <InlineConfirm
            title={iaSectionDemoOverwriteConfirmText(IA_CONDITION_LEVEL_LABELS[activeLevel])}
            description={`“${tabTitle}” — only this section is replaced, in the form. Nothing is saved until you Save.`}
            confirmLabel="Replace"
            cancelLabel="Cancel"
            destructive
            disabled={disabled}
            onConfirm={() => void doFill()}
          >
            {fillButton}
          </InlineConfirm>
        ) : (
          fillButton
        )}
        {!activeLevel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            data-testid={`ia-section-demo-pick-${tabId}`}
            onClick={onPickScenario}
          >
            Select scenario
          </Button>
        ) : null}
      </div>
    </div>
  )
}
