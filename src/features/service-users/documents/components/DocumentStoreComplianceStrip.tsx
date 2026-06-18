import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { DocumentComplianceItem } from '@/features/service-users/documents/service-user-document-store.api'

function toneIcon(tone: DocumentComplianceItem['tone']) {
  if (tone === 'green') return CheckCircle2
  if (tone === 'amber') return AlertTriangle
  return XCircle
}

function toneClass(tone: DocumentComplianceItem['tone']) {
  if (tone === 'green') return 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
  if (tone === 'amber') return 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
  return 'border-red-200 bg-red-50/80 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
}

export function DocumentStoreComplianceStrip({
  compliance,
  carePlanApprovalBlocked,
}: {
  compliance: DocumentComplianceItem[]
  carePlanApprovalBlocked: boolean
}) {
  return (
    <div className="space-y-3" data-testid="document-store-compliance-strip">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Compliance summary</h2>
          <p className="text-xs text-muted-foreground">
            Mandatory documents before first visit and care plan approval.
          </p>
        </div>
        {carePlanApprovalBlocked ? (
          <span className="rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            Blocks care plan approval
          </span>
        ) : (
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            Care plan approval clear
          </span>
        )}
      </div>

      <div className="grid gap-2 lg:grid-cols-3 xl:grid-cols-6">
        {compliance.map((item) => {
          const Icon = toneIcon(item.tone)
          return (
            <div
              key={item.key}
              className={cn('rounded-lg border px-3 py-2.5', toneClass(item.tone))}
              title={item.detail}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug">{item.label}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-90">
                    {item.statusLabel}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
