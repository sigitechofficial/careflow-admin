import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ScheduleRunRecommendCarers } from '@/features/scheduling/components/ScheduleRunRecommendCarers'
import { ScheduleRunRouteMap } from '@/features/scheduling/components/ScheduleRunRouteMap'
import type { ScheduleRunRow, ScheduleRunStatus } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleRunStats } from '@/features/scheduling/utils/schedule-run-stats.util'
import { sortJobsByStartTime } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import { formatJobTimeRange, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import { formatScheduleJobsDateLabel } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/shared/ui/dialog'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'

type RunTab = 'run' | 'map'

type CarerOption = {
  value: string
  label: string
  description?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  run: ScheduleRunRow | null
  runs: ScheduleRunRow[]
  date: string
  stats: ScheduleRunStats
  editName: string
  onEditNameChange: (value: string) => void
  editEmployeeId: string
  onEditEmployeeIdChange: (value: string) => void
  editNotes: string
  onEditNotesChange: (value: string) => void
  carerOptions: CarerOption[]
  carersLoading?: boolean
  onSwitchRun: (run: ScheduleRunRow) => void
  onSave: () => void | Promise<void>
  onSaveAndUpdateSchedule: () => void | Promise<void>
  onCancel: () => void
  onDelete?: () => void | Promise<void>
  saving?: boolean
  updatingSchedule?: boolean
  deleting?: boolean
}

const RUN_STATUS_LABELS: Record<ScheduleRunStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="grid grid-cols-[minmax(8rem,10rem)_1fr] items-baseline gap-x-4 gap-y-0.5 border-b border-border/70 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div>
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

export function ScheduleRunEditDialog({
  open,
  onOpenChange,
  run,
  runs,
  date,
  stats,
  editName,
  onEditNameChange,
  editEmployeeId,
  onEditEmployeeIdChange,
  editNotes,
  onEditNotesChange,
  carerOptions,
  carersLoading,
  onSwitchRun,
  onSave,
  onSaveAndUpdateSchedule,
  onCancel,
  onDelete,
  saving,
  updatingSchedule,
  deleting,
}: Props) {
  const [activeTab, setActiveTab] = React.useState<RunTab>('run')
  const [recommendOpen, setRecommendOpen] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setActiveTab('run')
      setRecommendOpen(false)
    }
  }, [open, run?.id])

  const runOptions = React.useMemo(
    () =>
      runs
        .filter((r) => r.status !== 'CANCELLED')
        .map((r) => ({
          value: r.id,
          label: r.name,
          description: `${RUN_STATUS_LABELS[r.status]} · ${(r.jobs ?? []).length} visit(s)`,
        })),
    [runs],
  )

  const sortedJobs = React.useMemo(
    () => sortJobsByStartTime(run?.jobs ?? []),
    [run?.jobs],
  )

  const recommendJob = sortedJobs[0] ?? null
  const canEdit = run && run.status !== 'CANCELLED' && run.status !== 'COMPLETED'
  const busy = Boolean(saving || updatingSchedule)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="gap-0 p-0">
        <DialogHeader className="space-y-0 border-b border-border px-5 pb-0 pt-4">
          <div className="flex gap-0">
            {(['run', 'map'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-t-md px-4 py-2 text-sm font-semibold capitalize transition-colors',
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-start justify-between gap-3 py-3">
            <div>
              <h2 className="text-lg font-bold text-primary">{editName || run?.name || 'Run'}</h2>
              <p className="text-xs text-muted-foreground">
                {formatScheduleJobsDateLabel(date)}
                {run ? ` · ${RUN_STATUS_LABELS[run.status]}` : ''}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 px-5 py-4">
          {activeTab === 'run' ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <FormField label="Carer" htmlFor="edit-run-carer" required className="flex-1">
                  <div className="flex gap-2">
                    <Combobox
                      options={carerOptions}
                      value={editEmployeeId}
                      onChange={onEditEmployeeIdChange}
                      placeholder="Select carer…"
                      searchPlaceholder="Search carers…"
                      emptyText="No carers found."
                      loading={carersLoading}
                      allowDeselect
                      disabled={!canEdit}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      title="View recommended carers"
                      disabled={!canEdit}
                      onClick={() => setRecommendOpen((v) => !v)}
                    >
                      Recommend
                    </Button>
                  </div>
                </FormField>
              </div>

              <ScheduleRunRecommendCarers
                job={recommendJob}
                selectedEmployeeId={editEmployeeId}
                onSelectCarer={onEditEmployeeIdChange}
                open={recommendOpen}
                onOpenChange={setRecommendOpen}
              />

              <FormField label="Run" htmlFor="edit-run-picker" required>
                <Combobox
                  options={runOptions}
                  value={run?.id ?? ''}
                  onChange={(runId) => {
                    const next = runs.find((r) => r.id === runId)
                    if (next) onSwitchRun(next)
                  }}
                  placeholder="Select run…"
                  searchPlaceholder="Search runs…"
                  emptyText="No runs found."
                  className="w-full"
                />
              </FormField>

              {canEdit ? (
                <FormField
                  label="Run name"
                  htmlFor="edit-run-name"
                  hint="Displayed on the rota and in this dialog title."
                >
                  <Input
                    id="edit-run-name"
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    placeholder="e.g. AM Run 1"
                  />
                </FormField>
              ) : null}

              {sortedJobs.length > 0 ? (
                <div className="rounded-lg border border-border">
                  <p className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Stats
                  </p>
                  <div className="px-3">
                    <StatRow label="Rostered hours" value={stats.rosteredDisplayLabel} />
                    <StatRow label="Travel distance" value={stats.travelDistanceLabel} />
                    <StatRow
                      label="Travel time"
                      value={stats.travelMinutes > 0 ? stats.travelTimeDisplayLabel : '—'}
                      hint={stats.travelPercentDisplayLabel}
                    />
                    <StatRow
                      label="Wait time"
                      value={stats.waitMinutes > 0 ? stats.waitDisplayLabel : '—'}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add visits to this run to see route stats and map.
                </p>
              )}

              {sortedJobs.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/15">
                  <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Visit sequence
                  </p>
                  <ol className="divide-y divide-border">
                    {sortedJobs.map((job, index) => (
                      <li
                        key={job.id}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{serviceUserLabel(job.serviceUser)}</p>
                          <p className="text-xs text-muted-foreground">{formatJobTimeRange(job)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <FormField label="Notes" htmlFor="edit-run-notes" hint="Optional internal notes for coordinators.">
                <Textarea
                  id="edit-run-notes"
                  value={editNotes}
                  onChange={(e) => onEditNotesChange(e.target.value)}
                  rows={2}
                  disabled={!canEdit}
                  placeholder="Route notes, handover details, or area coverage…"
                />
              </FormField>
            </>
          ) : (
            <ScheduleRunRouteMap jobs={sortedJobs} height={420} />
          )}
        </DialogBody>

        <DialogFooter className="flex-wrap gap-2 border-t border-border px-5 py-4 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {canEdit && onDelete ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => void onDelete()}
                disabled={deleting || busy}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete run'
                )}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onSave()}
              disabled={!canEdit || busy}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
            <Button
              type="button"
              onClick={() => void onSaveAndUpdateSchedule()}
              disabled={!canEdit || busy}
            >
              {updatingSchedule ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                'Save & update schedule'
              )}
            </Button>
            <Button type="button" variant="destructive" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
