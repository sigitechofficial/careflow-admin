import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'

const areaCls =
  'min-h-[88px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Props = {
  sectionNumber: number
  value: string
  disabled?: boolean
  onChange: (text: string) => void
  onBlur?: () => void
}

export function InitialAssessmentSectionComment({
  sectionNumber,
  value,
  disabled,
  onChange,
  onBlur,
}: Props) {
  return (
    <div className="rounded-lg border border-teal-200/60 bg-teal-50/40 p-4 dark:border-teal-900 dark:bg-teal-950/20">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-teal-900 dark:text-teal-200">Section comments</div>
        <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-900 dark:bg-teal-900 dark:text-teal-200">
          Sec. {sectionNumber}
        </span>
      </div>
      <Label htmlFor={`ia-sec-comment-${sectionNumber}`} className="text-xs text-muted-foreground">
        Assessor notes for this section (saved with submission metadata)
      </Label>
      <textarea
        id={`ia-sec-comment-${sectionNumber}`}
        className={cn(areaCls, 'mt-1', disabled && 'opacity-70')}
        rows={4}
        maxLength={4000}
        disabled={disabled}
        placeholder="Clinical judgement, follow-up actions, or reasons for N/A fields…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{value.length} / 4000</p>
    </div>
  )
}
