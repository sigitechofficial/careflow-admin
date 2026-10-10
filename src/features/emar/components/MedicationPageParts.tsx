import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getSyncedOperationalTimeZone, operationalTodayIso } from '@/shared/lib/operational-day.util'
import { illustrationSrc } from '@/components/layout/nav-illustrations'

/* Shared pieces for the Medication (eMAR) module pages. */

export type RangePreset = 'today' | '7' | '30' | 'month'

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
]

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`)
  return new Date(d.getTime() + days * 86_400_000).toISOString().slice(0, 10)
}

export function rangeFor(preset: RangePreset): { dateFrom: string; dateTo: string } {
  const today = operationalTodayIso()
  if (preset === 'today') return { dateFrom: today, dateTo: today }
  if (preset === 'month') return { dateFrom: `${today.slice(0, 8)}01`, dateTo: today }
  return { dateFrom: addDays(today, -(Number(preset) - 1)), dateTo: today }
}

export function MedicationPageHeader({
  title,
  description,
  illustration,
  children,
}: {
  title: string
  description: string
  illustration: string
  children?: React.ReactNode
}) {
  return (
    <header className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <Link to="/apps/$module" params={{ module: 'medication' }} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Medication
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted/60">
            <img src={illustrationSrc(illustration)} alt="" aria-hidden="true" className="h-8 w-8" draggable={false} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </header>
  )
}

export function RangePicker({ value, onChange }: { value: RangePreset; onChange: (v: RangePreset) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Date range">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          aria-pressed={value === p.id}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === p.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {count !== undefined ? <span className="tabular-nums opacity-80">{count}</span> : null}
    </button>
  )
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  // Organisation wall clock, matching the date ranges.
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getSyncedOperationalTimeZone(),
  })
}

export function personName(p?: { personalDetail?: { firstName?: string | null; lastName?: string | null } | null } | null): string {
  const pd = p?.personalDetail
  return [pd?.firstName, pd?.lastName].filter(Boolean).join(' ') || '—'
}

export function serviceUserName(su?: { firstName?: string | null; lastName?: string | null } | null): string {
  return [su?.firstName, su?.lastName].filter(Boolean).join(' ') || '—'
}

export function ServiceUserMedicationLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link to="/service-users/$serviceUserId/medication" params={{ serviceUserId: id }} className="font-medium text-foreground hover:text-primary hover:underline">
      {children}
    </Link>
  )
}

export function EmptyRows({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted-foreground">
        {text}
      </td>
    </tr>
  )
}
