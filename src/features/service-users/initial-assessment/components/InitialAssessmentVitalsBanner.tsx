import { AlertTriangle, Stethoscope } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  competentToRecordVitals,
  hasAnyVitalSignEntered,
  VITAL_FIELD_RULES,
} from '@/features/service-users/initial-assessment/utils/vitals-validation'
import {
  IA_CALLOUT_AMBER_CLASS,
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_CALLOUT_SKY_CLASS,
  IA_CALLOUT_TITLE_CLASS,
  IA_HINT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
}

export function InitialAssessmentVitalsBanner({ sections, draftAnswers }: Props) {
  const competent = competentToRecordVitals(sections, draftAnswers)
  const vitalsEntered = hasAnyVitalSignEntered(sections, draftAnswers)

  return (
    <div className="space-y-3">
      <div className={IA_CALLOUT_SKY_CLASS}>
        <div className="flex items-start gap-3">
          <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
          <div>
            <p className={cn(IA_CALLOUT_TITLE_CLASS, 'text-sky-950 dark:text-sky-100')}>
              Physical assessment — competent person only
            </p>
            <p className={cn('mt-1', IA_HINT_CLASS)}>
              Baseline vital signs must be recorded by a staff member who is competent to take clinical
              observations. Confirm competency in section 4.1 before entering values below.
            </p>
          </div>
        </div>
      </div>

      {competent === false ? (
        <div className={cn(IA_CALLOUT_AMBER_CLASS, 'flex items-start gap-3')} role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <div>
            <p className={cn(IA_CALLOUT_TITLE_CLASS, 'text-amber-950 dark:text-amber-100')}>
              Assessor not competent — clinical fields locked
            </p>
            <p className={cn('mt-1', IA_HINT_CLASS)}>
              Change &ldquo;Assessor competent to record vital signs?&rdquo; to Yes, or ask a competent
              colleague to complete observations.
            </p>
          </div>
        </div>
      ) : competent === null && vitalsEntered ? (
        <div className={cn(IA_CALLOUT_AMBER_CLASS, 'flex items-start gap-3')} role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <p className={cn('text-sm', 'text-amber-950 dark:text-amber-100')}>
            Confirm assessor competency before recording vital signs.
          </p>
        </div>
      ) : null}

      <details className={cn(IA_CALLOUT_NEUTRAL_CLASS, IA_HINT_CLASS)}>
        <summary className="cursor-pointer text-sm font-medium text-foreground">Accepted ranges</summary>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {VITAL_FIELD_RULES.map((rule) => (
            <li key={rule.fieldKey}>
              <span className={cn('font-medium text-foreground')}>{rule.label}:</span>{' '}
              {rule.min}–{rule.max} {rule.unit}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
