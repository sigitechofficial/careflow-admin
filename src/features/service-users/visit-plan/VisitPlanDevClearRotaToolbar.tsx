import * as React from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { serviceUserKeys } from '@/features/service-users/keys'
import { schedulingKeys } from '@/features/scheduling/keys'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import {
  clearAllVisitPlansAndRota,
  clearServiceUserVisitPlansAndRota,
  type ClearServiceUserVisitsResult,
  type ClearVisitPlansAndRotaResult,
} from '@/features/service-users/visit-plan/api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import { contentAlertClass, contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'

/** Which visits a dry run or clear covers: the open service user's, or every service user's. */
type Scope = 'serviceUser' | 'all'

type LastRun =
  | { scope: 'all'; result: ClearVisitPlansAndRotaResult }
  | { scope: 'serviceUser'; result: ClearServiceUserVisitsResult }

function formatAllCounts(result: ClearVisitPlansAndRotaResult): string {
  const rows = result.deleted ?? result.counts
  return [
    `${rows.serviceUserVisitPlan} visit plan(s)`,
    `${rows.scheduledVisit} scheduled visit(s)`,
    `${rows.scheduledJob} job(s)`,
    `${rows.jobAllocation} allocation(s)`,
  ].join(', ')
}

function formatServiceUserCounts(result: ClearServiceUserVisitsResult): string {
  const rows = result.deleted ?? result.counts
  return [
    `${rows.serviceUserVisitPlan} visit plan(s)`,
    `${rows.scheduledVisit} scheduled visit(s)`,
    `${rows.scheduledJob} job(s)`,
    `${rows.jobAllocation} allocation(s)`,
    ...(rows.pendingHoursApproval ? [`${rows.pendingHoursApproval} pending Hours approval(s)`] : []),
  ].join(', ')
}

const formatLastRun = (run: LastRun) =>
  run.scope === 'all'
    ? `all service users — ${formatAllCounts(run.result)}`
    : `${run.result.serviceUserName} only — ${formatServiceUserCounts(run.result)}`

type Props = {
  serviceUserId: string
}

export function VisitPlanDevClearRotaToolbar({ serviceUserId }: Props) {
  const queryClient = useQueryClient()
  const profile = useServiceUser(serviceUserId)
  const [dialog, setDialog] = React.useState<'dry' | 'clear' | null>(null)
  // The narrower choice comes first and is the default.
  const [scope, setScope] = React.useState<Scope>('serviceUser')
  const [pending, setPending] = React.useState<'dry' | 'clear' | null>(null)
  const [lastRun, setLastRun] = React.useState<LastRun | null>(null)

  const su = profile.data
  const suName = su ? su.preferredName?.trim() || `${su.firstName} ${su.lastName}`.trim() : 'this service user'
  const suLabel = su?.serviceUserNumber ? `${suName} (${su.serviceUserNumber})` : suName

  const invalidateCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) }),
      queryClient.invalidateQueries({ queryKey: serviceUserKeys.detail(serviceUserId) }),
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all() }),
    ])
  }

  const openDialog = (kind: 'dry' | 'clear') => {
    setScope('serviceUser')
    setDialog(kind)
  }

  const run = async (kind: 'dry' | 'clear') => {
    const dryRun = kind === 'dry'
    setPending(kind)
    try {
      const next: LastRun =
        scope === 'all'
          ? { scope: 'all', result: await clearAllVisitPlansAndRota(dryRun) }
          : { scope: 'serviceUser', result: await clearServiceUserVisitPlansAndRota(serviceUserId, dryRun) }
      setLastRun(next)
      if (dryRun) {
        toastSuccess('Dry run complete', `Would delete for ${formatLastRun(next)}. Nothing was deleted.`)
      } else {
        await invalidateCaches()
        toastSuccess(
          next.scope === 'all' ? 'Visit plans and rota cleared' : `${suName}'s visits cleared`,
          `Deleted for ${formatLastRun(next)}.`,
        )
      }
      setDialog(null)
    } catch (e) {
      toastApiError(e, dryRun ? 'Dry run failed' : 'Could not clear visit plans and rota')
    } finally {
      setPending(null)
    }
  }

  const options: Array<{ value: Scope; title: string; detail: React.ReactNode }> = [
    {
      value: 'serviceUser',
      title: `Clear this service user's visits — ${suLabel}`,
      detail: (
        <>
          Only {suName}&rsquo;s visit plans, rota visits (jobs) and carer allocations. Other service users are not touched.
        </>
      ),
    },
    {
      value: 'all',
      title: 'Clear all visits — every service user',
      detail: (
        <>
          Every visit plan, scheduled visit, job, allocation and schedule run for{' '}
          <strong className="text-foreground">all service users</strong>.
        </>
      ),
    },
  ]

  const isDry = dialog === 'dry'
  const confirmText = isDry
    ? 'Run dry run'
    : scope === 'all'
      ? 'Clear everything'
      : `Clear ${suName}'s visits`

  return (
    <section
      className="rounded-lg border border-dashed border-amber-400/80 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20"
      data-testid="visit-plan-dev-clear-rota-toolbar"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className={cn(contentTitleClass, 'text-amber-950 dark:text-amber-100')}>Reset visit plans & rota</p>
          <p className={cn('max-w-3xl', contentAlertClass)}>
            Clear deletes visit plans and scheduling data — choose <strong>this service user only</strong> or{' '}
            <strong>all service users</strong>. Service users, employees, and schedule areas are kept. Clearing all runs the same
            cleanup as{' '}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 dark:bg-amber-900/40">
              npx ts-node --transpile-only prisma/scripts/clear-visit-plans-and-rota.ts
            </code>
            .
          </p>
          {lastRun ? (
            <p className={contentHelperClass}>
              Last run: {lastRun.result.dryRun ? 'dry run' : 'cleared'} — {formatLastRun(lastRun)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending != null} onClick={() => openDialog('dry')}>
            {pending === 'dry' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Dry run
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={pending != null} onClick={() => openDialog('clear')}>
            {pending === 'clear' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        </div>
      </div>

      <AlertDialog open={dialog != null} onOpenChange={(open) => (!open && pending == null ? setDialog(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isDry ? 'Dry run — what would be cleared?' : 'Clear visits'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isDry ? 'Choose what to count. Nothing is deleted.' : 'Choose what to clear. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2" role="radiogroup" aria-label="What to clear">
            {options.map((o) => (
              <label
                key={o.value}
                htmlFor={`clear-scope-${o.value}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm',
                  scope === o.value ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <input
                  id={`clear-scope-${o.value}`}
                  aria-label={o.title}
                  type="radio"
                  name="clear-scope"
                  value={o.value}
                  checked={scope === o.value}
                  disabled={pending != null}
                  onChange={() => setScope(o.value)}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block font-medium text-foreground">{o.title}</span>
                  <span className="block text-muted-foreground">{o.detail}</span>
                </span>
              </label>
            ))}
          </div>
          {!isDry ? <p className="text-xs text-muted-foreground">Use Dry run first to review the counts.</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending != null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending != null}
              className={isDry ? undefined : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
              onClick={(e) => {
                // Keep the dialog open until the request finishes.
                e.preventDefault()
                if (dialog) void run(dialog)
              }}
            >
              {pending === 'dry' ? 'Running…' : pending === 'clear' ? 'Clearing…' : confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
