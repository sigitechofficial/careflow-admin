import { Label } from '@/shared/ui/form-field'
import {
  InitialAssessmentTextarea,
  plainTextFromHtml,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'

type Props = {
  /** Holistic assessment tab id — not enterprise section number. */
  holisticTabId: number
  value: string
  disabled?: boolean
  onChange: (holisticTabId: number, text: string) => void
  onBlur?: (holisticTabId: number, text: string) => void
}

export function InitialAssessmentSectionComment({
  holisticTabId,
  value,
  disabled,
  onChange,
  onBlur,
}: Props) {
  const plainLength = plainTextFromHtml(value)

  return (
    <div className="rounded-lg border border-teal-200/60 bg-teal-50/40 p-4 dark:border-teal-900 dark:bg-teal-950/20">
      <div className="mb-2 text-sm font-semibold text-teal-900 dark:text-teal-200">Section comments</div>
      <Label htmlFor={`ia-sec-comment-${holisticTabId}`} className="text-xs text-muted-foreground">
        Assessor notes for this section (saved with submission metadata)
      </Label>
      <InitialAssessmentTextarea
        key={`ia-sec-comment-editor-${holisticTabId}`}
        id={`ia-sec-comment-${holisticTabId}`}
        className={cn('mt-1', disabled && 'opacity-70')}
        rows={4}
        maxLength={4000}
        disabled={disabled}
        placeholder="Clinical judgement, follow-up actions, or reasons for N/A fields…"
        value={value}
        onChange={(e) => onChange(holisticTabId, e.target.value)}
        onBlur={(e) => onBlur?.(holisticTabId, e.target.value)}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{plainLength} / 4000</p>
    </div>
  )
}
