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
  IA_QUESTION_LABEL_CLASS,
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
  computeMustScore,
  enrichMustMetadata,
  hasMustEnteredScores,
  mustEnteredScoreKey,
  mustRiskLabel,
  parseMustScoreInput,
  patchMustEnteredRowScore,
  type MustMetadata,
  type MustStepId,
} from '@/features/service-users/initial-assessment/utils/must-scoring'

type Props = {
  value: MustMetadata
  disabled?: boolean
  onChange: (next: MustMetadata) => void
}

const SCORE_INPUT_CLASS = 'h-9 w-16 text-center font-mono text-sm tabular-nums'

function displayMustRowScore(
  value: MustMetadata,
  stepId: MustStepId,
  rowId: string,
  guideScore: number,
): string {
  const key = mustEnteredScoreKey(stepId, rowId)
  const entered = value.enteredScores?.[key]
  if (entered != null) return String(entered)

  if (hasMustEnteredScores(value)) return ''

  const legacyScore = stepId === 'bmi' ? value.bmiScore : value.weightLossScore
  if (legacyScore != null && legacyScore === guideScore) return String(guideScore)

  return ''
}

function ScoreInputCell({
  inputId,
  value,
  disabled,
  onChange,
}: {
  inputId: string
  value: string
  disabled?: boolean
  onChange: (raw: string) => void
}) {
  return (
    <HolisticAssessmentTableCell className="align-top text-center">
      <Input
        id={inputId}
        type="number"
        min={0}
        max={9}
        step={1}
        inputMode="numeric"
        className={SCORE_INPUT_CLASS}
        disabled={disabled}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </HolisticAssessmentTableCell>
  )
}

function CriteriaScoreRows({
  stepId,
  criteria,
  criterionHeader,
  value,
  disabled,
  onPatchScores,
}: {
  stepId: MustStepId
  criteria: ReadonlyArray<{ id: string; label: string; score: number }>
  criterionHeader: string
  value: MustMetadata
  disabled?: boolean
  onPatchScores: (enteredScores: Record<string, number>) => void
}) {
  return (
    <HolisticAssessmentTable
      columns={[
        { key: 'criterion', header: criterionHeader, className: 'w-[75%]' },
        { key: 'score', header: 'Score', className: 'w-[25%] text-center' },
      ]}
    >
      {criteria.map((row) => {
        const inputId = `must-${stepId}-${row.id}-score`

        return (
          <HolisticAssessmentTableRow key={row.id}>
            <HolisticAssessmentTableCell className="text-sm">{row.label}</HolisticAssessmentTableCell>
            <ScoreInputCell
              inputId={inputId}
              value={displayMustRowScore(value, stepId, row.id, row.score)}
              disabled={disabled}
              onChange={(raw) =>
                onPatchScores(patchMustEnteredRowScore(value.enteredScores, stepId, row.id, raw))
              }
            />
          </HolisticAssessmentTableRow>
        )
      })}
    </HolisticAssessmentTable>
  )
}

function StepScoreInput({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: number | undefined
  disabled?: boolean
  onChange: (score: number | undefined) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Label htmlFor={id} className={IA_QUESTION_LABEL_CLASS}>
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={9}
        step={1}
        inputMode="numeric"
        className={SCORE_INPUT_CLASS}
        disabled={disabled}
        placeholder="0"
        value={value != null ? String(value) : ''}
        onChange={(e) => onChange(parseMustScoreInput(e.target.value))}
      />
    </div>
  )
}

export function InitialAssessmentMustPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<MustMetadata>) => {
    onChange(enrichMustMetadata({ ...value, ...partial }))
  }

  const patchEnteredScores = (enteredScores: Record<string, number>) => {
    patch({ enteredScores })
  }

  const score = value.score ?? computeMustScore(value)
  const riskLevel = value.riskLevel ?? (score <= 0 ? 'low' : score === 1 ? 'medium' : 'high')
  const carePlan = MUST_CARE_PLANS[riskLevel]

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-must-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Malnutrition universal screening tool (MUST)" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:border-slate-700">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Step 1 — BMI score</h4>
            <CriteriaScoreRows
              stepId="bmi"
              criteria={MUST_STEP_1_BMI_CRITERIA}
              criterionHeader="BMI kg/m²"
              value={value}
              disabled={disabled}
              onPatchScores={patchEnteredScores}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Step 2 — Unplanned weight loss in past 3–6 months
            </h4>
            <CriteriaScoreRows
              stepId="weightLoss"
              criteria={MUST_STEP_2_WEIGHT_LOSS_CRITERIA}
              criterionHeader="Weight loss"
              value={value}
              disabled={disabled}
              onPatchScores={patchEnteredScores}
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
            <StepScoreInput
              id="must-acute-disease-score"
              label="Score"
              value={value.acuteDiseaseScore}
              disabled={disabled}
              onChange={(n) => patch({ acuteDiseaseScore: n })}
            />
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-foreground">Step 4 — Overall risk of malnutrition</h4>
            <p className={cn('text-sm', IA_HINT_CLASS)}>
              Add scores together: Step 1 + Step 2 + Step 3
            </p>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total score</p>
                <p className="font-mono text-2xl font-semibold text-teal-800 dark:text-teal-300">{score}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk</p>
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
