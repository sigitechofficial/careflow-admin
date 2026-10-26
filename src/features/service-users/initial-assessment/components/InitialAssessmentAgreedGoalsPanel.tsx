import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import {
  AGREED_GOALS_MAX,
  CARE_ACT_OUTCOME_AREAS,
  newAgreedGoal,
  type AgreedGoal,
  type AgreedGoalsMetadata,
} from '@/features/service-users/initial-assessment/utils/agreed-goals'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: AgreedGoalsMetadata
  disabled?: boolean
  onChange: (next: AgreedGoalsMetadata) => void
}

export function InitialAssessmentAgreedGoalsPanel({ value, disabled, onChange }: Props) {
  const goals = value.goals ?? []

  const update = (index: number, patch: Partial<AgreedGoal>) =>
    onChange({ goals: goals.map((g, i) => (i === index ? { ...g, ...patch } : g)) })

  return (
    <div
      className="mt-6 space-y-4 rounded-sm border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-card"
      data-testid="ia-agreed-goals"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">My agreed goals</p>
        <p className={cn('mt-1 text-sm', IA_HINT_CLASS)}>
          What the person wants their care to help them achieve, in their own words. At least one goal is
          needed to submit; each one is checked at the review.
        </p>
      </div>

      {goals.length === 0 ? (
        <p className={cn('text-sm', IA_HINT_CLASS)}>No goals added yet.</p>
      ) : null}

      {goals.map((goal, index) => (
        <div
          key={goal.id ?? index}
          className="space-y-3 rounded-sm border border-slate-200 p-3 dark:border-slate-700"
          data-testid={`ia-agreed-goal-${index}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Goal {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label={`Remove goal ${index + 1}`}
              onClick={() => onChange({ goals: goals.filter((_, i) => i !== index) })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`ia-goal-${index}-text`} className={IA_QUESTION_LABEL_CLASS}>
              My goal (in my own words)
            </Label>
            <Textarea
              id={`ia-goal-${index}-text`}
              className={cn('min-h-[64px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={goal.goal ?? ''}
              onChange={(e) => update(index, { goal: e.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className={IA_QUESTION_LABEL_CLASS}>Outcome area</Label>
              <Select
                value={goal.outcomeArea ?? ''}
                disabled={disabled}
                onValueChange={(outcomeArea) => update(index, { outcomeArea })}
              >
                <SelectTrigger aria-label={`Outcome area for goal ${index + 1}`}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {CARE_ACT_OUTCOME_AREAS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`ia-goal-${index}-date`} className={IA_QUESTION_LABEL_CLASS}>
                Target / review date
              </Label>
              <Input
                id={`ia-goal-${index}-date`}
                type="date"
                className="h-9 bg-background"
                disabled={disabled}
                value={goal.targetDate?.slice(0, 10) ?? ''}
                onChange={(e) => update(index, { targetDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`ia-goal-${index}-measure`} className={IA_QUESTION_LABEL_CLASS}>
              How I will know I have achieved it
            </Label>
            <Input
              id={`ia-goal-${index}-measure`}
              className="h-9 bg-background"
              disabled={disabled}
              value={goal.measure ?? ''}
              onChange={(e) => update(index, { measure: e.target.value })}
            />
          </div>
        </div>
      ))}

      {goals.length < AGREED_GOALS_MAX ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange({ goals: [...goals, newAgreedGoal()] })}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add goal
        </Button>
      ) : null}
    </div>
  )
}
