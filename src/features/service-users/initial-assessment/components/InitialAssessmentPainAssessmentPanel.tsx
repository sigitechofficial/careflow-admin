import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { cn } from '@/shared/lib/utils'
import type { ServiceUserDetail } from '@/features/service-users/api'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import { IA_SECTION_BODY_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  ABBEY_FOOTER_CITATION,
  ABBEY_ITEMS,
  ABBEY_SCORING_LEGEND,
  ABBEY_SCORE_OPTIONS,
  ABBEY_SEVERITY_BANDS,
  NRS_SCALE_ANCHORS,
  NRS_VERBAL_LABELS,
  PAIN_SCALE_OPTIONS,
  PAIN_TYPE_OPTIONS,
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  enrichAbbeyMetadata,
  isAbbeyAssessmentComplete,
  nrsScoreColor,
  type AbbeyScore,
  type PainAssessmentMetadata,
  type PainScaleUsed,
  type PainType,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import {
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: PainAssessmentMetadata
  disabled?: boolean
  /** Advisory only. Assessor may still use NRS, Abbey, or both. */
  recommendedScale?: Exclude<PainScaleUsed, 'both'>
  /** @deprecated Not shown on the paper pain tool worksheet. */
  serviceUserDetail?: ServiceUserDetail | null
  onChange: (next: PainAssessmentMetadata) => void
}

function PainToolsWorksheet({
  value,
  disabled,
  recommendedScale = 'nrs',
  onChange,
}: {
  value: PainAssessmentMetadata
  disabled?: boolean
  recommendedScale?: Exclude<PainScaleUsed, 'both'>
  onChange: (next: PainAssessmentMetadata) => void
}) {
  const abbey = enrichAbbeyMetadata(value.abbey)
  const abbeyTotal = computeAbbeyTotal(abbey)
  const computedBand = abbeySeverityFromTotal(abbeyTotal)
  const scaleUsed = value.scaleUsed
  const recommendedLabel =
    recommendedScale === 'abbey' ? 'Abbey Pain Scale' : 'Numeric Rating Scale (NRS)'

  const patch = (next: PainAssessmentMetadata) => onChange(next)

  const setScaleUsed = (next: PainScaleUsed) => {
    patch({ ...value, scaleUsed: next })
  }

  const inferScaleUsed = (using: 'nrs' | 'abbey'): PainScaleUsed => {
    if (scaleUsed) return scaleUsed
    if (using === 'nrs' && isAbbeyAssessmentComplete(value.abbey)) return 'both'
    if (using === 'abbey' && value.nrsScore != null) return 'both'
    return using
  }

  const setNrs = (score: number) => {
    patch({ ...value, nrsScore: score, scaleUsed: inferScaleUsed('nrs') })
  }

  const setAbbeyScore = (key: (typeof ABBEY_ITEMS)[number]['key'], score: AbbeyScore | undefined) => {
    const nextAbbey = enrichAbbeyMetadata({ ...value.abbey, [key]: score })
    patch({
      ...value,
      scaleUsed: inferScaleUsed('abbey'),
      abbey: nextAbbey,
    })
  }

  const setPainType = (painType: PainType) => {
    patch({
      ...value,
      abbey: enrichAbbeyMetadata({ ...value.abbey, painType }),
    })
  }

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-pain-assessment-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Pain assessment tool" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <section className="space-y-3" data-testid="ia-pain-scale-used">
            <h4 className={IA_QUESTION_LABEL_CLASS}>Scale used</h4>
            <p
              className={cn(
                'rounded-sm border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-foreground dark:border-teal-900 dark:bg-teal-950/40',
              )}
              data-testid="ia-pain-scale-recommended"
            >
              Recommended: <span className="font-semibold">{recommendedLabel}</span>
              {recommendedScale === 'abbey'
                ? ' — existing IA information indicates cognitive impairment, diagnosed dementia, or speech/communication impairment.'
                : '.'}{' '}
              You can use NRS, Abbey, or both. Completing both is not required.
            </p>
            <div className="flex flex-wrap gap-4">
              {PAIN_SCALE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'inline-flex items-center gap-2 text-sm',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="pain-scale-used"
                    className={IA_RADIO_CLASS}
                    disabled={disabled}
                    checked={scaleUsed === opt.value}
                    onChange={() => setScaleUsed(opt.value)}
                    aria-label={opt.label}
                  />
                  <span>
                    {opt.label}
                    {opt.value === recommendedScale ? (
                      <span className="ml-1 text-xs font-medium text-teal-800 dark:text-teal-300">
                        (recommended)
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              0–10 Numeric Rating Scale (NRS) and Verbal Rating Scale (VRS)
            </h4>
            <div className="overflow-x-auto">
              <div className="min-w-[32rem]">
                <div className="flex h-4 overflow-hidden rounded-sm">
                  {Array.from({ length: 11 }, (_, i) => (
                    <div key={i} className={cn('flex-1', nrsScoreColor(i))} />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs font-medium text-muted-foreground">
                  {Array.from({ length: 11 }, (_, i) => (
                    <span key={i} className="w-6 text-center tabular-nums">
                      {i}
                    </span>
                  ))}
                </div>
                <div className="relative mt-2 h-10 text-xs text-muted-foreground">
                  {NRS_SCALE_ANCHORS.map((anchor) => (
                    <span
                      key={anchor.score}
                      className="absolute -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${(anchor.score / 10) * 100}%` }}
                    >
                      {anchor.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, score) => {
                const active = value.nrsScore === score
                return (
                  <button
                    key={score}
                    type="button"
                    disabled={disabled}
                    title={NRS_VERBAL_LABELS[score]}
                    onClick={() => setNrs(score)}
                    className={cn(
                      'flex h-10 min-w-[2.5rem] flex-col items-center justify-center rounded-md border px-2 text-sm font-semibold tabular-nums transition-colors',
                      active
                        ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
                        : 'border-border bg-background hover:bg-muted/60',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {score}
                  </button>
                )
              })}
            </div>
            {value.nrsScore != null ? (
              <p className="text-sm">
                <span className="font-medium">Selected:</span> {value.nrsScore}/10 —{' '}
                {NRS_VERBAL_LABELS[value.nrsScore] ?? '—'}
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Abbey pain scale</h4>
            <p className={cn('text-sm', IA_HINT_CLASS)}>
              For measurement of pain in people with dementia who cannot verbalise
            </p>
            <p className="rounded-sm bg-sky-100 px-3 py-2 text-sm font-medium text-foreground dark:bg-sky-950/40">
              {ABBEY_SCORING_LEGEND}
            </p>

            <HolisticAssessmentTable
              columns={[
                { key: 'id', header: '', className: 'w-10 text-center' },
                { key: 'item', header: 'Abbey pain scale', className: 'w-[55%]' },
                { key: 'score', header: 'Score', className: 'w-[35%]' },
              ]}
            >
              {ABBEY_ITEMS.map((item, index) => {
                const score = value.abbey?.[item.key]
                return (
                  <HolisticAssessmentTableRow key={item.key}>
                    <HolisticAssessmentTableCell className="text-center align-top font-mono text-sm tabular-nums">
                      Q{index + 1}
                    </HolisticAssessmentTableCell>
                    <HolisticAssessmentTableCell className="align-top text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground"> ({item.description})</span>
                    </HolisticAssessmentTableCell>
                    <HolisticAssessmentTableCell className="align-top">
                      <fieldset disabled={disabled} className="flex flex-col gap-1">
                        <legend className="sr-only">{item.label} score</legend>
                        {ABBEY_SCORE_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={cn(
                              'inline-flex items-center gap-2 text-sm',
                              disabled && 'cursor-not-allowed opacity-60',
                            )}
                          >
                            <input
                              type="radio"
                              name={`abbey-${item.key}`}
                              className={IA_RADIO_CLASS}
                              disabled={disabled}
                              checked={score === opt.value}
                              onChange={() => setAbbeyScore(item.key, opt.value)}
                              aria-label={`${item.label}: ${opt.value} — ${opt.label}`}
                            />
                            <span>
                              {opt.value} — {opt.label}
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    </HolisticAssessmentTableCell>
                  </HolisticAssessmentTableRow>
                )
              })}
              <HolisticAssessmentTableRow>
                <HolisticAssessmentTableCell className="align-top text-sm font-semibold" colSpan={2}>
                  Total (add scores for Q1–6)
                </HolisticAssessmentTableCell>
                <HolisticAssessmentTableCell className="text-center align-top">
                  <span
                    className="font-mono text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-300"
                    data-testid="ia-abbey-total"
                  >
                    {abbeyTotal}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">/18</span>
                </HolisticAssessmentTableCell>
              </HolisticAssessmentTableRow>
            </HolisticAssessmentTable>
          </section>

          <section className="space-y-3">
            <p className="rounded-sm bg-sky-100 px-3 py-2 text-sm font-medium text-foreground dark:bg-sky-950/40">
              Calculated severity (read-only — derived from the Abbey total)
            </p>
            <HolisticAssessmentTable
              columns={ABBEY_SEVERITY_BANDS.map((band) => ({
                key: band.id,
                header: `${band.range}: ${band.label}`,
                className: 'text-center',
              }))}
            >
              <HolisticAssessmentTableRow>
                {ABBEY_SEVERITY_BANDS.map((band) => {
                  const active = computedBand === band.id
                  return (
                    <HolisticAssessmentTableCell
                      key={band.id}
                      className={cn(
                        'text-center align-middle text-sm font-medium',
                        active && 'bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200',
                      )}
                    >
                      {active ? (
                        <span data-testid="ia-abbey-severity-band">{band.label}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </HolisticAssessmentTableCell>
                  )
                })}
              </HolisticAssessmentTableRow>
            </HolisticAssessmentTable>
          </section>

          <section className="space-y-3">
            <p className="rounded-sm bg-sky-100 px-3 py-2 text-sm font-medium text-foreground dark:bg-sky-950/40">
              The type of pain I have
            </p>
            <HolisticAssessmentTable
              columns={PAIN_TYPE_OPTIONS.map((opt) => ({
                key: opt.value,
                header: opt.label,
                className: 'text-center',
              }))}
            >
              <HolisticAssessmentTableRow>
                {PAIN_TYPE_OPTIONS.map((opt) => (
                  <HolisticAssessmentTableCell key={opt.value} className="text-center align-middle">
                    <label
                      className={cn(
                        'inline-flex cursor-pointer items-center justify-center',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <input
                        type="radio"
                        name="pain-type"
                        className={IA_RADIO_CLASS}
                        disabled={disabled}
                        checked={value.abbey?.painType === opt.value}
                        onChange={() => setPainType(opt.value)}
                        aria-label={opt.label}
                      />
                    </label>
                  </HolisticAssessmentTableCell>
                ))}
              </HolisticAssessmentTableRow>
            </HolisticAssessmentTable>
          </section>

          <p className={cn('border-t border-slate-200 pt-4 text-xs italic', IA_HINT_CLASS)}>
            {ABBEY_FOOTER_CITATION}
          </p>
          {value.abbey?.dateCompleted || value.abbey?.assessorNameDesignation ? (
            <p className={IA_HINT_CLASS} data-testid="ia-pain-completion-stamp">
              {[
                value.abbey?.dateCompleted
                  ? `Completed ${value.abbey.dateCompleted.slice(0, 10)}`
                  : null,
                value.abbey?.assessorNameDesignation,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function InitialAssessmentPainAssessmentPanel({
  value,
  disabled,
  recommendedScale,
  onChange,
}: Props) {
  return (
    <PainToolsWorksheet
      value={value}
      disabled={disabled}
      recommendedScale={recommendedScale}
      onChange={onChange}
    />
  )
}
