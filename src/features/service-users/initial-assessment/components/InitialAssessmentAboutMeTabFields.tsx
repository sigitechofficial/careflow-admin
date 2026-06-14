import * as React from 'react'
import { CalendarClock, CalendarDays } from 'lucide-react'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import {
  ROUTINE_DAYS,
  ROUTINE_DAY_LABEL,
  ROUTINE_SLOTS,
  ROUTINE_SLOT_LABEL,
  type RoutineDay,
  type RoutineSlot,
} from '@/features/service-users/service-user-about-me'
import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import {
  mergePrefillAnswer,
  prefillHintForQuestion,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'

type Props = {
  questions: InitialAssessmentQuestion[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  prefillMap: Map<string, string>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}

function routineCell(
  questions: InitialAssessmentQuestion[],
  day: RoutineDay,
  slot: RoutineSlot,
): InitialAssessmentQuestion | undefined {
  return questions.find((q) => {
    const m = q.metadata
    return m?.aboutMeRoutineDay === day && m?.aboutMeRoutineSlot === slot
  })
}

export function InitialAssessmentAboutMeRoutineGrid({
  questions,
  draftAnswers,
  prefillMap,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  onChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 dark:border-sky-400/20 dark:bg-sky-400/10">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Use the grid for a typical week. Leave cells blank if not applicable. Answers are saved on this
          assessment.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-10 border-r border-border bg-muted/40 px-2 py-2 text-left font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  Time
                </span>
              </th>
              {ROUTINE_DAYS.map((d) => (
                <th key={d} className="min-w-[7rem] px-2 py-2 text-left font-medium text-muted-foreground">
                  {ROUTINE_DAY_LABEL[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROUTINE_SLOTS.map((slot) => (
              <tr key={slot} className="border-b border-border last:border-0">
                <th className="sticky left-0 z-10 border-r border-border bg-muted/20 px-2 py-2 text-left font-medium text-foreground">
                  {ROUTINE_SLOT_LABEL[slot]}
                </th>
                {ROUTINE_DAYS.map((day) => {
                  const q = routineCell(questions, day, slot)
                  if (!q) {
                    return (
                      <td key={`${day}-${slot}`} className="align-top p-1">
                        <span className="text-xs text-muted-foreground">—</span>
                      </td>
                    )
                  }
                  return (
                    <td key={`${day}-${slot}`} className="align-top p-1">
                      <div className="[&_textarea]:min-h-[4rem] [&_textarea]:text-xs">
                        <InitialAssessmentQuestionField
                          question={q}
                          value={mergePrefillAnswer(q, draftAnswers[q.id], prefillMap)}
                          errorMessage={questionErrors?.get(q.id)}
                          disabled={disabled}
                          serviceUserId={serviceUserId}
                          submissionId={submissionId}
                          layout="simple"
                          hideLabel
                          plainText
                          prefillHint={prefillHintForQuestion(q, prefillMap)}
                          onChange={(patch) => onChange(q.id, patch)}
                        />
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function InitialAssessmentAboutMeTabFields({
  questions,
  draftAnswers,
  prefillMap,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  onChange,
  tabId,
}: Props & { tabId: string }) {
  const tabQuestions = questions.filter((q) => q.metadata?.aboutMeTab === tabId)

  if (tabId === 'routine') {
    return (
      <InitialAssessmentAboutMeRoutineGrid
        questions={questions}
        draftAnswers={draftAnswers}
        prefillMap={prefillMap}
        questionErrors={questionErrors}
        disabled={disabled}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        onChange={onChange}
      />
    )
  }

  return (
    <div className="space-y-4">
      {tabQuestions.map((q) => (
        <div
          key={q.id}
          className={cn(
            'rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5',
            q.questionType === 'TEXT' && 'sm:max-w-2xl',
          )}
        >
          <InitialAssessmentQuestionField
            question={q}
            value={mergePrefillAnswer(q, draftAnswers[q.id], prefillMap)}
            errorMessage={questionErrors?.get(q.id)}
            disabled={disabled}
            serviceUserId={serviceUserId}
            submissionId={submissionId}
            layout="simple"
            prefillHint={prefillHintForQuestion(q, prefillMap)}
            onChange={(patch) => onChange(q.id, patch)}
          />
        </div>
      ))}
    </div>
  )
}
