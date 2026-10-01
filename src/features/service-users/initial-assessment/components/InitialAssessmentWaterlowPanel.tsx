import * as React from 'react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  IA_CHECKBOX_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  WATERLOW_EQUIPMENT_CATALOG,
  WATERLOW_RISK_THRESHOLDS,
  WATERLOW_TABLE_SECTIONS,
  WATERLOW_USE_INSTRUCTIONS,
  WATERLOW_WEIGHT_LOSS_OPTIONS,
  computeWaterlowScore,
  enrichWaterlowMetadata,
  isWaterlowMultiOptionSelected,
  resolveWaterlowSingleOptionId,
  resolveWaterlowWeightLossOptionId,
  selectWaterlowSingleOption,
  selectWaterlowWeightLossOption,
  toggleWaterlowMultiOption,
  waterlowBand,
  waterlowCarePlanRequired,
  waterlowEquipmentGuidance,
  waterlowSelectionBreakdown,
  type WaterlowMetadata,
  type WaterlowTableSection,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

type Props = {
  value: WaterlowMetadata
  disabled?: boolean
  onChange: (next: WaterlowMetadata) => void
  /** Shown under the next review date (IA only: where the default interval comes from). */
  nextReviewHint?: string
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex min-w-[2rem] justify-center font-mono text-sm font-semibold tabular-nums text-teal-800 dark:text-teal-300">
      {score}
    </span>
  )
}

function CategoryCell({
  category,
  hint,
  rowSpan,
  points,
}: {
  category: string
  hint?: string
  rowSpan: number
  points: number | null
}) {
  return (
    <HolisticAssessmentTableCell rowSpan={rowSpan} className="align-top font-medium text-sm">
      <div>{category}</div>
      {points != null ? (
        <p className="mt-1 text-xs font-semibold text-teal-800 dark:text-teal-300">Scored: {points}</p>
      ) : null}
      {hint ? <p className={cn('mt-1 font-normal', IA_HINT_CLASS)}>{hint}</p> : null}
    </HolisticAssessmentTableCell>
  )
}

function NothingChosenRow({ category }: { category: string }) {
  return (
    <HolisticAssessmentTableRow>
      <HolisticAssessmentTableCell className="align-top font-medium text-sm">{category}</HolisticAssessmentTableCell>
      <HolisticAssessmentTableCell className={cn('align-top', IA_HINT_CLASS)}>None selected</HolisticAssessmentTableCell>
      <HolisticAssessmentTableCell className="align-top text-center">
        <ScoreBadge score={0} />
      </HolisticAssessmentTableCell>
    </HolisticAssessmentTableRow>
  )
}

function SingleSelectRows({
  section,
  value,
  disabled,
  onlySelected,
  onSelect,
}: {
  section: Extract<WaterlowTableSection, { kind: 'single' }>
  value: WaterlowMetadata
  disabled?: boolean
  onlySelected?: boolean
  onSelect: (optionId: string) => void
}) {
  const selectedId = resolveWaterlowSingleOptionId(value, section)
  const { category, hint } = section
  const options = onlySelected ? section.options.filter((o) => o.id === selectedId) : section.options
  if (options.length === 0) return <NothingChosenRow category={category} />
  const points = section.options.find((o) => o.id === selectedId)?.score ?? null

  return (
    <>
      {options.map((option, index) => {
        const selected = selectedId === option.id
        return (
          <HolisticAssessmentTableRow key={option.id} className={cn(selected && option.score > 0 && 'bg-teal-50 dark:bg-teal-950/40')}>
            {index === 0 ? (
              <CategoryCell category={category} hint={onlySelected ? undefined : hint} rowSpan={options.length} points={points} />
            ) : null}
            <HolisticAssessmentTableCell className="align-top">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2.5',
                  IA_OPTION_LABEL_CLASS,
                  selected && 'font-semibold',
                  disabled && 'cursor-not-allowed',
                  disabled && !selected && 'opacity-60',
                )}
              >
                <input
                  type="radio"
                  name={`wl-${section.id}`}
                  className={cn('mt-0.5 shrink-0', IA_RADIO_CLASS)}
                  checked={selected}
                  disabled={disabled}
                  aria-label={`${category} — ${option.label}`}
                  onChange={() => onSelect(option.id)}
                />
                <span>{option.label}</span>
              </label>
            </HolisticAssessmentTableCell>
            <HolisticAssessmentTableCell className="align-top text-center">
              <ScoreBadge score={option.score} />
            </HolisticAssessmentTableCell>
          </HolisticAssessmentTableRow>
        )
      })}
    </>
  )
}

