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
import {
  clearAllVisitPlansAndRota,
  type ClearVisitPlansAndRotaResult,
} from '@/features/service-users/visit-plan/api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

function formatCounts(result: ClearVisitPlansAndRotaResult): string {
  const rows = result.deleted ?? result.counts
  return [
    `${rows.serviceUserVisitPlan} visit plan(s)`,
    `${rows.scheduledVisit} scheduled visit(s)`,
    `${rows.scheduledJob} job(s)`,
    `${rows.jobAllocation} allocation(s)`,
  ].join(', ')
}

type Props = {
  serviceUserId: string
}

export function VisitPlanDevClearRotaToolbar({ serviceUserId }: Props) {
  const queryClient = useQueryClient()
  const [dryRunOpen, setDryRunOpen] = React.useState(false)
  const [clearOpen, setClearOpen] = React.useState(false)
  const [pending, setPending] = React.useState<'dry' | 'clear' | null>(null)
  const [preview, setPreview] = React.useState<ClearVisitPlansAndRotaResult | null>(null)

  const invalidateCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) }),
      queryClient.invalidateQueries({ queryKey: serviceUserKeys.detail(serviceUserId) }),
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all() }),
    ])
  }

  const runDryRun = async () => {
    setPending('dry')
    try {
      const result = await clearAllVisitPlansAndRota(true)
      setPreview(result)
      toastSuccess(
        'Dry run complete',
        `${result.counts.serviceUserVisitPlan} visit plan(s) and ${result.counts.scheduledJob} job(s) would be deleted across all service users.`,
      )
      setDryRunOpen(false)
    } catch (e) {
      toastApiError(e, 'Dry run failed')
    } finally {
      setPending(null)
    }
  }

  const runClear = async () => {
    setPending('clear')
    try {
      const result = await clearAllVisitPlansAndRota(false)
      setPreview(result)
      await invalidateCaches()
      toastSuccess('Visit plans and rota cleared', formatCounts(result))
      setClearOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not clear visit plans and rota')
    } finally {
      setPending(null)
    }
  }

  return (
    <section
      className="rounded-lg border border-dashed border-amber-400/80 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20"
      data-testid="visit-plan-dev-clear-rota-toolbar"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Reset visit plans & rota
          </p>
          <p className="max-w-3xl text-xs text-amber-900/90 dark:text-amber-100/90">
            Runs the same cleanup as{' '}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 dark:bg-amber-900/40">
              npx ts-node --transpile-only prisma/scripts/clear-visit-plans-and-rota.ts
            </code>
            . Deletes <strong>all</strong> visit plans and scheduling data for every service user.
            Service users, employees, and schedule areas are kept.
          </p>
          {preview ? (
            <p className="text-xs text-muted-foreground">
              Last run: {preview.dryRun ? 'dry run' : 'cleared'} — {formatCounts(preview)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending != null}
            onClick={() => setDryRunOpen(true)}
          >
            {pending === 'dry' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Dry run
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending != null}
            onClick={() => setClearOpen(true)}
          >
            {pending === 'clear' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Clear all
          </Button>
        </div>
      </div>

      <AlertDialog open={dryRunOpen} onOpenChange={setDryRunOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dry run clear script?</AlertDialogTitle>
            <AlertDialogDescription>
              Counts visit plans, jobs, allocations, and related rows across the whole database. Nothing
              is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending === 'dry'}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending === 'dry'} onClick={() => void runDryRun()}>
              {pending === 'dry' ? 'Running…' : 'Run dry run'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all visit plans and rota?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p>
                  This permanently deletes every visit plan, scheduled visit, job, allocation, and
                  schedule run for <strong className="text-foreground">all service users</strong>, not
                  only this client.
                </p>
                <p>Use dry run first to review counts. This cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending === 'clear'}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending === 'clear'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void runClear()}
            >
              {pending === 'clear' ? 'Clearing…' : 'Clear everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
