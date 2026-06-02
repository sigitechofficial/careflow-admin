import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { Loader2 } from 'lucide-react'
import {
  formatPreferredVisitTimesAnswer,
  isFlexibleVisitSlot,
  isPreferredVisitTimesQuestion,
  parsePreferredVisitTimesValue,
  serializePreferredVisitTimesValue,
  type PreferredVisitTimesValue,
} from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import { resolveVisitTimeSlotOptions } from '@/features/service-users/initial-assessment/utils/visit-time-slot-options'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'
import {
  IA_CHECKBOX_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  errorMessage?: string | null
  disabled?: boolean
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

function toInput(questionId: string, patch: Partial<InitialAssessmentAnswerInput>): InitialAssessmentAnswerInput {
  return { questionId, ...patch }
}

export function InitialAssessmentPreferredVisitTimesField({
  question,
  value,
  errorMessage,
  disabled,
  onChange,
}: Props) {
  const lookupsQuery = useMedicationLookups(isPreferredVisitTimesQuestion(question))
  const rounds = lookupsQuery.data?.rounds ?? []
  const slotOptions = resolveVisitTimeSlotOptions(question, rounds)

  if (!isPreferredVisitTimesQuestion(question)) return null

  const state = parsePreferredVisitTimesValue(value?.selectedOptions, slotOptions)
  const qid = question.id

  const patchState = (next: PreferredVisitTimesValue) => {
    onChange(
      toInput(qid, {
        ...value,
        selectedOptions: serializePreferredVisitTimesValue(next, slotOptions),
      }),
    )
  }

  const toggleSlot = (slotValue: string, checked: boolean) => {
    const opt = slotOptions.find((o) => o.value === slotValue)
    if (!opt) return
    patchState({
      ...state,
      [slotValue]: {
        selected: checked,
        roundName: opt.label,
        ...(isFlexibleVisitSlot(slotValue, slotOptions)
          ? {}
          : {
              from: state[slotValue]?.from ?? opt.defaultFrom,
              to: state[slotValue]?.to ?? opt.defaultTo,
            }),
      },
    })
  }

  const updateTime = (slotValue: string, field: 'from' | 'to', time: string) => {
    const opt = slotOptions.find((o) => o.value === slotValue)
    const current = state[slotValue] ?? { selected: true, roundName: opt?.label }
    patchState({
      ...state,
      [slotValue]: { ...current, selected: true, [field]: time, roundName: opt?.label ?? current.roundName },
    })
  }

  const summary = formatPreferredVisitTimesAnswer(value, question, rounds)

  return (
    <div className="space-y-3" data-testid="ia-preferred-visit-times">
      <div>
        <Label className={IA_QUESTION_LABEL_CLASS}>
          {question.questionText}
          {question.isRequired ? (
            <span className="text-teal-700 dark:text-teal-400" aria-hidden>
              {' '}
              *
            </span>
          ) : null}
        </Label>
        <p className={cn('mt-1', IA_HINT_CLASS)}>
          Same administration time slots as medication (Morning → Night). Tick each window the service user prefers
          for visits, then adjust start and end times if needed. Links to rota planning.
        </p>
      </div>

      {lookupsQuery.isLoading ? (
        <p className={cn('flex items-center gap-2', IA_HINT_CLASS)}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading time slots…
        </p>
      ) : null}

      <ul className="space-y-2">
        {slotOptions.map((opt) => {
          const slot = state[opt.value] ?? {
            selected: false,
            roundName: opt.label,
            from: opt.defaultFrom,
            to: opt.defaultTo,
          }
          const showTimes = !isFlexibleVisitSlot(opt.value, slotOptions)

          return (
            <li
              key={opt.value}
              className={cn(
                'rounded-lg border border-border bg-background p-3',
                slot.selected && 'border-teal-600/40 bg-teal-50/30 dark:bg-teal-950/20',
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className={cn('flex cursor-pointer items-start gap-2.5', IA_OPTION_LABEL_CLASS)}>
                  <input
                    type="checkbox"
                    className={cn('mt-0.5', IA_CHECKBOX_CLASS)}
                    checked={slot.selected}
                    disabled={disabled}
                    onChange={(e) => toggleSlot(opt.value, e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-foreground">{opt.displayLabel}</span>
                    {showTimes && opt.defaultFrom && opt.defaultTo ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Default window: {opt.defaultFrom} – {opt.defaultTo}
                      </span>
                    ) : null}
                  </span>
                </label>

                {showTimes ? (
                  <div className="flex flex-wrap items-center gap-2 sm:ms-4 sm:shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor={`${qid}-${opt.value}-from`} className="sr-only">
                        {opt.label} visit window start
                      </Label>
                      <span className="text-xs text-muted-foreground">From</span>
                      <Input
                        id={`${qid}-${opt.value}-from`}
                        type="time"
                        className="h-9 w-[7.25rem] text-sm"
                        disabled={disabled || !slot.selected}
                        value={slot.from ?? ''}
                        onChange={(e) => updateTime(opt.value, 'from', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor={`${qid}-${opt.value}-to`} className="sr-only">
                        {opt.label} visit window end
                      </Label>
                      <span className="text-xs text-muted-foreground">To</span>
                      <Input
                        id={`${qid}-${opt.value}-to`}
                        type="time"
                        className="h-9 w-[7.25rem] text-sm"
                        disabled={disabled || !slot.selected}
                        value={slot.to ?? ''}
                        onChange={(e) => updateTime(opt.value, 'to', e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {Object.values(state).some((s) => s.selected) ? (
        <p className={cn('rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground', IA_HINT_CLASS)}>
          <span className="font-medium text-foreground">Summary: </span>
          {summary === '—' ? 'No windows selected' : summary}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
