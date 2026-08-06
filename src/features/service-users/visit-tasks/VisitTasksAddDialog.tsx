import * as React from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { formatRoundLabel } from '@/features/service-users/medication/medication-time-slots'
import {
  groupVisual,
  PlannerIconBadge,
  PLANNER_STAT_VISUALS,
} from '@/features/service-users/visit-tasks/visit-task-planner-visual.util'
import { VisitTaskPriorityPicker } from '@/features/service-users/visit-tasks/VisitTaskPriorityPicker'
import { VisitTaskSchedulePanel } from '@/features/service-users/visit-tasks/VisitTaskSchedulePanel'
import {
  DEFAULT_VISIT_TASK_PRIORITY,
  type VisitTaskPriorityCode,
} from '@/features/service-users/visit-tasks/visit-task-priority.util'
import {
  DEFAULT_VISIT_TASK_SCHEDULE,
  mergeVisitTaskSchedule,
  type VisitTaskSchedule,
} from '@/features/service-users/visit-tasks/visit-task-schedule.util'
import type { TaskCatalogueGroup } from '@/features/service-users/visit-tasks/types'

const GROUP_LABELS: Record<string, string> = {
  personal_care: 'Personal care',
  observations_monitoring: 'Observations & monitoring',
  condition_specific: 'Condition-specific care',
  equipment_ipc: 'Equipment & infection control',
  shopping_errands: 'Shopping & errands',
}

export type VisitTaskAddItem = {
  taskId: string
  carerInstructions: string
  priority: VisitTaskPriorityCode
  schedule: VisitTaskSchedule
}

type ReviewDraft = {
  taskId: string
  name: string
  categoryName: string
  groupCode: string
  consentRequired: boolean
  carerInstructions: string
  priority: VisitTaskPriorityCode
  schedule: VisitTaskSchedule
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roundName: string | null
  catalogue: TaskCatalogueGroup[]
  existingTaskIds: Set<string>
  saving?: boolean
  onAdd: (items: VisitTaskAddItem[]) => void | Promise<void>
}

function buildTaskLookup(catalogue: TaskCatalogueGroup[]) {
  const map = new Map<
    string,
    { name: string; categoryName: string; consentRequired: boolean; groupCode: string }
  >()
  for (const group of catalogue) {
    for (const category of group.categories) {
      for (const task of category.tasks) {
        map.set(task.id, {
          name: task.name,
          categoryName: category.name,
          consentRequired: task.consentRequired,
          groupCode: group.code,
        })
      }
    }
  }
  return map
}

