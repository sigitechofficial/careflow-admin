import { ArrowRight } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { CarePathwayOverview } from '@/features/care-pathway/types/care-pathway.types'
import { useCarePathwayOverview } from '@/features/care-pathway/hooks/useCarePathwayOverview'
import { cn } from '@/shared/lib/utils'

function FlowBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded border border-border bg-card px-3 py-2 text-center text-xs font-medium leading-snug text-foreground shadow-sm sm:text-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

function FlowArrow() {
  return (
    <ArrowRight className="mx-1 hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
  )
}

function StageLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('mb-3 text-center text-xs font-bold uppercase tracking-wide sm:text-sm', className)}>
      {children}
    </p>
  )
}

const FALLBACK_OVERVIEW: CarePathwayOverview = {
  tabs: [],
  purpose:
    'Configure care plans, assessments, actions (with checklists), and other forms for your service.',
  wizardSteps: [],
  implementationStatus: {},
}

export function CarePathwayWizardPanel() {
  const { data, error: queryError } = useCarePathwayOverview()
  const overview = data ?? FALLBACK_OVERVIEW
  const apiError =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load care pathway overview.'
        : null

  return (
    <div className="space-y-8" data-testid="care-pathway-wizard-panel">
      <div>
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Care Pathway Wizard</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{overview.purpose}</p>
        {apiError && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Using offline wizard copy (API: {apiError}).
          </p>
        )}
      </div>

      <div
        className="grid gap-6 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6"
        role="img"
        aria-label="Care pathway configure, plan, and care stages"
      >
        <div className="space-y-4 border-b border-dashed border-sky-300/60 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
          <StageLabel className="text-sky-700 dark:text-sky-400">Configure</StageLabel>
          <div className="flex flex-col items-stretch gap-2 sm:items-center">
            <div className="flex flex-wrap items-center justify-center gap-1">
              <FlowBox>Form Builder (optional)</FlowBox>
              <FlowArrow />
              <FlowBox>Select Default Forms</FlowBox>
              <FlowArrow />
              <FlowBox>Care Plan Text</FlowBox>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 pt-2">
              <FlowBox>Pre-set Checklists</FlowBox>
              <FlowArrow />
              <FlowBox>Pre-set Actions/Visits</FlowBox>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-b border-dashed border-violet-300/60 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
          <StageLabel className="text-violet-700 dark:text-violet-400">Plan</StageLabel>
          <div className="flex flex-col items-center gap-3">
            <FlowBox className="w-full max-w-[14rem]">Write Care Plans</FlowBox>
            <FlowBox className="w-full max-w-[14rem]">Define Personalised Actions/Visits</FlowBox>
          </div>
        </div>

        <div className="space-y-4">
          <StageLabel className="text-emerald-700 dark:text-emerald-400">Care</StageLabel>
          <div className="flex justify-center">
            <FlowBox className="w-full max-w-[14rem] bg-emerald-50 dark:bg-emerald-950/30">
              Deliver Consistent Care
            </FlowBox>
          </div>
        </div>
      </div>

      {overview.wizardSteps.length > 0 && (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {overview.wizardSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}

      <div className="space-y-4 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Form Builder â€”</span> Optional customised forms for care
          plans, assessments, service management, and staff appraisals. Standard forms apply if unused.
        </p>
        <p>
          <span className="font-semibold text-foreground">Select Default Forms â€”</span> Choose which published forms
          your organisation uses by default.
        </p>
        <p>
          <span className="font-semibold text-foreground">Care Plan Text â€”</span> Pre-set wording with{' '}
          <code className="text-foreground">@</code> for quick personalisation.
        </p>
        <p>
          <span className="font-semibold text-foreground">Pre-set Checklists â€”</span> Standard checklists for routines,
          visits, or group care.
        </p>
        <p>
          <span className="font-semibold text-foreground">Pre-set Actions/Visits â€”</span> Template actions staff
          personalise per service user.
        </p>
      </div>
    </div>
  )
}
