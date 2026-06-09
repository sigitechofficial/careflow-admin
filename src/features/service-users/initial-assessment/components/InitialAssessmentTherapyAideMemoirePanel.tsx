import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { InitialAssessmentPaperYesNoRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperYesNoRow'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  IA_CHECKBOX_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type { TherapyAideMemoireMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import { THERAPY_AIDE_MEMOIRE_SCREENING_ITEMS } from '@/features/service-users/initial-assessment/utils/therapy-aide-memoire'

type Props = {
  value: TherapyAideMemoireMetadata
  disabled?: boolean
  onChange: (next: TherapyAideMemoireMetadata) => void
}

export function InitialAssessmentTherapyAideMemoirePanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<TherapyAideMemoireMetadata>) => onChange({ ...value, ...partial })

  const setItem = (
    key: (typeof THERAPY_AIDE_MEMOIRE_SCREENING_ITEMS)[number]['key'],
    item: { checked?: boolean; details?: string },
  ) => {
    patch({ [key]: { ...value[key], ...item } })
  }

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-therapy-aide-memoire-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Aide Memoire to establish therapy needs" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:border-slate-700">
          <ol className="space-y-4">
            {THERAPY_AIDE_MEMOIRE_SCREENING_ITEMS.map((item) => {
              const state = value[item.key]
              const showDetails = state?.checked && item.detailsPlaceholder

              return (
                <li
                  key={item.key}
                  className="flex flex-col gap-3 border-b border-border/60 pb-4 last:border-b-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <label
                    className={cn(
                      'flex min-w-0 cursor-pointer items-start gap-3',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      className={cn('mt-1 shrink-0', IA_CHECKBOX_CLASS)}
                      disabled={disabled}
                      checked={state?.checked === true}
                      onChange={(e) => setItem(item.key, { checked: e.target.checked })}
                      aria-label={`Screening item ${item.number}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">{item.number}.</span>
                      <ul className="mt-1 list-none space-y-0.5 text-sm text-foreground">
                        {item.questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </span>
                  </label>
                  <p className="text-sm font-medium text-teal-800 dark:text-teal-300 sm:max-w-[14rem] sm:text-right">
                    {item.recommendation}
                  </p>
                  </div>
                  {showDetails ? (
                    <Textarea
                      className={cn('min-h-[64px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                      disabled={disabled}
                      placeholder={item.detailsPlaceholder}
                      value={state?.details ?? ''}
                      onChange={(e) => setItem(item.key, { details: e.target.value })}
                    />
                  ) : null}
                </li>
              )
            })}
          </ol>

          <section className="space-y-4 rounded-sm border border-slate-300 p-4 dark:border-slate-600">
            <InitialAssessmentPaperYesNoRow
              label="Is further referral required?"
              name="therapy-further-referral"
              value={value.furtherReferralRequired ?? null}
              disabled={disabled}
              showDivider={false}
              onChange={(v) =>
                patch({
                  furtherReferralRequired: v,
                  ...(v ? {} : { referralCompleted: null, referralDate: undefined }),
                })
              }
            />
            <InitialAssessmentPaperYesNoRow
              label="Referral completed?"
              name="therapy-referral-completed"
              value={value.referralCompleted ?? null}
              disabled={disabled || value.furtherReferralRequired !== true}
              showDivider={false}
              onChange={(v) =>
                patch({
                  referralCompleted: v,
                  ...(v ? {} : { referralDate: undefined }),
                })
              }
            />
            <div>
              <Label htmlFor="therapy-referral-date" className={IA_QUESTION_LABEL_CLASS}>
                Date
              </Label>
              <Input
                id="therapy-referral-date"
                type="date"
                className="mt-1 h-10 max-w-xs"
                disabled={disabled || value.referralCompleted !== true}
                value={value.referralDate?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  patch({
                    referralDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="therapy-additional-comments" className={IA_QUESTION_LABEL_CLASS}>
                Additional comments
              </Label>
              <Textarea
                id="therapy-additional-comments"
                className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                disabled={disabled}
                value={value.additionalComments ?? ''}
                onChange={(e) => patch({ additionalComments: e.target.value })}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
