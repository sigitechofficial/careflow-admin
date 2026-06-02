import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import {
  IA_OPTION_LABEL_CLASS,
  IA_PAPER_ROW_LABEL_CLASS,
  IA_RADIO_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  label: ReactNode
  value: boolean | null
  disabled?: boolean
  name: string
  onChange: (value: boolean) => void
  dateLabel?: string
  dateValue?: string
  onDateChange?: (isoDate: string) => void
  dateDisabled?: boolean
  /** When false, omit row divider (parent uses divide-y or IA_FIELD_DIVIDER_CLASS). */
  showDivider?: boolean
}

export function InitialAssessmentPaperYesNoRow({
  label,
  value,
  disabled,
  name,
  onChange,
  dateLabel,
  dateValue,
  onDateChange,
  dateDisabled,
  showDivider = false,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:gap-4',
        showDivider && 'border-b border-border/60 last:border-b-0',
      )}
    >
      <span className={cn('min-w-0 flex-1', IA_PAPER_ROW_LABEL_CLASS)}>{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex items-center gap-3"
          role="radiogroup"
          aria-label={typeof label === 'string' ? label : undefined}
        >
          {(
            [
              { v: true, text: 'Yes' },
              { v: false, text: 'No' },
            ] as const
          ).map(({ v, text }) => (
            <label
              key={text}
              className={cn(
                'flex cursor-pointer items-center gap-1.5',
                IA_OPTION_LABEL_CLASS,
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={name}
                className={IA_RADIO_CLASS}
                checked={value === v}
                disabled={disabled}
                onChange={() => onChange(v)}
              />
              {text}
            </label>
          ))}
        </div>
        {dateLabel && onDateChange ? (
          <label className={cn('flex items-center gap-2', IA_OPTION_LABEL_CLASS)}>
            <span className="text-muted-foreground">{dateLabel}</span>
            <Input
              type="date"
              className="h-10 w-[148px] text-base"
              disabled={disabled || dateDisabled}
              value={dateValue?.slice(0, 10) ?? ''}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </label>
        ) : null}
      </div>
    </div>
  )
}
