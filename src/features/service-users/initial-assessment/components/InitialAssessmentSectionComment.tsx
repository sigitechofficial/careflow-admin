import { Label } from '@/shared/ui/form-field'
import {
  InitialAssessmentTextarea,
  plainTextFromHtml,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'

type Props = {
  sectionNumber: number
  value: string
  disabled?: boolean
  onChange: (text: string) => void
  onBlur?: (text: string) => void
}

export function InitialAssessmentSectionComment({
  sectionNumber,
  value,
  disabled,
  onChange,
  onBlur,
}: Props) {
  const plainLength = plainTextFromHtml(value)

  return (
    <div className="rounded-lg border border-teal-200/60 bg-teal-50/40 p-4 dark:border-teal-900 dark:bg-teal-950/20">
      <div className="mb-2 text-sm font-semibold text-teal-900 dark:text-teal-200">Section comments</div>
      <Label htmlFor={`ia-sec-comment-${sectionNumber}`} className="text-xs text-muted-foreground">
        Assessor notes for this section (saved with submission metadata)
      </Label>
      <InitialAssessmentTextarea
        id={`ia-sec-comment-${sectionNumber}`}
        className={cn('mt-1', disabled && 'opacity-70')}
        rows={4}
        maxLength={4000}
        disabled={disabled}
        placeholder="Clinical judgement, follow-up actions, or reasons for N/A fields…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{plainLength} / 4000</p>
    </div>
  )
}
