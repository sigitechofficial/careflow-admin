import { cn } from '@/shared/lib/utils'
import {
  IA_GROUP_TITLE_CLASS,
  IA_HINT_CLASS,
  IA_PAPER_ROW_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SUBSECTION_PANEL_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

export const PAPER_ADL_SCORES = [0, 1, 2, 3, 4] as const

type Props = {
  label: string
  /** Selected score 0–4, or null when not applicable / not scored */
  value: number | null
  name: string
  disabled?: boolean
  allowNotApplicable?: boolean
  onChange: (value: number | null) => void
}

export function InitialAssessmentPaperScoreRow({
  label,
  value,
  name,
  disabled,
  allowNotApplicable = false,
  onChange,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 py-2 last:border-b-0">
      <span className={cn('min-w-0 flex-1', IA_PAPER_ROW_LABEL_CLASS)}>{label}</span>
      <div
        className="flex shrink-0 items-end gap-1"
        role="radiogroup"
        aria-label={`${label} support level`}
      >
        {PAPER_ADL_SCORES.map((score) => (
          <label
            key={score}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-0.5 px-0.5',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              className={IA_RADIO_CLASS}
              checked={value === score}
              disabled={disabled}
              onChange={() => onChange(score)}
            />
            <span className="text-[10px] font-medium leading-none text-muted-foreground">{score}</span>
          </label>
        ))}
        {allowNotApplicable ? (
          <label
            className={cn(
              'ml-0.5 flex cursor-pointer flex-col items-center gap-0.5 px-0.5',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              className={cn(IA_RADIO_CLASS, 'text-muted-foreground')}
              checked={value === null}
              disabled={disabled}
              onChange={() => onChange(null)}
            />
            <span className="text-[9px] font-medium leading-none text-muted-foreground">N/A</span>
          </label>
        ) : null}
      </div>
    </div>
  )
}

type SectionProps = {
  title?: string
  meta?: string
  children: React.ReactNode
}

export function InitialAssessmentPaperScoreSection({ title, meta, children }: SectionProps) {
  return (
    <section className={IA_SUBSECTION_PANEL_CLASS}>
      {title || meta ? (
        <div className={cn(IA_SUBSECTION_PANEL_HEADER_CLASS, 'flex items-center justify-between')}>
          {title ? <h4 className={IA_GROUP_TITLE_CLASS}>{title}</h4> : <span />}
          {meta ? <span className={cn(IA_HINT_CLASS, 'text-xs')}>{meta}</span> : null}
        </div>
      ) : null}
      <div className="divide-y divide-border/60 px-2 py-1">{children}</div>
    </section>
  )
}
