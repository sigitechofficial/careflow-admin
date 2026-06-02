import * as React from 'react'
import { Info } from 'lucide-react'
import { Label, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import type { ServiceUserDetail } from '@/features/service-users/api'
import { specRefLabel } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import {
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_CHECKBOX_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  WATERLOW_AGE_OPTIONS,
  WATERLOW_APPETITE_OPTIONS,
  WATERLOW_BUILD_OPTIONS,
  WATERLOW_CONTINENCE_OPTIONS,
  WATERLOW_GENDER_OPTIONS,
  WATERLOW_MEDICATION_OPTIONS,
  WATERLOW_MOBILITY_OPTIONS,
  WATERLOW_NEUROLOGICAL_OPTIONS,
  WATERLOW_SKIN_OPTIONS,
  WATERLOW_SURGERY_OPTIONS,
  WATERLOW_TISSUE_OPTIONS,
  WATERLOW_WEIGHT_LOSS_OPTIONS,
  ageBandScoreFromDateOfBirth,
  computeWaterlowScore,
  enrichWaterlowMetadata,
  genderScoreFromCode,
  waterlowBand,
  waterlowCarePlanRequired,
  waterlowEquipmentGuidance,
  WATERLOW_EQUIPMENT_CATALOG,
  type WaterlowMetadata,
  type WaterlowSelectOption,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

type Props = {
  value: WaterlowMetadata
  disabled?: boolean
  serviceUserDetail?: ServiceUserDetail | null
  onChange: (next: WaterlowMetadata) => void
}

function SingleSelectField({
  label,
  hint,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  options: WaterlowSelectOption[]
  value: number | undefined
  disabled?: boolean
  onChange: (score: number) => void
}) {
  const selected = options.find((o) => o.score === value)
  return (
    <div>
      <Label className={IA_QUESTION_LABEL_CLASS}>{label}</Label>
      {hint ? <p className={IA_HINT_CLASS}>{hint}</p> : null}
      <Select
        value={selected?.id ?? ''}
        disabled={disabled}
        onValueChange={(id) => {
          const opt = options.find((o) => o.id === id)
          if (opt) onChange(opt.score)
        }}
      >
        <SelectTrigger className="mt-1 h-10">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label} ({o.score})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function MultiSelectField({
  label,
  hint,
  options,
  selectedIds,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  options: WaterlowSelectOption[]
  selectedIds: string[]
  disabled?: boolean
  onChange: (ids: string[]) => void
}) {
  const toggle = (id: string) => {
    if (id === 'healthy') {
      onChange(selectedIds.includes('healthy') ? [] : ['healthy'])
      return
    }
    const withoutHealthy = selectedIds.filter((x) => x !== 'healthy')
    if (withoutHealthy.includes(id)) {
      const next = withoutHealthy.filter((x) => x !== id)
      onChange(next.length ? next : ['healthy'])
    } else {
      onChange([...withoutHealthy, id])
    }
  }

  return (
    <div>
      <Label className={IA_QUESTION_LABEL_CLASS}>{label}</Label>
      {hint ? <p className={IA_HINT_CLASS}>{hint}</p> : null}
      <div className="mt-2 space-y-1.5">
        {options.map((o) => (
          <label
            key={o.id}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2 text-sm',
              selectedIds.includes(o.id) && 'border-teal-600 bg-teal-50/80 dark:border-teal-700 dark:bg-teal-950/40',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="checkbox"
              className={cn('mt-0.5', IA_CHECKBOX_CLASS)}
              checked={selectedIds.includes(o.id)}
              disabled={disabled}
              onChange={() => toggle(o.id)}
            />
            <span>
              {o.label} <span className="text-muted-foreground">(+{o.score})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function InitialAssessmentWaterlowPanel({
  value,
  disabled,
  serviceUserDetail,
  onChange,
}: Props) {
  const prefillApplied = React.useRef(false)

  React.useEffect(() => {
    if (prefillApplied.current || !serviceUserDetail) return
    if (value.age != null && value.gender != null) return
    const ageScore = ageBandScoreFromDateOfBirth(serviceUserDetail.dateOfBirth)
    const genderScore = genderScoreFromCode(
      serviceUserDetail.gender?.code,
      serviceUserDetail.gender?.name,
    )
    if (ageScore == null && genderScore == null) return
    prefillApplied.current = true
    onChange(
      enrichWaterlowMetadata({
        ...value,
        age: value.age ?? ageScore,
        gender: value.gender ?? genderScore,
      }),
    )
  }, [serviceUserDetail, value, onChange])

  const patch = (partial: Partial<WaterlowMetadata>) => {
    onChange(enrichWaterlowMetadata({ ...value, ...partial }))
  }

  const score = value.score ?? computeWaterlowScore(value)
  const band = waterlowBand(score)
  const carePlan = waterlowCarePlanRequired(score)
  const skinTypes = value.skinTypes?.length ? value.skinTypes : ['healthy']

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-waterlow-panel">
      <InitialAssessmentSection12PanelShell
        title={specRefLabel('11.3')}
        hint="§11.4–11.5 — score on first visit; review monthly"
        bodyVariant="content"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Total score</p>
          <p className="font-mono text-3xl font-semibold text-teal-800 dark:text-teal-300">{score}</p>
        </div>

        <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'flex items-start gap-2 text-sm')}>
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className={IA_HINT_CLASS}>
            If total score is <strong className="font-medium text-foreground">10 or more</strong>, initiate a care
            plan for at-risk pressure damage / pressure ulcer formation. Update if the service user&apos;s condition
            changes significantly.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SingleSelectField
            label="Gender"
            options={WATERLOW_GENDER_OPTIONS}
            value={value.gender}
            disabled={disabled}
            onChange={(n) => patch({ gender: n })}
          />
          <SingleSelectField
            label="Age"
            options={WATERLOW_AGE_OPTIONS}
            value={value.age}
            disabled={disabled}
            onChange={(n) => patch({ age: n })}
          />
          <SingleSelectField
            label="Build / weight (BMI)"
            options={WATERLOW_BUILD_OPTIONS}
            value={value.build}
            disabled={disabled}
            onChange={(n) => patch({ build: n })}
          />
          <SingleSelectField
            label="Appetite"
            hint="Select one only"
            options={WATERLOW_APPETITE_OPTIONS}
            value={value.appetite}
            disabled={disabled}
            onChange={(n) => patch({ appetite: n })}
          />
          <SingleSelectField
            label="Mobility"
            hint="Select one only"
            options={WATERLOW_MOBILITY_OPTIONS}
            value={value.mobility}
            disabled={disabled}
            onChange={(n) => patch({ mobility: n })}
          />
          <SingleSelectField
            label="Continence"
            hint="Select one only"
            options={WATERLOW_CONTINENCE_OPTIONS}
            value={value.continence}
            disabled={disabled}
            onChange={(n) => patch({ continence: n })}
          />
          <SingleSelectField
            label="Neurological deficit"
            hint="Select highest applicable"
            options={WATERLOW_NEUROLOGICAL_OPTIONS}
            value={value.neurological}
            disabled={disabled}
            onChange={(n) => patch({ neurological: n })}
          />
          <SingleSelectField
            label="Major surgery / trauma"
            hint="Scores may be discounted after 48 hours if recovering"
            options={WATERLOW_SURGERY_OPTIONS}
            value={value.surgery}
            disabled={disabled}
            onChange={(n) => patch({ surgery: n })}
          />
          <SingleSelectField
            label="Medication"
            options={WATERLOW_MEDICATION_OPTIONS}
            value={value.medication}
            disabled={disabled}
            onChange={(n) => patch({ medication: n })}
          />
          <SingleSelectField
            label="Recent weight loss"
            options={WATERLOW_WEIGHT_LOSS_OPTIONS}
            value={value.weightLoss}
            disabled={disabled}
            onChange={(n) => patch({ weightLoss: n })}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <MultiSelectField
            label="Skin type / visual risk areas"
            hint="May select one or more (scores are additive). Healthy clears other selections."
            options={WATERLOW_SKIN_OPTIONS}
            selectedIds={skinTypes}
            disabled={disabled}
            onChange={(ids) => patch({ skinTypes: ids })}
          />
          <MultiSelectField
            label="Tissue malnutrition"
            hint="May select one or more (scores are additive)"
            options={WATERLOW_TISSUE_OPTIONS}
            selectedIds={value.tissueMalnutrition ?? []}
            disabled={disabled}
            onChange={(ids) => patch({ tissueMalnutrition: ids })}
          />
        </div>

        <div className="space-y-3">
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
                  <th className="px-3 py-2 font-semibold">Equipment options (paper guide)</th>
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
              Next Waterlow review date (§11.5)
            </Label>
            <Input
              id="wl-next-review"
              type="date"
              className="mt-1 max-w-xs"
              disabled={disabled}
              value={value.nextReviewDate?.slice(0, 10) ?? ''}
              onChange={(e) => patch({ nextReviewDate: e.target.value || null })}
            />
          </div>
        </div>
      </InitialAssessmentSection12PanelShell>

      <InitialAssessmentSection12PanelShell
        title="Recommendations & actions (§11.6)"
        bodyVariant="content"
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="wl-comments" className={IA_QUESTION_LABEL_CLASS}>
              Comments
            </Label>
            <Textarea
              id="wl-comments"
              className={cn('mt-1', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.comments ?? ''}
              onChange={(e) => patch({ comments: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="wl-recommendation" className={IA_QUESTION_LABEL_CLASS}>
              Recommendation
            </Label>
            <Textarea
              id="wl-recommendation"
              className={cn('mt-1', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              placeholder={carePlan ? 'Pressure ulcer prevention plan…' : 'Optional'}
              value={value.recommendation ?? ''}
              onChange={(e) => patch({ recommendation: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="wl-recommendation-by" className={IA_QUESTION_LABEL_CLASS}>
                Recommendation by whom
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
              <Label htmlFor="wl-recommendation-to" className={IA_QUESTION_LABEL_CLASS}>
                Recommendation to whom
              </Label>
              <Input
                id="wl-recommendation-to"
                className="mt-1"
                disabled={disabled}
                value={value.recommendationTo ?? ''}
                onChange={(e) => patch({ recommendationTo: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="wl-recommendation-date" className={IA_QUESTION_LABEL_CLASS}>
              Recommendation date
            </Label>
            <Input
              id="wl-recommendation-date"
              type="date"
              className="mt-1 max-w-xs"
              disabled={disabled}
              value={value.recommendationDate?.slice(0, 10) ?? ''}
              onChange={(e) => patch({ recommendationDate: e.target.value || null })}
            />
          </div>
          <div>
            <Label htmlFor="wl-action" className={IA_QUESTION_LABEL_CLASS}>
              Action taken
            </Label>
            <Textarea
              id="wl-action"
              className={cn('mt-1', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.actionTaken ?? ''}
              onChange={(e) => patch({ actionTaken: e.target.value })}
            />
          </div>
        </div>
      </InitialAssessmentSection12PanelShell>
    </div>
  )
}
