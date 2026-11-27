import { ArrowDownRight, ArrowRight, ArrowUpRight, History } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { Badge } from '@/shared/ui/badge'
import type { CqcRating, MockInspectionComparison, StatementChange } from '../types'
import { useMockInspectionComparison } from '../hooks'
import { RATING_LABEL, ratingVariant } from '../labels'
import { HELP } from '../help'
import { InfoTip } from './InfoTip'

function RatingBadge({ rating }: { rating: CqcRating | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge size="sm" variant={ratingVariant(rating)}>
      {RATING_LABEL[rating]}
    </Badge>
  )
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? '+' : ''}
      {value} pts
    </span>
  )
}

function StatementList({ title, items, tone }: { title: string; items: StatementChange[]; tone: 'up' | 'down' }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium text-muted-foreground">
        {title} ({items.length})
      </h4>
      <ul className="space-y-0.5 text-sm" data-testid={`mock-compare-${tone}`}>
        {items.map(s => (
          <li key={s.code} className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">{s.title}</span>
            <span className={cn('shrink-0 tabular-nums text-xs', tone === 'up' ? 'text-success' : 'text-destructive')}>
              {s.from} → {s.to}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Then / Now / Change for the overall rating and each key question, and the statements that moved. */
export function ComparisonDetails({
  comparison,
  overallLabel = 'Overall',
}: {
  /** The overall row may also carry percentages (the CQC dashboard's average across branches). */
  comparison: NonNullable<MockInspectionComparison['comparison']> & {
    overall: { fromPercent?: number | null; toPercent?: number | null; change?: number | null }
  }
  overallLabel?: string
}) {
  const { overall } = comparison
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              {['', 'Before', 'Latest', 'Change'].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border font-medium">
              <td className="px-3 py-2">{overallLabel}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <RatingBadge rating={overall.from} />
                {overall.fromPercent != null ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">{overall.fromPercent}%</span>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <RatingBadge rating={overall.to} />
                {overall.toPercent != null ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">{overall.toPercent}%</span>
                ) : null}
              </td>
              <td className="px-3 py-2">{overall.change !== undefined ? <Change value={overall.change} /> : null}</td>
            </tr>
            {comparison.keyQuestions.map(k => (
              <tr key={k.code} className="border-b border-border last:border-0" data-testid="mock-compare-kq">
                <td className="px-3 py-2">{k.title}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <RatingBadge rating={k.fromRating} />
                  {k.fromPercent != null ? <span className="ml-1.5 text-xs text-muted-foreground">{k.fromPercent}%</span> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <RatingBadge rating={k.toRating} />
                  {k.toPercent != null ? <span className="ml-1.5 text-xs text-muted-foreground">{k.toPercent}%</span> : null}
                </td>
                <td className="px-3 py-2">
                  <Change value={k.change} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatementList title="Got better" items={comparison.improved} tone="up" />
        <StatementList title="Got worse" items={comparison.declined} tone="down" />
      </div>
      {!comparison.improved.length && !comparison.declined.length ? (
        <p className="text-sm text-muted-foreground">
          No score changed{comparison.unchangedCount ? ` (${comparison.unchangedCount} stayed the same)` : ''}.
        </p>
      ) : comparison.unchangedCount ? (
        <p className="text-xs text-muted-foreground">{comparison.unchangedCount} stayed the same.</p>
      ) : null}
    </>
  )
}

/** This inspection against the last completed one for the same service. */
export function ComparisonCard({ inspectionId }: { inspectionId: string }) {
  const query = useMockInspectionComparison(inspectionId)
  if (query.isLoading || query.error || !query.data) return null
  const { previous, comparison } = query.data

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="mock-comparison">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Compared with the previous inspection</h2>
        <InfoTip label="the comparison">{HELP.comparison}</InfoTip>
      </div>
      {!previous || !comparison ? (
        <p className="text-sm text-muted-foreground">
          No earlier completed mock inspection of this service yet. Once there is one, this shows what has got better or
          worse since then.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <Link
              to="/governance/mock-inspections/$inspectionId"
              params={{ inspectionId: previous.id }}
              className="font-medium text-primary hover:underline"
            >
              {previous.title}
            </Link>
            {previous.completedAt ? `, completed ${formatOrganisationDate(previous.completedAt)}` : ''}
          </p>
          <ComparisonDetails comparison={comparison} />
        </div>
      )}
    </div>
  )
}
