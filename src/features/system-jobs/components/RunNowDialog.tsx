import { AlertTriangle, Play } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import type { SystemJob } from '@/features/system-jobs/types'
import { runNowWarning, triggerLabel } from '@/features/system-jobs/lib/system-jobs-format'

/** Confirmation before `POST /system-jobs/:name/run`. The parent runs the job and closes the dialog. */
export function RunNowDialog({
  job,
  onCancel,
  onConfirm,
}: {
  job: SystemJob | null
  onCancel: () => void
  onConfirm: (job: SystemJob) => void
}) {
  const warning = runNowWarning(job?.name)
  return (
    <Dialog open={!!job} onOpenChange={open => (!open ? onCancel() : undefined)}>
      <DialogContent size="md" className="w-[calc(100vw-2rem)]" data-testid="system-jobs-run-dialog">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">Run {job?.label ?? 'job'} now?</DialogTitle>
          <DialogDescription>
            Starts a manual run straight away, outside its normal schedule. It is recorded in the run history with your
            name.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3 text-sm">
          {warning ? (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-foreground"
              data-testid="system-jobs-run-warning"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <p>
                <span className="font-medium">Heavy job.</span> {warning} It can take several minutes.
              </p>
            </div>
          ) : null}
          {job ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-muted-foreground">
              <dt>Job</dt>
              <dd className="min-w-0 break-all font-mono text-xs leading-5 text-foreground">{job.name}</dd>
              <dt>Normally runs</dt>
              <dd className="min-w-0 text-foreground">
                {job.schedule?.human || job.schedule?.cron || '—'} · {triggerLabel(job.trigger)}
              </dd>
            </dl>
          ) : null}
          <p className="text-muted-foreground">Each job can be run by hand at most once a minute.</p>
        </DialogBody>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={() => job && onConfirm(job)}
            leftIcon={<Play className="h-4 w-4" aria-hidden />}
            className="w-full sm:w-auto"
            data-testid="system-jobs-run-confirm"
          >
            Run now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
