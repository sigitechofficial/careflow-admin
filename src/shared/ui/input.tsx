import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { DictationTextControl, splitLayoutClasses, useDictationEnabled } from '@/shared/ui/dictation'
import { DateInput, DateTimeInput, MonthInput, TimeInput } from '@/shared/ui/date-time-input'

/** The browser's own date/time boxes follow the browser language (a US Chrome shows 06/15/2026, 2:30 PM). These follow the organisation's settings. */
const DATE_TIME_FIELDS = { date: DateInput, time: TimeInput, 'datetime-local': DateTimeInput, month: MonthInput } as const

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftElement, rightElement, error, ...props }, ref) => {
    const DateTimeField = type ? DATE_TIME_FIELDS[type as keyof typeof DATE_TIME_FIELDS] : undefined
    if (DateTimeField) return <DateTimeField ref={ref} className={className} error={error} {...props} />
    const dictation =
      useDictationEnabled() && (type == null || type === 'text' || type === 'search') && !props.readOnly

    if (leftElement || rightElement) {
      return (
        <div className="relative flex items-center">
          {leftElement && (
            <div className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
              {leftElement}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm',
              'shadow-sm transition-colors',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus-visible:ring-destructive/30',
              leftElement && 'pl-9',
              rightElement && 'pr-9',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>
      )
    }

    const [layoutClass, controlClass] = dictation ? splitLayoutClasses(className) : ['', className]
    const input = (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm',
          'shadow-sm transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive/30',
          controlClass,
          dictation && 'pr-9'
        )}
        ref={ref}
        {...props}
      />
    )

    return dictation ? (
      <DictationTextControl className={layoutClass} disabled={props.disabled}>
        {input}
      </DictationTextControl>
    ) : (
      input
    )
  }
)
Input.displayName = 'Input'

export { Input }
