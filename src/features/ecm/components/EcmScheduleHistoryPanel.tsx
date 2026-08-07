import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { cn } from '@/shared/lib/utils'
import type { EcmScheduleHistory } from '@/features/ecm/types/ecm.types'

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function EcmScheduleHistoryPanel({
  history,
  versionsOnly = false,
}: {
  history: EcmScheduleHistory | null | undefined
  /** When true, skip the Original / Current summary (shown elsewhere). */
  versionsOnly?: boolean
}) {
  if (!history?.versions?.length) {
    return (
      <div className="rounded-lg border border-border p-3" data-testid="ecm-schedule-history">
        {!versionsOnly ? (
          <p className="text-xs font-medium text-muted-foreground">Schedule history</p>
        ) : null}
        <p className={cn(!versionsOnly && 'mt-1', 'text-sm text-muted-foreground')}>
          Original schedule will be captured on first ECM evaluation or job create.
        </p>
      </div>
    )
  }

  const original = history.original ?? history.versions[0]
  const current = history.current ?? history.versions[history.versions.length - 1]

  return (
    <div className="space-y-3" data-testid="ecm-schedule-history">
      {!versionsOnly ? (
        <>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Schedule history (GAP1)</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Punctuality uses the current communicated schedule. Original is never overwritten.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Original</p>
              <p className="mt-1 text-sm">{formatWhen(original?.plannedStartDateTime)}</p>
              <p className="text-xs text-muted-foreground">
                to {formatWhen(original?.plannedEndDateTime)}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Current / revised</p>
              <p className="mt-1 text-sm">{formatWhen(current?.plannedStartDateTime)}</p>
              <p className="text-xs text-muted-foreground">
                to {formatWhen(current?.plannedEndDateTime)}
              </p>
              {current && !current.isOriginal ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <EcmStatusBadge code={current.changeClass} kind="generic" />
                  {current.lateNotice ? <EcmStatusBadge code="LATE_NOTICE" kind="generic" /> : null}
                  {current.retrospective ? (
                    <EcmStatusBadge code="RETROSPECTIVE" kind="generic" />
                  ) : null}
                  {current.retrospective && current.managerApproved !== true ? (
                    <EcmStatusBadge code="APPROVAL_PENDING" kind="generic" />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Full version list. Punctuality uses the current communicated schedule; original is never
          overwritten.
        </p>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {history.versions.map(v => (
          <li key={v.id} className="px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">
                  v{v.versionNumber}
                  {v.isOriginal ? ' · Original' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatWhen(v.plannedStartDateTime)}
                  {v.plannedEndDateTime ? ` – ${formatWhen(v.plannedEndDateTime)}` : ''}
                  {' · changed '}
                  {formatWhen(v.changedAt)}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                <EcmStatusBadge code={v.changeClass} kind="generic" />
                {v.serviceUserInformed === true ? (
                  <EcmStatusBadge code="SU_INFORMED" kind="generic" />
                ) : null}
                {v.serviceUserAgreed === true ? (
                  <EcmStatusBadge code="SU_AGREED" kind="generic" />
                ) : null}
                {v.retrospective && v.managerApproved === true ? (
                  <EcmStatusBadge code="MANAGER_APPROVED" kind="generic" />
                ) : null}
              </div>
            </div>
            {v.reasonCode || v.reasonNote ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {[v.reasonCode, v.reasonNote].filter(Boolean).join(' — ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
