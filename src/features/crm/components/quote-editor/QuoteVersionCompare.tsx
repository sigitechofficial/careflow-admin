import * as React from 'react'
import { ArrowRight, GitCompareArrows } from 'lucide-react'
import { money } from '@/features/crm/quote-labels'
import type { QuoteDiff } from '@/features/crm/types/quotation.types'

type Row = QuoteDiff['rows'][number]

/** Sections in reading order: the price first, then how it is priced, the quote, and what changed inside it. */
const SECTION_ORDER = ['Price', 'Pricing', 'General', 'Visits', 'Funding', 'Extras']
const SECTION_TITLES: Record<string, string> = {
  Price: 'Price',
  Pricing: 'How it is priced',
  General: 'Quote details',
  Visits: 'Visits',
  Funding: 'Funding',
  Extras: 'Extras',
}

function Delta({ value, suffix = '' }: { value: number | null | undefined; suffix?: string }) {
  if (value == null || value === 0) return null
  const up = value > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      }`}
    >
      {up ? '+' : '−'}
      {money(Math.abs(value))}
      {suffix}
    </span>
  )
}

function Side({ title, status, weekly, client }: { title: string; status: string; weekly: number; client: number }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} · {status}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {money(weekly)} <span className="text-sm font-normal text-muted-foreground">a week</span>
      </p>
      <p className="text-xs text-muted-foreground">Client pays {money(client)} a week</p>
    </div>
  )
}

function ChangeRow({ row }: { row: Row }) {
  return (
    <li className="grid grid-cols-1 items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]">
      <span className="text-sm text-muted-foreground">{row.field}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <span className={row.from ? 'text-muted-foreground line-through decoration-muted-foreground/50' : 'italic text-muted-foreground'}>
          {row.from ?? 'not set'}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className={row.to ? 'font-medium text-foreground' : 'italic text-muted-foreground'}>{row.to ?? 'not set'}</span>
      </span>
      <span className="sm:justify-self-end">
        <Delta value={row.delta} />
      </span>
    </li>
  )
}

/**
 * Two versions side by side in plain words: the weekly price of each and the difference, then
 * each change by section — a visit's, funder's or extra's changes grouped under it.
 */
export function QuoteVersionCompare({ diff }: { diff: QuoteDiff }) {
  const sections = React.useMemo(() => {
    const bySection = new Map<string, Row[]>()
    for (const r of diff.rows) bySection.set(r.section, [...(bySection.get(r.section) ?? []), r])
    const rank = (s: string) => (SECTION_ORDER.includes(s) ? SECTION_ORDER.indexOf(s) : SECTION_ORDER.length)
    return [...bySection.entries()].sort(([a], [b]) => rank(a) - rank(b))
  }, [diff.rows])

  const weeklyChange = Math.round((diff.to.weeklyTotal - diff.from.weeklyTotal) * 100) / 100

  return (
    <div className="flex flex-col gap-4" data-testid="quote-version-compare">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Side title={`V${diff.from.versionNumber}`} status={diff.from.statusLabel} weekly={diff.from.weeklyTotal} client={diff.from.clientWeeklyLiability} />
        <div className="flex flex-col items-center gap-1 px-1">
          <ArrowRight className="hidden h-5 w-5 text-muted-foreground sm:block" aria-hidden />
          <Delta value={weeklyChange} suffix=" a week" />
        </div>
        <Side title={`V${diff.to.versionNumber}`} status={diff.to.statusLabel} weekly={diff.to.weeklyTotal} client={diff.to.clientWeeklyLiability} />
      </div>

      {diff.rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">No differences between these versions.</p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitCompareArrows className="h-4 w-4" aria-hidden />
            {diff.rows.length} change{diff.rows.length === 1 ? '' : 's'} from V{diff.from.versionNumber} to V{diff.to.versionNumber}
          </p>
          {sections.map(([section, rows]) => {
            const items: { item: string | null; rows: Row[] }[] = []
            for (const r of rows) {
              const last = items[items.length - 1]
              if (last && last.item === r.item) last.rows.push(r)
              else items.push({ item: r.item, rows: [r] })
            }
            return (
              <section key={section} className="overflow-hidden rounded-lg border border-border" data-testid={`quote-compare-${section}`}>
                <h5 className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {SECTION_TITLES[section] ?? section}
                  <span className="rounded-full bg-background px-2 py-0.5 normal-case tracking-normal">
                    {rows.length} change{rows.length === 1 ? '' : 's'}
                  </span>
                </h5>
                {items.map((group, gi) => {
                  const added = group.rows.some(r => r.change === 'added')
                  const removed = group.rows.some(r => r.change === 'removed')
                  return (
                    <div key={gi} className={gi > 0 ? 'border-t border-border' : undefined}>
                      {group.item && (
                        <p className="flex items-center gap-2 px-4 pt-3 text-sm font-semibold">
                          {group.item}
                          {added && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Added</span>}
                          {removed && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">Removed</span>}
                        </p>
                      )}
                      {!added && !removed && (
                        <ul className="divide-y divide-border/60">
                          {group.rows.map((r, i) => (
                            <ChangeRow key={i} row={r} />
                          ))}
                        </ul>
                      )}
                      {(added || removed) && <div className="pb-3" />}
                    </div>
                  )
                })}
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