function MultiSelectRows({
  section,
  value,
  disabled,
  onlySelected,
  onToggle,
}: {
  section: Extract<WaterlowTableSection, { kind: 'multi' }>
  value: WaterlowMetadata
  disabled?: boolean
  onlySelected?: boolean
  onToggle: (optionId: string, checked: boolean) => void
}) {
  const { category, hint } = section
  const isChosen = (id: string) => isWaterlowMultiOptionSelected(value, section.field, id)
  const chosen = section.options.filter((o) => isChosen(o.id))
  const options = onlySelected ? chosen : section.options
  if (options.length === 0) return <NothingChosenRow category={category} />
  const points = chosen.length ? chosen.reduce((sum, o) => sum + o.score, 0) : null

  return (
    <>
      {options.map((option, index) => {
        const selected = isChosen(option.id)
        return (
          <HolisticAssessmentTableRow key={option.id} className={cn(selected && option.score > 0 && 'bg-teal-50 dark:bg-teal-950/40')}>
            {index === 0 ? (
              <CategoryCell category={category} hint={onlySelected ? undefined : hint} rowSpan={options.length} points={points} />
            ) : null}
            <HolisticAssessmentTableCell className="align-top">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2.5',
                  IA_OPTION_LABEL_CLASS,
                  selected && 'font-semibold',
                  disabled && 'cursor-not-allowed',
                  disabled && !selected && 'opacity-60',
                )}
              >
                <input
                  type="checkbox"
                  className={cn('mt-0.5 shrink-0', IA_CHECKBOX_CLASS)}
                  checked={selected}
                  disabled={disabled}
                  aria-label={`${category} — ${option.label}`}
                  onChange={(e) => onToggle(option.id, e.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            </HolisticAssessmentTableCell>
            <HolisticAssessmentTableCell className="align-top text-center">
              <ScoreBadge score={option.score} />
            </HolisticAssessmentTableCell>
          </HolisticAssessmentTableRow>
        )
      })}
    </>
  )
}

function WeightLossRows({
  value,
  disabled,
  onlySelected,
  onSelect,
}: {
  value: WaterlowMetadata
  disabled?: boolean
  onlySelected?: boolean
  onSelect: (optionId: string) => void
}) {
  const selectedId = resolveWaterlowWeightLossOptionId(value)
  const options = onlySelected
    ? WATERLOW_WEIGHT_LOSS_OPTIONS.filter((o) => o.id === selectedId)
    : WATERLOW_WEIGHT_LOSS_OPTIONS

  return (
    <>
      {options.map((option) => {
        const selected = selectedId === option.id
        return (
          <HolisticAssessmentTableRow key={option.id} className={cn(selected && option.score > 0 && 'bg-teal-50 dark:bg-teal-950/40')}>
            <HolisticAssessmentTableCell className="align-top">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2.5',
                  IA_OPTION_LABEL_CLASS,
                  selected && 'font-semibold',
                  disabled && 'cursor-not-allowed',
                  disabled && !selected && 'opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="wl-weight-loss"
                  className={cn('mt-0.5 shrink-0', IA_RADIO_CLASS)}
                  checked={selected}
                  disabled={disabled}
                  aria-label={`Recent weight loss — ${option.label}`}
                  onChange={() => onSelect(option.id)}
                />
                <span>{option.label}</span>
              </label>
            </HolisticAssessmentTableCell>
            <HolisticAssessmentTableCell className="align-top text-center">
              <ScoreBadge score={option.score} />
            </HolisticAssessmentTableCell>
          </HolisticAssessmentTableRow>
        )
      })}
      {options.length === 0 ? (
        <HolisticAssessmentTableRow>
          <HolisticAssessmentTableCell className={cn('align-top', IA_HINT_CLASS)}>None selected</HolisticAssessmentTableCell>
          <HolisticAssessmentTableCell className="align-top text-center">
            <ScoreBadge score={0} />
          </HolisticAssessmentTableCell>
        </HolisticAssessmentTableRow>
      ) : null}
    </>
  )
}

