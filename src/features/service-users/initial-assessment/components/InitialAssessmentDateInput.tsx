import * as React from 'react'
import { Calendar } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  IA_DATE_INPUT_CLASS,
  IA_SIMPLE_INPUT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
  value?: string
  simple?: boolean
}

export function InitialAssessmentDateInput({
  id,
  value = '',
  disabled,
  className,
  simple = false,
  onChange,
  ...rest
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const el = inputRef.current
    if (!el || disabled) return
    el.focus()
    el.showPicker?.()
  }

  return (
    <div className="relative w-full min-w-0">
      <Input
        {...rest}
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={cn(
          simple ? IA_SIMPLE_INPUT_CLASS : 'h-10 w-full text-base',
          IA_DATE_INPUT_CLASS,
          className,
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Open calendar"
        className={cn(
          'absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground',
          'hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
        )}
        onClick={openPicker}
      >
        <Calendar className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
