import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import type { ServiceUserDetail } from '@/features/service-users/api'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import { IA_SECTION_BODY_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  ABBEY_FOOTER_CITATION,
  ABBEY_ITEMS,
  ABBEY_SCORING_LEGEND,
  ABBEY_SEVERITY_BANDS,
  NRS_SCALE_ANCHORS,
  NRS_VERBAL_LABELS,
  PAIN_TYPE_OPTIONS,
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  nrsScoreColor,
  parseAbbeyScoreInput,
  type AbbeyScore,
  type PainAssessmentMetadata,
  type PainSeverityBand,
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
  /** @deprecated Not shown on the paper pain tool worksheet. */
  serviceUserDetail?: ServiceUserDetail | null
  onChange: (next: PainAssessmentMetadata) => void
}

const SCORE_INPUT_CLASS = 'h-9 w-16 text-center font-mono text-sm tabular-nums'

function PainToolsWorksheet({
  value,
  disabled,
  onChange,
}: {
  value: PainAssessmentMetadata
  disabled?: boolean
  onChange: (next: PainAssessmentMetadata) => void
}) {
  const abbeyTotal = computeAbbeyTotal(value.abbey)
  const computedBand = abbeySeverityFromTotal(abbeyTotal)

  const patch = (next: PainAssessmentMetadata) => onChange(next)

  const setNrs = (score: number) => {
    patch({ ...value, nrsScore: score })
  }

  const setAbbeyScore = (key: (typeof ABBEY_ITEMS)[number]['key'], score: AbbeyScore | undefined) => {
    const abbey = { ...value.abbey, [key]: score }
    const total = computeAbbeyTotal(abbey)
    patch({
      ...value,
      abbey: {
        ...abbey,
        severityBand: abbeySeverityFromTotal(total),
      },
    })
  }

  const setAbbeyField = <K extends keyof NonNullable<PainAssessmentMetadata['abbey']>>(
    key: K,
    fieldValue: NonNullable<PainAssessmentMetadata['abbey']>[K],
  ) => {
    patch({ ...value, abbey: { ...value.abbey, [key]: fieldValue } })
  }

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-pain-assessment-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Pain assessment tool" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:border-slate-700">
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
                { key: 'item', header: 'Abbey pain scale', className: 'w-[70%]' },
                { key: 'score', header: 'Score', className: 'w-[20%] text-center' },
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
                    <HolisticAssessmentTableCell className="text-center align-top">
                      <Input
                        type="number"
                        min={0}
                        max={3}
                        step={1}
                        inputMode="numeric"
                        className={SCORE_INPUT_CLASS}
                        disabled={disabled}
                        placeholder="0"
                        aria-label={`${item.label} score`}
                        value={score != null ? String(score) : ''}
                        onChange={(e) =>
                          setAbbeyScore(item.key, parseAbbeyScoreInput(e.target.value))
                        }
                      />
                    </HolisticAssessmentTableCell>
                  </HolisticAssessmentTableRow>
                )
              })}
              <HolisticAssessmentTableRow>
                <HolisticAssessmentTableCell className="align-top text-sm font-semibold" colSpan={2}>
                  Total (add scores for Q1–6)
                </HolisticAssessmentTableCell>
                <HolisticAssessmentTableCell className="text-center align-top">
                  <span className="font-mono text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-300">
                    {abbeyTotal}
                  </span>
                </HolisticAssessmentTableCell>
              </HolisticAssessmentTableRow>
            </HolisticAssessmentTable>
          </section>

          <section className="space-y-3">
            <p className="rounded-sm bg-sky-100 px-3 py-2 text-sm font-medium text-foreground dark:bg-sky-950/40">
              Tick the box that matches the Total Pain Score
            </p>
            <HolisticAssessmentTable
              columns={ABBEY_SEVERITY_BANDS.map((band) => ({
                key: band.id,
                header: `${band.range}: ${band.label}`,
                className: 'text-center',
              }))}
            >
              <HolisticAssessmentTableRow>
                {ABBEY_SEVERITY_BANDS.map((band) => (
                  <HolisticAssessmentTableCell key={band.id} className="text-center align-middle">
                    <label
                      className={cn(
                        'inline-flex cursor-pointer items-center justify-center',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <input
                        type="radio"
                        name="abbey-severity-band"
                        className={IA_RADIO_CLASS}
                        disabled={disabled}
                        checked={(value.abbey?.severityBand ?? computedBand) === band.id}
                        onChange={() => setAbbeyField('severityBand', band.id as PainSeverityBand)}
                        aria-label={`${band.range} ${band.label}`}
                      />
                    </label>
                  </HolisticAssessmentTableCell>
                ))}
              </HolisticAssessmentTableRow>
            </HolisticAssessmentTable>
          </section>

          <section className="space-y-3">
            <p className="rounded-sm bg-sky-100 px-3 py-2 text-sm font-medium text-foreground dark:bg-sky-950/40">
              Tick the box that matches the type of pain
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
                        onChange={() => setAbbeyField('painType', opt.value as PainType)}
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
        </div>
      </div>
    </div>
  )
}

export function InitialAssessmentPainAssessmentPanel({ value, disabled, onChange }: Props) {
  return <PainToolsWorksheet value={value} disabled={disabled} onChange={onChange} />
}
