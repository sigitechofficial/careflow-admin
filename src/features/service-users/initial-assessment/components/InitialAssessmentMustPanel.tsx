import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  MUST_BAPEN_FOOTER,
  MUST_CARE_PLANS,
  MUST_RISK_BANDS,
  MUST_STEP_1_BMI_CRITERIA,
  MUST_STEP_2_WEIGHT_LOSS_CRITERIA,
  MUST_STEP_3_ACUTE_DISEASE_DESCRIPTION,
  MUST_STEP_3_ACUTE_DISEASE_EXAMPLES,
  MUST_STEP_3_ACUTE_DISEASE_OPTIONS,
  computeMustScore,
  enrichMustMetadata,
  mustRiskLabel,
  resolveMustAcuteDiseaseOptionId,
  resolveMustBmiOptionId,
  resolveMustWeightLossOptionId,
  selectMustAcuteDiseaseOption,
  selectMustBmiOption,
  selectMustWeightLossOption,
  type MustMetadata,
  type MustSelectOption,
} from '@/features/service-users/initial-assessment/utils/must-scoring'

type Props = {
  value: MustMetadata
  disabled?: boolean
  onChange: (next: MustMetadata) => void
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex min-w-[2rem] justify-center font-mono text-sm font-semibold tabular-nums text-teal-800 dark:text-teal-300">
      {score}
    </span>
  )
}

function StepSelectRows({
  stepId,
  criteria,
  criterionHeader,
  selectedOptionId,
  stepScore,
  disabled,
  onSelect,
}: {
  stepId: string
  criteria: readonly MustSelectOption[]
  criterionHeader: string
  selectedOptionId: string | undefined
  stepScore: number | undefined
  disabled?: boolean
  onSelect: (optionId: string) => void
}) {
  return (
    <HolisticAssessmentTable
      columns={[
        { key: 'criterion', header: criterionHeader, className: 'w-[70%]' },
        { key: 'score', header: 'Score', className: 'w-[30%] text-center' },
      ]}
    >
      {criteria.map((row) => (
        <HolisticAssessmentTableRow key={row.id}>
          <HolisticAssessmentTableCell className="align-top">
            <label
              className={cn(
                'flex cursor-pointer items-start gap-2.5 text-sm',
                IA_OPTION_LABEL_CLASS,
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={`must-${stepId}`}
                className={cn('mt-0.5 shrink-0', IA_RADIO_CLASS)}
                checked={selectedOptionId === row.id}
                disabled={disabled}
                aria-label={`${criterionHeader} — ${row.label}`}
                onChange={() => onSelect(row.id)}
              />
              <span>{row.label}</span>
            </label>
          </HolisticAssessmentTableCell>
          <HolisticAssessmentTableCell className="align-top text-center">
            <ScoreBadge score={row.score} />
          </HolisticAssessmentTableCell>
        </HolisticAssessmentTableRow>
      ))}
      <HolisticAssessmentTableRow>
        <HolisticAssessmentTableCell className="font-semibold uppercase tracking-wide text-sm">
          Step score
        </HolisticAssessmentTableCell>
        <HolisticAssessmentTableCell className="text-center">
          {stepScore != null ? (
            <span className="font-mono text-lg font-semibold text-teal-800 dark:text-teal-300">
              {stepScore}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </HolisticAssessmentTableCell>
      </HolisticAssessmentTableRow>
    </HolisticAssessmentTable>
  )
}

export function InitialAssessmentMustPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<MustMetadata>) => {
    onChange(enrichMustMetadata({ ...value, ...partial }))
  }

  const bmiOptionId = resolveMustBmiOptionId(value)
  const weightLossOptionId = resolveMustWeightLossOptionId(value)
  const acuteDiseaseOptionId = resolveMustAcuteDiseaseOptionId(value)

  const score = value.score ?? computeMustScore(value)
  const riskLevel = value.riskLevel ?? (score <= 0 ? 'low' : score === 1 ? 'medium' : 'high')
  const carePlan = MUST_CARE_PLANS[riskLevel]

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-must-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Alternative to MUST" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Step 1 — BMI score</h4>
            <p className={cn('text-sm', IA_HINT_CLASS)}>
              Select the BMI band that applies — score is calculated automatically.
            </p>
            <StepSelectRows
              stepId="bmi"
              criteria={MUST_STEP_1_BMI_CRITERIA}
              criterionHeader="My BMI (kg/m²)"
              selectedOptionId={bmiOptionId}
              stepScore={bmiOptionId != null ? value.bmiScore : undefined}
              disabled={disabled}
              onSelect={(optionId) => onChange(selectMustBmiOption(value, optionId))}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Step 2 — Have I lost any weight unintentionally in the last 3 to 6 months?
            </h4>
            <p className={cn('text-sm', IA_HINT_CLASS)}>
              Select one weight-loss band — score is calculated automatically.
            </p>
            <StepSelectRows
              stepId="weight-loss"
              criteria={MUST_STEP_2_WEIGHT_LOSS_CRITERIA}
              criterionHeader="My weight loss"
              selectedOptionId={weightLossOptionId}
              stepScore={weightLossOptionId != null ? value.weightLossScore : undefined}
              disabled={disabled}
              onSelect={(optionId) => onChange(selectMustWeightLossOption(value, optionId))}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Step 3 — Acute disease effect score</h4>
            <p className={cn('text-sm', IA_HINT_CLASS)}>{MUST_STEP_3_ACUTE_DISEASE_DESCRIPTION}</p>
            <ul className={cn('list-disc space-y-1 pl-5 text-sm', IA_HINT_CLASS)}>
              {MUST_STEP_3_ACUTE_DISEASE_EXAMPLES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <StepSelectRows
              stepId="acute-disease"
              criteria={MUST_STEP_3_ACUTE_DISEASE_OPTIONS}
              criterionHeader="Acute disease effect"
              selectedOptionId={acuteDiseaseOptionId}
              stepScore={acuteDiseaseOptionId != null ? value.acuteDiseaseScore : undefined}
              disabled={disabled}
              onSelect={(optionId) => onChange(selectMustAcuteDiseaseOption(value, optionId))}
            />
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-foreground">Step 4 — Overall risk of malnutrition</h4>
            <p className={cn('text-sm', IA_HINT_CLASS)}>
              Add scores together: Step 1 + Step 2 + Step 3
            </p>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">My MUST score</p>
                <p className="font-mono text-2xl font-semibold text-teal-800 dark:text-teal-300">{score}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">My nutrition risk</p>
                <p className="text-sm font-semibold text-foreground">{mustRiskLabel(riskLevel)}</p>
              </div>
            </div>
            <ul className={cn('space-y-1 text-sm', IA_HINT_CLASS)}>
              {MUST_RISK_BANDS.map((band) => (
                <li key={band.label}>{band.label}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-foreground">Step 5 — Follow appropriate care plan</h4>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">{carePlan.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {carePlan.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
            {riskLevel === 'medium' ? (
              <div>
                <Label htmlFor="must-fortification-name" className={IA_QUESTION_LABEL_CLASS}>
                  Food fortification advice (name)
                </Label>
                <Input
                  id="must-fortification-name"
                  className="mt-1 max-w-md"
                  disabled={disabled}
                  value={value.foodFortificationAdviceName ?? ''}
                  onChange={(e) => patch({ foodFortificationAdviceName: e.target.value })}
                />
              </div>
            ) : null}
          </section>

          <p className={cn('border-t border-slate-200 pt-4 text-xs italic', IA_HINT_CLASS)}>
            {MUST_BAPEN_FOOTER}
          </p>
        </div>
      </div>
    </div>
  )
}
