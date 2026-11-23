import { CheckCircle2, ChevronLeft, ChevronRight, MinusCircle, RotateCw } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import type { AuditRow, ComplianceLevel } from '../types'
import { initials, levelVariant, remainingText, statusText, statusVariant } from '../labels'

const LEVEL_TEXT: Record<ComplianceLevel, string> = {
  COMPLIANT: 'text-success',
  PARTIALLY_COMPLIANT: 'text-warning',
  NOT_COMPLIANT: 'text-destructive',
}

function levelOf(percent: number | null): ComplianceLevel | null {
  if (percent === null) return null
  return percent >= 90 ? 'COMPLIANT' : percent >= 75 ? 'PARTIALLY_COMPLIANT' : 'NOT_COMPLIANT'
}

/** A % with a coloured tick by compliance level, or a grey dash when there is none. */
export function ResultCell({ percent }: { percent: number | null }) {
  const level = levelOf(percent)
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      {level ? (
        <CheckCircle2 className={cn('h-5 w-5', LEVEL_TEXT[level])} aria-hidden />
      ) : (
        <MinusCircle className="h-5 w-5 text-muted-foreground/60" aria-hidden />
      )}
      {percent === null ? '—' : `${percent}%`}
    </span>
  )
}

export function PersonChip({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold">
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}

/** Audits as on the dashboard: previous result, audit, audited item, status, area, due, person and time left. */
export function AuditTable({
  rows,
  loading,
  empty,
  onOpen,
  completed = false,
  page,
  totalPages,
  onPage,
}: {
  rows: AuditRow[]
  loading?: boolean
  empty: string
  onOpen: (id: string) => void
  /** Completed audits show their own result and when they were completed. */
  completed?: boolean
  page?: number
  totalPages?: number
  onPage?: (page: number) => void
}) {
  const heads = completed
    ? ['Result', 'Audit', 'Audited item', 'Branch', 'Area', 'Completed', 'Person accountable', 'Level']
    : ['Previous result', 'Audit', 'Audited item', 'Branch', 'Status', 'Area', 'Due', 'Person accountable', 'Time left']
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="audit-table">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              {heads.map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? (
              <tr>
                <td colSpan={heads.length} className="px-3 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={heads.length} className="px-3 py-8 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
                  onClick={() => onOpen(r.id)}
                  data-testid="audit-row"
                >
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <ResultCell percent={completed ? r.percent : r.previousPercent} />
                  </td>
                  <td className="min-w-[14rem] px-3 py-2.5">
                    <button
                      type="button"
                      className="text-left font-medium text-primary hover:underline"
                      onClick={e => {
                        e.stopPropagation()
                        onOpen(r.id)
                      }}
                    >
                      {r.title}
                    </button>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {r.scheduled ? (
                        <span className="inline-flex items-center gap-0.5" title="Made by a schedule">
                          <RotateCw className="h-3 w-3" aria-hidden />
                          Scheduled
                        </span>
                      ) : (
                        <span>Started by hand</span>
                      )}
                      {!completed && r.status === 'IN_PROGRESS' ? (
                        <span>
                          · {r.answered}/{r.total} answered
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {r.auditedItem ? (
                      <>
                        <div className="text-muted-foreground">{r.auditedItem.label}</div>
                        <div className="text-foreground">{r.auditedItem.value || '—'}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.location?.name ?? 'Whole organisation'}</td>
                  {completed ? null : (
                    <td className="px-3 py-2.5">
                      <Badge size="sm" variant={statusVariant(r.status, r.state)}>
                        {statusText(r.status, r.state)}
                      </Badge>
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{r.template.area?.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {completed ? formatOrganisationDate(r.completedAt) : formatOrganisationDate(r.dueDate ?? r.auditDate)}
                  </td>
                  <td className="max-w-[12rem] px-3 py-2.5">
                    <PersonChip name={r.accountable?.name} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {completed ? (
                      r.level ? (
                        <Badge size="sm" variant={levelVariant(r.level)}>
                          {r.level === 'COMPLIANT' ? 'Compliant' : r.level === 'PARTIALLY_COMPLIANT' ? 'Partially' : 'Not compliant'}
                        </Badge>
                      ) : (
                        '—'
                      )
                    ) : (
                      <span className={cn(r.state === 'OVERDUE' && 'font-medium text-warning')}>
                        {remainingText(r.daysToDue, r.state) || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {page && totalPages && totalPages > 1 && onPage ? (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
