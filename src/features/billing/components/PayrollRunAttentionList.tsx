import { AlertTriangle } from 'lucide-react'
import type { PayrollRunLineDetail, PayrollRunNmwException } from '@/features/billing/api/payroll-runs.api'

/**
 * Earnings in a pay run that could not be worked out (R-22, R-27). Each is held at £0.00 with the
 * reason and is not lost: fixing the cause and recalculating pays it. Shows nothing when every
 * line was worked out.
 */
export function PayrollRunAttentionList({
  lines,
  nmwExceptions = [],
  carerNames = {},
}: {
  lines: PayrollRunLineDetail[]
  nmwExceptions?: PayrollRunNmwException[]
  carerNames?: Record<string, string>
}) {
  const held = lines.filter(line => line.exceptionMessage)
  if (held.length === 0 && nmwExceptions.length === 0) return null
  if (held.length === 0) return <NmwExceptions items={nmwExceptions} carerNames={carerNames} />
  return (
    <>
      <HeldEarnings held={held} />
      <NmwExceptions items={nmwExceptions} carerNames={carerNames} />
    </>
  )
}

/**
 * Minimum wage assessments of the run that were not made on the worker's own pay reference period
 * (no payroll schedule, or a period longer than a month), or that are made elsewhere (salaried).
 * The check was still made over a month or less; this says what to put right.
 */
function NmwExceptions({ items, carerNames }: { items: PayrollRunNmwException[]; carerNames: Record<string, string> }) {
  if (items.length === 0) return null
  return (
    <div
      className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10"
      data-testid="payroll-run-nmw-exceptions"
      role="alert"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-50">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        Minimum wage: {items.length} assessment{items.length === 1 ? '' : 's'} need{items.length === 1 ? 's' : ''} attention
      </p>
      <ul className="divide-y divide-amber-200 rounded-md border border-amber-200 bg-background/70 dark:divide-amber-500/30 dark:border-amber-500/30">
        {items.map(item => (
          <li key={`${item.employeeId}:${item.periodStart}`} className="space-y-0.5 px-3 py-2 text-sm" data-testid="payroll-run-nmw-exception-item">
            <p className="font-medium text-foreground">
              {carerNames[item.employeeId] ?? 'Carer'} · {item.periodStart} to {item.periodEnd}
            </p>
            <p className="text-xs text-amber-900 dark:text-amber-100">{item.message ?? item.issue}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HeldEarnings({ held }: { held: PayrollRunLineDetail[] }) {
  return (
    <div
      className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10"
      data-testid="payroll-run-attention"
      role="alert"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-50">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        {held.length} earning{held.length === 1 ? '' : 's'} could not be worked out and {held.length === 1 ? 'is' : 'are'} not in this run&apos;s pay
      </p>
      <p className="text-xs text-amber-900/90 dark:text-amber-100/90">
        Nothing is lost: fix the reason and recalculate the run. Each stays payable until it is paid or withdrawn.
      </p>
      <ul className="divide-y divide-amber-200 rounded-md border border-amber-200 bg-background/70 dark:divide-amber-500/30 dark:border-amber-500/30">
        {held.map(line => (
          <li key={line.id} className="space-y-0.5 px-3 py-2 text-sm" data-testid="payroll-run-attention-item">
            <p className="font-medium text-foreground">
              {line.carerName}
              {line.visitRef ? ` · ${line.visitRef}` : ''}
            </p>
            <p className="text-foreground/90">{line.description}</p>
            <p className="text-xs text-amber-900 dark:text-amber-100">{line.exceptionMessage}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
