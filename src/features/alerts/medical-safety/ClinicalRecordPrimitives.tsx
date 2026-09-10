import * as React from 'react'
import { cn } from '@/shared/lib/utils'

/** Rectangular clinical form control — not a rounded dashboard input. */
export const clinicalFieldClass =
  'h-8 rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-[#0f6b6b]'

/** Clinical record section — dense horizontal band, not a dashboard card. */
export function ClinicalBand({
  title,
  icon,
  actions,
  children,
  testId,
  className,
}: {
  title: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  testId?: string
  className?: string
}) {
  return (
    <section className={cn('border border-slate-300 bg-white', className)} data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0f6b6b] px-3 py-1.5 text-white">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
          <h2 className="truncate text-[13px] font-semibold tracking-wide">{title}</h2>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="bg-[#eef4f4] px-3 py-2.5 sm:px-4">{children}</div>
    </section>
  )
}

export function ClinicalSubBand({
  title,
  icon,
  children,
  testId,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  testId?: string
}) {
  return (
    <div className="border border-slate-300 bg-white" data-testid={testId}>
      <div className="flex items-center gap-2 bg-[#0f6b6b] px-3 py-1.5 text-white">
        {icon}
        <h3 className="text-[13px] font-semibold tracking-wide">{title}</h3>
      </div>
      <div className="bg-white px-3 py-2.5">{children}</div>
    </div>
  )
}

export function YesNoToggle({
  value,
  onChange,
  disabled,
  name,
}: {
  value: 'YES' | 'NO' | 'UNKNOWN'
  onChange?: (next: 'YES' | 'NO') => void
  disabled?: boolean
  name: string
}) {
  const btn = (v: 'YES' | 'NO') => {
    const active = value === v
    return (
      <button
        type="button"
        name={`${name}-${v}`}
        disabled={disabled || !onChange}
        onClick={() => onChange?.(v)}
        className={cn(
          'min-w-[3.5rem] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
          active && v === 'YES' && 'border-[#0f6b6b] bg-[#0f6b6b] text-white',
          active && v === 'NO' && 'border-slate-600 bg-slate-600 text-white',
          !active && 'border-slate-400 bg-white text-slate-700',
          (disabled || !onChange) && 'cursor-default',
        )}
        aria-pressed={active}
      >
        {v}
      </button>
    )
  }
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={name}>
      {btn('YES')}
      {btn('NO')}
    </div>
  )
}