export function VisitTasksAddDialog({
  open,
  onOpenChange,
  roundName,
  catalogue,
  existingTaskIds,
  saving = false,
  onAdd,
}: Props) {
  const [step, setStep] = React.useState<1 | 2>(1)
  const [search, setSearch] = React.useState('')
  const [pickedIds, setPickedIds] = React.useState<Set<string>>(new Set())
  const [reviewDrafts, setReviewDrafts] = React.useState<ReviewDraft[]>([])
  const [adding, setAdding] = React.useState(false)

  const taskLookup = React.useMemo(() => buildTaskLookup(catalogue), [catalogue])

  React.useEffect(() => {
    if (!open) {
      setStep(1)
      setSearch('')
      setPickedIds(new Set())
      setReviewDrafts([])
    }
  }, [open])

  const filteredCatalogue = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalogue
      .map((group) => ({
        ...group,
        categories: group.categories
          .map((category) => ({
            ...category,
            tasks: category.tasks.filter((task) => {
              if (existingTaskIds.has(task.id)) return false
              if (!q) return true
              return (
                task.name.toLowerCase().includes(q) ||
                category.name.toLowerCase().includes(q)
              )
            }),
          }))
          .filter((category) => category.tasks.length > 0),
      }))
      .filter((group) => group.categories.length > 0)
  }, [catalogue, existingTaskIds, search])

  const togglePick = (taskId: string) => {
    setPickedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const goToReview = () => {
    if (pickedIds.size === 0) return
    const drafts: ReviewDraft[] = [...pickedIds]
      .map((taskId) => {
        const meta = taskLookup.get(taskId)
        if (!meta) return null
        return {
          taskId,
          name: meta.name,
          categoryName: meta.categoryName,
          groupCode: meta.groupCode,
          consentRequired: meta.consentRequired,
          carerInstructions: '',
          priority: DEFAULT_VISIT_TASK_PRIORITY,
          schedule: { ...DEFAULT_VISIT_TASK_SCHEDULE },
        }
      })
      .filter((row): row is ReviewDraft => row != null)
      .sort((a, b) => a.name.localeCompare(b.name))
    setReviewDrafts(drafts)
    setStep(2)
  }

  const updateReviewInstructions = (taskId: string, carerInstructions: string) => {
    setReviewDrafts((prev) =>
      prev.map((draft) =>
        draft.taskId === taskId ? { ...draft, carerInstructions } : draft,
      ),
    )
  }

  const updateReviewPriority = (taskId: string, priority: VisitTaskPriorityCode) => {
    setReviewDrafts((prev) =>
      prev.map((draft) => (draft.taskId === taskId ? { ...draft, priority } : draft)),
    )
  }

  const updateReviewSchedule = (taskId: string, patch: Partial<VisitTaskSchedule>) => {
    setReviewDrafts((prev) =>
      prev.map((draft) =>
        draft.taskId === taskId
          ? { ...draft, schedule: mergeVisitTaskSchedule({ ...draft.schedule, ...patch }) }
          : draft,
      ),
    )
  }

  const removeReviewDraft = (taskId: string) => {
    setReviewDrafts((prev) => {
      const next = prev.filter((draft) => draft.taskId !== taskId)
      if (next.length === 0) setStep(1)
      setPickedIds((picked) => {
        const updated = new Set(picked)
        updated.delete(taskId)
        return updated
      })
      return next
    })
  }

  const handleAdd = async () => {
    if (reviewDrafts.length === 0 || saving || adding) return
    setAdding(true)
    try {
      await onAdd(
        reviewDrafts.map((draft) => ({
          taskId: draft.taskId,
          carerInstructions: draft.carerInstructions.trim(),
          priority: draft.priority,
          schedule: draft.schedule,
        })),
      )
    } finally {
      setAdding(false)
    }
  }

  const isBusy = saving || adding

  const roundLabel = roundName ? formatRoundLabel(roundName) : 'this slot'
  const selectedCount = step === 1 ? pickedIds.size : reviewDrafts.length
  const withInstructions = reviewDrafts.filter((draft) => draft.carerInstructions.trim()).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="flex max-h-[min(88vh,900px)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 rounded-t-xl border-b border-border bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <PlannerIconBadge
              visual={{
                ...PLANNER_STAT_VISUALS.tasks,
                icon: step === 1 ? PLANNER_STAT_VISUALS.tasks.icon : ListChecks,
              }}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display text-lg leading-none">
                {step === 1 ? 'Add tasks from the library' : 'Review & add guidance'}
              </DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {step === 1
                  ? `Tick tasks to add to ${roundLabel}. Tasks already on this slot are hidden.`
                  : 'Give the carer clear instructions for each task before adding them to the plan.'}
              </p>
            </div>
            {selectedCount > 0 ? (
              <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                {selectedCount} selected
              </span>
            ) : null}
          </div>
        </DialogHeader>

        {step === 1 ? (
          <DialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/30 px-5 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the task library…"
                className="rounded-xl border-border bg-card pl-9 focus-visible:ring-primary/20"
              />
            </div>

            {filteredCatalogue.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                {existingTaskIds.size > 0 && !search.trim()
                  ? 'All catalogue tasks are already on this time slot.'
                  : 'No tasks match your search.'}
              </p>
            ) : (
            filteredCatalogue.map((group) => {
              const groupStyle = groupVisual(group.code)
              const GroupIcon = groupStyle.icon
              return (
              <div key={group.id} className="space-y-2">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span
                    className={cn(
                      'grid h-6 w-6 place-items-center rounded-md ring-1',
                      groupStyle.surfaceClass,
                      groupStyle.ringClass,
                    )}
                  >
                    <GroupIcon className={cn('h-3.5 w-3.5', groupStyle.iconClass)} aria-hidden />
                  </span>
                  {GROUP_LABELS[group.code] ?? group.code.replace(/_/g, ' ')}
                </p>
                  {group.categories.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-xl border border-border bg-card p-3 shadow-sm"
                    >
                      <p className="mb-2 text-xs font-semibold text-foreground">{category.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {category.tasks.map((task) => {
                          const picked = pickedIds.has(task.id)
                          return (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => togglePick(task.id)}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                                picked
                                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                  : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
                              )}
                            >
                              {picked ? (
                                <Check className="h-3 w-3" aria-hidden />
                              ) : (
                                <Plus className="h-3 w-3" aria-hidden />
                              )}
                              {task.name}
                              {task.consentRequired ? (
                                <span
                                  className={cn(
                                    'rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                                    picked
                                      ? 'bg-primary-foreground/20 text-primary-foreground'
                                      : 'bg-amber-100 text-amber-800',
                                  )}
                                >
                                  Consent
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
            )}
          </DialogBody>
        ) : (
          <DialogBody className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 px-5 py-4">
            {reviewDrafts.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nothing selected yet.
                <button
                  type="button"
                  className="mt-2 block w-full font-semibold text-primary hover:underline"
                  onClick={() => setStep(1)}
                >
                  ← Go back and choose tasks
                </button>
              </div>
            ) : (
              reviewDrafts.map((draft) => {
                const hasInstructions = draft.carerInstructions.trim().length > 0
                const draftVisual = groupVisual(draft.groupCode)
                return (
                  <div
                    key={draft.taskId}
                    className="rounded-xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-2.5">
                      <PlannerIconBadge visual={draftVisual} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{draft.name}</span>
                          {hasInstructions ? (
                            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              <Check className="h-2.5 w-2.5" aria-hidden />
                              Guidance added
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
                              No guidance yet
                            </span>
                          )}
                        </div>
                        <span className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {draft.categoryName}
                        </span>
                        {draft.consentRequired ? (
                          <span className="ml-1.5 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Consent
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${draft.name}`}
                        onClick={() => removeReviewDraft(draft.taskId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Priority
                      </div>
                      <VisitTaskPriorityPicker
                        value={draft.priority}
                        onChange={(priority) => updateReviewPriority(draft.taskId, priority)}
                      />
                    </div>

                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5 text-primary" aria-hidden />
                        Instructions for the carer
                      </div>
                      <textarea
                        rows={3}
                        value={draft.carerInstructions}
                        placeholder="What should the carer do? Put each step on its own line."
                        className="w-full resize-y rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-xs leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        onChange={(event) =>
                          updateReviewInstructions(draft.taskId, event.target.value)
                        }
                      />
                    </div>

                    <div className="mt-3 border-t border-border pt-3">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Schedule
                      </div>
                      <VisitTaskSchedulePanel
                        compact
                        scheduleKey={`add-${draft.taskId}`}
                        schedule={draft.schedule}
                        onChange={(patch) => updateReviewSchedule(draft.taskId, patch)}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </DialogBody>
        )}

        <DialogFooter className="shrink-0 rounded-b-xl border-t border-border bg-card px-5 py-4">
          {step === 2 ? (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto gap-1 rounded-xl"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {step === 1 ? (
            <Button
              type="button"
              className="rounded-xl"
              disabled={pickedIds.size === 0 || isBusy}
              onClick={goToReview}
            >
              {pickedIds.size > 0
                ? `Review ${pickedIds.size} selected →`
                : 'Review'}
            </Button>
          ) : (
            <Button
              type="button"
              className="gap-1.5 rounded-xl"
              disabled={reviewDrafts.length === 0 || isBusy}
              onClick={() => void handleAdd()}
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Add {reviewDrafts.length} task{reviewDrafts.length === 1 ? '' : 's'}
                  {withInstructions > 0 ? ` (${withInstructions} with guidance)` : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