export function InitialAssessmentWaterlowPanel({ value, disabled, onChange, nextReviewHint }: Props) {
  const patch = (partial: Partial<WaterlowMetadata>) => {
    onChange(enrichWaterlowMetadata({ ...value, ...partial }))
  }

  const score = value.score ?? computeWaterlowScore(value)
  const band = waterlowBand(score)
  const carePlan = waterlowCarePlanRequired(score)
  const breakdown = waterlowSelectionBreakdown(value)
  // Read-only: show only what was chosen, with an option to see the full form.
  const [showAllOptions, setShowAllOptions] = React.useState(false)
  const onlySelected = Boolean(disabled) && !showAllOptions && breakdown.length > 0

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-waterlow-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Waterlow Pressure Ulcer Risk Assessment" />

        <div className="space-y-4 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Instructions for use
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {WATERLOW_USE_INSTRUCTIONS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>

          {disabled && breakdown.length > 0 ? (
            <button
              type="button"
              className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
              onClick={() => setShowAllOptions((v) => !v)}
            >
              {showAllOptions ? 'Show chosen options only' : 'Show all options'}
            </button>
          ) : null}

          <HolisticAssessmentTable
            columns={[
              { key: 'category', header: 'Category', className: 'w-[24%]' },
              { key: 'option', header: 'Sub-options', className: 'w-[56%]' },
              { key: 'score', header: 'Score', className: 'w-[20%] text-center' },
            ]}
          >
            {WATERLOW_TABLE_SECTIONS.map((section) => {
              if (section.kind === 'single') {
                return (
                  <SingleSelectRows
                    key={section.id}
                    section={section}
                    value={value}
                    disabled={disabled}
                    onlySelected={onlySelected}
                    onSelect={(optionId) =>
                      onChange(selectWaterlowSingleOption(value, section, optionId))
                    }
                  />
                )
              }

              return (
                <MultiSelectRows
                  key={section.id}
                  section={section}
                  value={value}
                  disabled={disabled}
                  onlySelected={onlySelected}
                  onToggle={(optionId, checked) =>
                    onChange(toggleWaterlowMultiOption(value, section, optionId, checked))
                  }
                />
              )
            })}
          </HolisticAssessmentTable>

          <div className="max-w-md space-y-0">
            <p className={cn('mb-2', IA_QUESTION_LABEL_CLASS)}>Recent weight loss</p>
            <HolisticAssessmentTable
              columns={[
                { key: 'range', header: 'Weight loss', className: 'w-[70%]' },
                { key: 'score', header: 'Score', className: 'w-[30%] text-center' },
              ]}
            >
              <WeightLossRows
                value={value}
                disabled={disabled}
                onlySelected={onlySelected}
                onSelect={(optionId) => onChange(selectWaterlowWeightLossOption(value, optionId))}
              />
            </HolisticAssessmentTable>
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-300 bg-teal-50 px-4 py-3 dark:border-teal-800 dark:bg-teal-950/40"
            data-testid="ia-waterlow-total"
          >
            <span className="text-sm font-semibold uppercase tracking-wide">Total score</span>
            <span className="flex items-center gap-3">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', band.className)}>{band.label}</span>
              <span className="font-mono text-2xl font-semibold tabular-nums text-teal-800 dark:text-teal-300">{score}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="ia-waterlow-thresholds">
            {[{ minScore: 0, text: '0–9 Minimal risk' }, ...WATERLOW_RISK_THRESHOLDS.map((row) => ({ minScore: row.minScore, text: `${row.minScore}+ ${row.label}` }))].map((row) => {
              const current = band.level === waterlowBand(row.minScore).level
              return (
                <span
                  key={row.minScore}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-sm font-semibold',
                    waterlowBand(row.minScore).className,
                    current && 'ring-2 ring-current ring-offset-1 ring-offset-background',
                  )}
                >
                  {row.text}
                </span>
              )
            })}
          </div>

          <div className="space-y-6 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex flex-col gap-1">
              <Label htmlFor="wl-comments" className={IA_QUESTION_LABEL_CLASS}>
                Comments
              </Label>
              <Textarea
                id="wl-comments"
                className={cn('min-h-[220px] flex-1', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                disabled={disabled}
                rows={8}
                value={value.comments ?? ''}
                onChange={(e) => patch({ comments: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className={IA_QUESTION_LABEL_CLASS}>Recommendation</p>
              <Textarea
                id="wl-recommendation"
                className={cn('min-h-[80px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                disabled={disabled}
                placeholder={carePlan ? 'Pressure ulcer prevention plan…' : 'Optional'}
                rows={3}
                value={value.recommendation ?? ''}
                onChange={(e) => patch({ recommendation: e.target.value })}
              />
              <div className="space-y-2">
                <div>
                  <Label htmlFor="wl-recommendation-by" className={IA_HINT_CLASS}>
                    By whom
                  </Label>
                  <Input
                    id="wl-recommendation-by"
                    className="mt-1"
                    disabled={disabled}
                    value={value.recommendationBy ?? ''}
                    onChange={(e) => patch({ recommendationBy: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="wl-recommendation-to" className={IA_HINT_CLASS}>
                    To whom
                  </Label>
                  <Input
                    id="wl-recommendation-to"
                    className="mt-1"
                    disabled={disabled}
                    value={value.recommendationTo ?? ''}
                    onChange={(e) => patch({ recommendationTo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="wl-recommendation-date" className={IA_HINT_CLASS}>
                    Date
                  </Label>
                  <Input
                    id="wl-recommendation-date"
                    type="date"
                    className="mt-1"
                    disabled={disabled}
                    value={value.recommendationDate?.slice(0, 10) ?? ''}
                    onChange={(e) => patch({ recommendationDate: e.target.value || null })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-200 pt-4 dark:border-slate-700">
              <Label htmlFor="wl-action" className={IA_QUESTION_LABEL_CLASS}>
                Action taken
              </Label>
              <Textarea
                id="wl-action"
                className={cn('min-h-[220px] flex-1', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                disabled={disabled}
                rows={8}
                value={value.actionTaken ?? ''}
                onChange={(e) => patch({ actionTaken: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', band.className)}>
                {band.label}
              </span>
              {carePlan ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100">
                  Care plan required (10+)
                </span>
              ) : null}
              {score >= 15 ? (
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-950 dark:bg-orange-950 dark:text-orange-100">
                  Manager review suggested (15+)
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Equipment guidance:</span>{' '}
              {waterlowEquipmentGuidance(score)}
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Risk level</th>
                    <th className="px-3 py-2 font-semibold">Score</th>
                    <th className="px-3 py-2 font-semibold">Equipment options</th>
                  </tr>
                </thead>
                <tbody>
                  {WATERLOW_EQUIPMENT_CATALOG.map((row) => (
                    <tr key={row.riskLevel} className="border-t border-border">
                      <td className="px-3 py-2 align-top font-medium">{row.riskLevel}</td>
                      <td className="px-3 py-2 align-top text-muted-foreground">{row.scoreRange}</td>
                      <td className="px-3 py-2 align-top">
                        <ul className="list-inside list-disc space-y-0.5">
                          {row.products.map((product) => (
                            <li key={product}>{product}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <Label htmlFor="wl-next-review" className={IA_QUESTION_LABEL_CLASS}>
                Next Waterlow review date
              </Label>
              <Input
                id="wl-next-review"
                type="date"
                className="mt-1 max-w-xs"
                disabled={disabled}
                value={value.nextReviewDate?.slice(0, 10) ?? ''}
                onChange={(e) => patch({ nextReviewDate: e.target.value || null })}
              />
              {nextReviewHint ? <p className={cn('mt-1', IA_HINT_CLASS)}>{nextReviewHint}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
