import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import {
  clearVisitCareConsents,
  type VisitCareConsentRow,
} from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'

type Props = {
  jobId: string
  consents: VisitCareConsentRow[]
  loading?: boolean
  className?: string
}

export function VisitCareConsentSection({ jobId, consents, loading = false, className }: Props) {
  const queryClient = useQueryClient()
  const recorded = consents.length > 0

  const clearMutation = useMutation({
    mutationFn: () => clearVisitCareConsents(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: schedulingKeys.careConsents(jobId) })
      toastSuccess('Consent unmarked', 'The carer app will ask again after a pull-to-refresh.')
    },
    onError: (error) => toastApiError(error, 'Could not clear consent'),
  })

  function onUnmark() {
    if (clearMutation.isPending) return
    const ok = window.confirm(
      'Clear consent for this visit? The lead will need to record it again on the app.',
    )
    if (!ok) return
    clearMutation.mutate()
  }

  return (
    <section className={cn('rounded-lg border border-border bg-muted/20 px-4 py-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Consent to care</h3>
        {recorded ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={clearMutation.isPending}
            onClick={onUnmark}
          >
            {clearMutation.isPending ? 'Clearing…' : 'Unmark'}
          </Button>
        ) : null}
      </div>
      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading consent…</p>
      ) : !recorded ? (
        <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          Not recorded yet
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {consents.map((row, index) => (
            <ConsentRow key={`${row.capturedByEmployeeId ?? 'row'}-${index}`} row={row} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ConsentRow({ row }: { row: VisitCareConsentRow }) {
  const granted = row.status === 'GRANTED'
  const when = row.recordedAt ? formatOrganisationDateTime(row.recordedAt) : null
  const who = row.capturedByName

  return (
    <li
      className={cn(
        'rounded-md border px-3 py-2',
        granted
          ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30',
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {granted ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
        )}
        {granted ? 'Yes — consents to today’s care' : 'No — consent declined'}
      </p>
      {who || when ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[who, when].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {!granted ? (
        <p className="mt-1.5 text-sm text-foreground">
          <span className="text-muted-foreground">Reason: </span>
          {row.reason?.trim() || 'No reason recorded'}
        </p>
      ) : null}
    </li>
  )
}
