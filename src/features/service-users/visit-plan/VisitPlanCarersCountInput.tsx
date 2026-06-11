import * as React from 'react'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

const MIN_CARERS = 1
const MAX_CARERS = 4

type Props = {
  value: number
  disabled?: boolean
  className?: string
  'aria-label'?: string
  onCommit: (next: number) => void
}

export function VisitPlanCarersCountInput({
  value,
  disabled,
  className,
  onCommit,
  'aria-label': ariaLabel,
}: Props) {
  const [draft, setDraft] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDraft(null)
  }, [value])

  const display = draft ?? String(value)

  const commit = () => {
    const raw = draft ?? String(value)
    setDraft(null)
    const trimmed = raw.trim()
    if (!trimmed) return
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return
    const clamped = Math.min(MAX_CARERS, Math.max(MIN_CARERS, Math.round(n)))
    if (clamped !== value) onCommit(clamped)
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      className={cn('tabular-nums', className)}
      disabled={disabled}
      value={display}
      aria-label={ariaLabel}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value
        if (raw !== '' && !/^\d*$/.test(raw)) return
        setDraft(raw)
      }}
      onBlur={commit}
    />
  )
}
