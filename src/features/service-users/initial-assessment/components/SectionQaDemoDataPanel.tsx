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
} from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'
import { runIaSectionDemoDev } from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'

type Props = {
  tabId: number
  tabTitle: string
  serviceUserId: string | null
  /** The exact questionIds this tab renders (backend still drops profile/secure fields). */
  questionIds: string[]
  /** Active QA scenario, or null when none picked yet. */
  activeLevel: IaAutofillLevel | null
  /** Whether this section already holds answers/worksheet data (drives the overwrite confirm). */
  sectionHasData: boolean
  /** Refresh IA queries after a fill. */
  onFilled: () => Promise<void>
  /** Open the scenario selector (when no scenario is active yet). */
  onPickScenario: () => void
}

/**
 * Dev/QA-only panel: fills THIS section with demo data at the active severity.
 * Only this section changes — other tabs are never touched, and the assessment is never submitted.
 * Callers must gate rendering behind `import.meta.env.DEV`.
 */
export function SectionQaDemoDataPanel({
  tabId,
  tabTitle,
  serviceUserId,
  questionIds,
  activeLevel,
  sectionHasData,
  onFilled,
  onPickScenario,
}: Props) {
  const [running, setRunning] = React.useState(false)
  const scenarioLabel = activeLevel ? IA_CONDITION_LEVEL_LABELS[activeLevel] : null

  const doFill = React.useCallback(async () => {
    if (!serviceUserId || !activeLevel || running) return
    setRunning(true)
    try {
      const result = await runIaSectionDemoDev(serviceUserId, activeLevel, tabId, questionIds)
      toastSuccess(IA_SECTION_DEMO_SUCCESS_TOAST, result.message)
      await onFilled()
    } catch (e) {
      toastApiError(e, 'Section demo data failed to load')
    } finally {
      setRunning(false)
    }
  }, [serviceUserId, activeLevel, running, tabId, questionIds, onFilled])

  const disabled = !serviceUserId || !activeLevel || running

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
        </div>
        <p className="text-xs leading-snug text-amber-800/90 dark:text-amber-200/80">
          {activeLevel
            ? `Populate this section with realistic ${scenarioLabel} scenario data. Only this section will change.`
            : 'Select a QA scenario first to enable section demo data.'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {activeLevel && sectionHasData ? (
          <InlineConfirm
            title="Replace this section’s data?"
            description={`This section already contains data. Filling demo data will replace the existing answers in “${tabTitle}”. Other sections are not affected.`}
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
