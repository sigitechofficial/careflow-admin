import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  LayoutList,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import {
  formatMedicationRoundWindow,
  formatRoundLabel,
  sortMedicationRounds,
  type MedicationRoundLookup,
} from '@/features/service-users/medication/medication-time-slots'
import {
  fetchServiceUserVisitTasks,
  fetchTaskCatalogue,
  replaceServiceUserVisitTasks,
} from '@/features/service-users/visit-tasks/api'
import { VisitTasksAddDialog, type VisitTaskAddItem } from '@/features/service-users/visit-tasks/VisitTasksAddDialog'
import { VisitTaskPriorityPicker } from '@/features/service-users/visit-tasks/VisitTaskPriorityPicker'
import {
  DEFAULT_VISIT_TASK_PRIORITY,
  normalizeVisitTaskPriority,
  visitTaskPriorityBadgeClass,
  visitTaskPriorityLabel,
  visitTaskPriorityRank,
  type VisitTaskPriorityCode,
} from '@/features/service-users/visit-tasks/visit-task-priority.util'
import {
  groupVisual,
  PlannerEmptyIcons,
  PlannerIconBadge,
  PLANNER_STAT_VISUALS,
  roundVisual,
  type PlannerVisual,
} from '@/features/service-users/visit-tasks/visit-task-planner-visual.util'
import {
  VisitTaskEditDialog,
  type VisitTaskEditValues,
} from '@/features/service-users/visit-tasks/VisitTaskEditDialog'
import {
  DEFAULT_VISIT_TASK_SCHEDULE,
  formatVisitTaskScheduleDetail,
  formatVisitTaskScheduleSummary,
  mergeVisitTaskSchedule,
  type VisitTaskSchedule,
  visitTaskFrequencyLabel,
} from '@/features/service-users/visit-tasks/visit-task-schedule.util'
import type {
  TaskCatalogueGroup,
  TaskCatalogueTask,
  VisitTaskAssignment,
} from '@/features/service-users/visit-tasks/types'

const VISIT_TASK_GROUP_CODES = new Set([
  'personal_care',
  'observations_monitoring',
  'condition_specific',
  'equipment_ipc',
  'shopping_errands',
])

const GROUP_LABELS: Record<string, string> = {
  personal_care: 'Personal care',
  observations_monitoring: 'Observations & monitoring',
  condition_specific: 'Condition-specific care',
  equipment_ipc: 'Equipment & infection control',
  shopping_errands: 'Shopping & errands',
}

type TaskMeta = {
  task: TaskCatalogueTask
  categoryName: string
  groupCode: string
}

function filterCatalogueForVisits(groups: TaskCatalogueGroup[]): TaskCatalogueGroup[] {
  return groups
    .filter((group) => VISIT_TASK_GROUP_CODES.has(group.code))
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) => category.tasks.length > 0),
    }))
    .filter((group) => group.categories.length > 0)
}

function buildTaskLookup(catalogue: TaskCatalogueGroup[]): Map<string, TaskMeta> {
  const map = new Map<string, TaskMeta>()
  for (const group of catalogue) {
    for (const category of group.categories) {
      for (const task of category.tasks) {
        map.set(task.id, {
          task,
          categoryName: category.name,
          groupCode: group.code,
        })
      }
    }
  }
  return map
}

function isEmarMedicationPromptTask(input: {
  name?: string | null
  flagsJson?: Record<string, unknown> | null
  isEmarPrompt?: boolean
}): boolean {
  if (input.isEmarPrompt) return true
  if (input.name?.trim() === 'Medication prompt') return true
  return Boolean(input.flagsJson?.emarPrompt)
}

function mergeAssignmentTasksIntoLookup(
  map: Map<string, TaskMeta>,
  assignmentsByRound: Record<string, VisitTaskAssignment[]>,
): Map<string, TaskMeta> {
  const next = new Map(map)
  for (const rows of Object.values(assignmentsByRound)) {
    for (const row of rows) {
      if (next.has(row.task.id)) continue
      next.set(row.task.id, {
        task: {
          id: row.task.id,
          name: row.task.name,
          sortOrder: row.sortOrder,
          supportLevelApplicable: row.task.supportLevelApplicable,
          consentRequired: row.task.consentRequired,
          competencyGated: row.task.competencyGated,
          competency: row.task.competency,
          outOfScope: row.task.outOfScope,
          requiresMultipleCarers: row.task.requiresMultipleCarers,
          flagsJson: row.task.flagsJson,
        },
        categoryName: row.task.categoryName,
        groupCode: row.task.groupCode,
      })
    }
  }
  return next
}

type RoundTaskDraft = {
  carerInstructions: string
  priority: VisitTaskPriorityCode
  schedule: VisitTaskSchedule
  bodyMapRequired: boolean
}

type DraftByRound = Map<string, Map<string, RoundTaskDraft>>

function buildDraftFromAssignments(
  assignmentsByRound: Record<string, VisitTaskAssignment[]>,
): DraftByRound {
  const map: DraftByRound = new Map()
  for (const [roundCode, rows] of Object.entries(assignmentsByRound)) {
    const roundMap = new Map<string, RoundTaskDraft>()
    for (const row of rows) {
      roundMap.set(row.task.id, {
        carerInstructions: row.carerInstructions ?? '',
        priority: normalizeVisitTaskPriority(row.priority),
        schedule: mergeVisitTaskSchedule(row.schedule),
        bodyMapRequired: Boolean(row.bodyMapRequired),
      })
    }
    map.set(roundCode, roundMap)
  }
  return map
}

function buildVisitTasksSavePayload(draft: DraftByRound, rounds: Array<{ code: string }>) {
  return {
    rounds: rounds.map((round) => ({
      medicationRoundCode: round.code,
      tasks: [...(draft.get(round.code)?.entries() ?? [])].map(
        ([taskCatalogueTaskId, taskDraft]) => ({
          taskCatalogueTaskId,
          carerInstructions: taskDraft.carerInstructions.trim() || null,
          priority: taskDraft.priority,
          schedule: taskDraft.schedule,
          bodyMapRequired: Boolean(taskDraft.bodyMapRequired),
        }),
      ),
    })),
  }
}

function mergeTasksIntoDraft(
  draft: DraftByRound,
  roundCode: string,
  items: VisitTaskAddItem[],
): DraftByRound {
  const nextDraft = new Map(draft)
  const roundDraft = new Map(nextDraft.get(roundCode) ?? [])
  for (const item of items) {
    roundDraft.set(item.taskId, {
      carerInstructions: item.carerInstructions,
      priority: item.priority,
      schedule: item.schedule ?? { ...DEFAULT_VISIT_TASK_SCHEDULE },
      bodyMapRequired: Boolean(item.bodyMapRequired),
    })
  }
  nextDraft.set(roundCode, roundDraft)
  return nextDraft
}

function getRoundTaskIds(roundDraft: Map<string, RoundTaskDraft> | undefined): Set<string> {
  return new Set(roundDraft ? [...roundDraft.keys()] : [])
}

function taskNeedsRecordedInput(flagsJson: TaskCatalogueTask['flagsJson']): boolean {
  const stored = flagsJson?.completionInput
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const mode = (stored as { inputMode?: string }).inputMode
    return mode !== 'tick' && mode != null
  }
  return false
}

type Props = {
  serviceUserId: string
}

// type PlannerViewMode = 'timeline' | 'list'

export function ServiceUserTasksPlannerTab({ serviceUserId }: Props) {
  const queryClient = useQueryClient()
  const lookupsQuery = useMedicationLookups(true)
  const catalogueQuery = useQuery({
    queryKey: ['task-catalogue'],
    queryFn: fetchTaskCatalogue,
    staleTime: 60_000,
  })
  const assignmentsQuery = useQuery({
    queryKey: ['service-user-visit-tasks', serviceUserId],
    queryFn: () => fetchServiceUserVisitTasks(serviceUserId),
    enabled: Boolean(serviceUserId),
  })

  const rounds = React.useMemo(
    () => sortMedicationRounds(lookupsQuery.data?.rounds ?? assignmentsQuery.data?.rounds ?? []),
    [assignmentsQuery.data?.rounds, lookupsQuery.data?.rounds],
  )

  const catalogue = React.useMemo(
    () => filterCatalogueForVisits(catalogueQuery.data ?? []),
    [catalogueQuery.data],
  )

  const taskById = React.useMemo(
    () =>
      mergeAssignmentTasksIntoLookup(
        buildTaskLookup(catalogue),
        assignmentsQuery.data?.assignmentsByRound ?? {},
      ),
    [assignmentsQuery.data?.assignmentsByRound, catalogue],
  )

  const medicationCountByRound = assignmentsQuery.data?.emarPrompt?.medicationCountByRound ?? {}

  const totalCatalogueTasks = buildTaskLookup(catalogue).size

  const [draftByRound, setDraftByRound] = React.useState<DraftByRound>(new Map())
  const [collapsedRounds, setCollapsedRounds] = React.useState<Set<string>>(new Set())
  const [search, setSearch] = React.useState('')
  const [groupFilter, setGroupFilter] = React.useState<string>('ALL')
  // Timeline view temporarily disabled — list-only for now.
  // const [viewMode, setViewMode] = React.useState<PlannerViewMode>('timeline')
  const [addDialogRoundCode, setAddDialogRoundCode] = React.useState<string | null>(null)
  const [taskEditTarget, setTaskEditTarget] = React.useState<{
    roundCode: string
    taskId: string
    taskName: string
    categoryName: string
  } | null>(null)

  React.useEffect(() => {
    if (!assignmentsQuery.data) return
    setDraftByRound(buildDraftFromAssignments(assignmentsQuery.data.assignmentsByRound))
  }, [assignmentsQuery.data])

  const saveMutation = useMutation({
    mutationFn: ({
      draft,
    }: {
      draft: DraftByRound
      successMessage?: string
    }) => replaceServiceUserVisitTasks(serviceUserId, buildVisitTasksSavePayload(draft, rounds)),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['service-user-visit-tasks', serviceUserId] })
      toastSuccess(variables.successMessage ?? 'Visit tasks saved')
    },
    onError: (error) => toastApiError(error),
  })

  const totalSelected = React.useMemo(() => {
    let count = 0
    for (const roundDraft of draftByRound.values()) count += roundDraft.size
    return count
  }, [draftByRound])

  const roundsWithTasks = React.useMemo(
    () => rounds.filter((round) => (draftByRound.get(round.code)?.size ?? 0) > 0).length,
    [draftByRound, rounds],
  )

  const consentSelected = React.useMemo(() => {
    let count = 0
    for (const roundDraft of draftByRound.values()) {
      for (const taskId of roundDraft.keys()) {
        if (taskById.get(taskId)?.task.consentRequired) count++
      }
    }
    return count
  }, [draftByRound, taskById])

  const categoriesUsed = React.useMemo(() => {
    const ids = new Set<string>()
    for (const roundDraft of draftByRound.values()) {
      for (const taskId of roundDraft.keys()) {
        const meta = taskById.get(taskId)
        if (meta) ids.add(meta.categoryName)
      }
    }
    return ids.size
  }, [draftByRound, taskById])

  const addDialogRound = rounds.find((round) => round.code === addDialogRoundCode) ?? null

  const getSelectedTasksForRound = React.useCallback(
    (roundCode: string): Array<
      TaskMeta & {
        carerInstructions: string
        priority: VisitTaskPriorityCode
        schedule: VisitTaskSchedule
        bodyMapRequired: boolean
        isEmarPrompt: boolean
      }
    > => {
      const roundDraft = draftByRound.get(roundCode) ?? new Map<string, RoundTaskDraft>()
      const q = search.trim().toLowerCase()
      const items: Array<
        TaskMeta & {
          carerInstructions: string
          priority: VisitTaskPriorityCode
          schedule: VisitTaskSchedule
          bodyMapRequired: boolean
          isEmarPrompt: boolean
        }
      > = []
      for (const [taskId, draft] of roundDraft.entries()) {
        const meta = taskById.get(taskId)
        if (!meta) continue
        if (groupFilter !== 'ALL' && meta.groupCode !== groupFilter) continue
        if (
          q &&
          !meta.task.name.toLowerCase().includes(q) &&
          !meta.categoryName.toLowerCase().includes(q) &&
          !draft.carerInstructions.toLowerCase().includes(q) &&
          !visitTaskPriorityLabel(draft.priority).toLowerCase().includes(q)
        ) {
          continue
        }
        items.push({
          ...meta,
          carerInstructions: draft.carerInstructions,
          priority: draft.priority,
          schedule: draft.schedule,
          bodyMapRequired: Boolean(draft.bodyMapRequired),
          isEmarPrompt: isEmarMedicationPromptTask(meta.task),
        })
      }
      return items.sort((a, b) => {
        if (a.isEmarPrompt !== b.isEmarPrompt) return a.isEmarPrompt ? -1 : 1
        const rankDiff = visitTaskPriorityRank(b.priority) - visitTaskPriorityRank(a.priority)
        if (rankDiff !== 0) return rankDiff
        return a.task.name.localeCompare(b.task.name)
      })
    },
    [draftByRound, groupFilter, search, taskById],
  )

  const updateRoundDraft = (
    roundCode: string,
    updater: (roundDraft: Map<string, RoundTaskDraft>) => void,
  ) => {
    setDraftByRound((prev) => {
      const next = new Map(prev)
      const roundDraft = new Map(next.get(roundCode) ?? [])
      updater(roundDraft)
      next.set(roundCode, roundDraft)
      return next
    })
  }

  const addTasksToRoundAndSave = async (roundCode: string, items: VisitTaskAddItem[]) => {
    const round = rounds.find((row) => row.code === roundCode)
    const nextDraft = mergeTasksIntoDraft(draftByRound, roundCode, items)
    setDraftByRound(nextDraft)
    await saveMutation.mutateAsync({
      draft: nextDraft,
      successMessage: round
        ? `Added ${items.length} task${items.length === 1 ? '' : 's'} to ${formatRoundLabel(round.name)}`
        : `Added ${items.length} task${items.length === 1 ? '' : 's'}`,
    })
  }

  const removeTaskFromRound = (roundCode: string, taskId: string) => {
    updateRoundDraft(roundCode, (roundDraft) => {
      roundDraft.delete(taskId)
    })
  }

  const updateTaskInstructions = (
    roundCode: string,
    taskId: string,
    carerInstructions: string,
  ) => {
    updateRoundDraft(roundCode, (roundDraft) => {
      const existing = roundDraft.get(taskId)
      if (!existing) return
      roundDraft.set(taskId, { ...existing, carerInstructions })
    })
  }

  const updateTaskPriority = (roundCode: string, taskId: string, priority: VisitTaskPriorityCode) => {
    updateRoundDraft(roundCode, (roundDraft) => {
      const existing = roundDraft.get(taskId)
      if (!existing) return
      roundDraft.set(taskId, { ...existing, priority })
    })
  }

  const toggleRoundCollapsed = (roundCode: string) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(roundCode)) next.delete(roundCode)
      else next.add(roundCode)
      return next
    })
  }

  const filtersActive = search.trim().length > 0 || groupFilter !== 'ALL'

  const isLoading =
    lookupsQuery.isLoading || catalogueQuery.isLoading || assignmentsQuery.isLoading

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </span>
        <p className="text-sm font-medium text-foreground">Loading tasks planner…</p>
        <p className="text-xs text-muted-foreground">Fetching visit slots and task library</p>
      </div>
    )
  }

  if (rounds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No medication administration rounds are configured. Add rounds in Settings → Time slots to
        plan visit tasks by time of day.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/80 bg-gradient-to-r from-primary/5 via-card to-card px-4 py-4 sm:px-5">
          <PlannerIconBadge visual={PLANNER_STAT_VISUALS.tasks} size="md" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-foreground">This visit plan</h2>
            <p className="text-xs text-muted-foreground">Tasks planned for each visit time slot</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="ml-auto h-8 shrink-0 gap-1.5"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ draft: draftByRound })}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save tasks
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
          <StatTile visual={PLANNER_STAT_VISUALS.tasks} label="Tasks selected" value={totalSelected} />
          <StatTile visual={PLANNER_STAT_VISUALS.slots} label="Slots in use" value={roundsWithTasks} />
          <StatTile visual={PLANNER_STAT_VISUALS.consent} label="Consent tasks" value={consentSelected} />
          <StatTile visual={PLANNER_STAT_VISUALS.categories} label="Categories" value={categoriesUsed} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search planned tasks…"
              className="rounded-xl border-border bg-card pl-9 focus-visible:ring-primary/20"
            />
          </div>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full rounded-xl sm:w-56">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <SelectValue placeholder="All groups" className="truncate" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All groups</SelectItem>
              {catalogue.map((group) => (
                <SelectItem key={group.id} value={group.code}>
                  {GROUP_LABELS[group.code] ?? group.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setSearch('')
                setGroupFilter('ALL')
              }}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
        {filtersActive ? (
          <p className="text-xs text-muted-foreground">
            Filtering tasks shown in the list — your selections are unchanged.
          </p>
        ) : null}
      </section>

      <div className="min-w-0 space-y-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PlannerIconBadge
                visual={{
                  ...PLANNER_STAT_VISUALS.slots,
                  icon: LayoutList,
                }}
                size="sm"
              />
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  All tasks by visit slot
                </h2>
                <p className="text-xs text-muted-foreground">
                  Compact list of every planned task — expand a slot to show or hide its tasks
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Timeline / list toggle — timeline temporarily commented out
              <div
                className="inline-flex rounded-xl border border-border bg-card p-0.5 shadow-sm"
                role="group"
                aria-label="Tasks planner view"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'timeline'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                    viewMode === 'timeline'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onClick={() => setViewMode('timeline')}
                >
                  <ListTree className="h-3.5 w-3.5" aria-hidden />
                  Timeline
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'list'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="h-3.5 w-3.5" aria-hidden />
                  List
                </button>
              </div>
              */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => setCollapsedRounds(new Set())}
              >
                Expand all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => setCollapsedRounds(new Set(rounds.map((r) => r.code)))}
              >
                Collapse all
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
                {(() => {
                  const CatalogueIcon = PLANNER_STAT_VISUALS.categories.icon
                  return <CatalogueIcon className="h-3.5 w-3.5 text-violet-600" aria-hidden />
                })()}
                {totalCatalogueTasks} in library
              </span>
            </div>
          </div>

          {/* Timeline view temporarily disabled
          {viewMode === 'timeline' ? (
          <div className="relative">
            ... timeline content ...
          </div>
          ) : (
          */}
            <div className="space-y-4">
              {rounds.map((round) => {
                const roundStyle = roundVisual(round.code)
                const windowLabel = formatMedicationRoundWindow(round)
                const selectedCount = draftByRound.get(round.code)?.size ?? 0
                const visibleTasks = getSelectedTasksForRound(round.code)
                const collapsed = collapsedRounds.has(round.code)

                return (
                  <PlannerRoundListSection
                    key={round.id}
                    serviceUserId={serviceUserId}
                    round={round}
                    roundStyle={roundStyle}
                    windowLabel={windowLabel}
                    selectedCount={selectedCount}
                    medicationDueCount={medicationCountByRound[round.code] ?? 0}
                    visibleTasks={visibleTasks}
                    collapsed={collapsed}
                    onToggleCollapsed={() => toggleRoundCollapsed(round.code)}
                    onAdd={() => setAddDialogRoundCode(round.code)}
                    onRemove={(taskId) => removeTaskFromRound(round.code, taskId)}
                    onInstructionsChange={(taskId, value) =>
                      updateTaskInstructions(round.code, taskId, value)
                    }
                    onPriorityChange={(taskId, value) =>
                      updateTaskPriority(round.code, taskId, value)
                    }
                    onEditSchedule={(taskId, taskName) =>
                      setTaskEditTarget({
                        roundCode: round.code,
                        taskId,
                        taskName,
                        categoryName:
                          visibleTasks.find((t) => t.task.id === taskId)?.categoryName ?? '',
                      })
                    }
                  />
                )
              })}
            </div>
          {/* )} */}
      </div>

      <VisitTasksAddDialog
        open={Boolean(addDialogRoundCode)}
        saving={saveMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !saveMutation.isPending) setAddDialogRoundCode(null)
        }}
        roundName={addDialogRound?.name ?? null}
        catalogue={catalogue}
        existingTaskIds={
          addDialogRound ? getRoundTaskIds(draftByRound.get(addDialogRound.code)) : new Set()
        }
        onAdd={async (items) => {
          if (!addDialogRoundCode) return
          await addTasksToRoundAndSave(addDialogRoundCode, items)
          setAddDialogRoundCode(null)
        }}
      />

      <VisitTaskEditDialog
        key={
          taskEditTarget
            ? `${taskEditTarget.roundCode}:${taskEditTarget.taskId}`
            : 'task-edit-closed'
        }
        open={Boolean(taskEditTarget)}
        taskName={taskEditTarget?.taskName ?? ''}
        categoryName={taskEditTarget?.categoryName}
        initial={
          taskEditTarget
            ? (() => {
                const draft = draftByRound
                  .get(taskEditTarget.roundCode)
                  ?.get(taskEditTarget.taskId)
                return {
                  carerInstructions: draft?.carerInstructions ?? '',
                  priority: draft?.priority ?? DEFAULT_VISIT_TASK_PRIORITY,
                  schedule: draft?.schedule ?? DEFAULT_VISIT_TASK_SCHEDULE,
                  bodyMapRequired: Boolean(draft?.bodyMapRequired),
                } satisfies VisitTaskEditValues
              })()
            : {
                carerInstructions: '',
                priority: DEFAULT_VISIT_TASK_PRIORITY,
                schedule: DEFAULT_VISIT_TASK_SCHEDULE,
                bodyMapRequired: false,
              }
        }
        onOpenChange={(open) => {
          if (!open) setTaskEditTarget(null)
        }}
        onSave={(values) => {
          if (!taskEditTarget) return
          const next = new Map(draftByRound)
          const roundDraft = new Map(next.get(taskEditTarget.roundCode) ?? [])
          const existing = roundDraft.get(taskEditTarget.taskId)
          if (!existing) return
          roundDraft.set(taskEditTarget.taskId, {
            carerInstructions: values.carerInstructions,
            priority: values.priority,
            schedule: mergeVisitTaskSchedule(values.schedule),
            bodyMapRequired: Boolean(values.bodyMapRequired),
          })
          next.set(taskEditTarget.roundCode, roundDraft)
          setDraftByRound(next)
          void saveMutation.mutateAsync({
            draft: next,
            successMessage: 'Task updated',
          })
        }}
      />
    </div>
  )
}

type PlannerTaskRow = TaskMeta & {
  carerInstructions: string
  priority: VisitTaskPriorityCode
  schedule: VisitTaskSchedule
  bodyMapRequired: boolean
  isEmarPrompt: boolean
}

function PlannerRoundListSection({
  serviceUserId,
  round,
  roundStyle,
  windowLabel,
  selectedCount,
  medicationDueCount,
  visibleTasks,
  collapsed,
  onToggleCollapsed,
  onAdd,
  onRemove,
  onInstructionsChange,
  onPriorityChange,
  onEditSchedule,
}: {
  serviceUserId: string
  round: MedicationRoundLookup
  roundStyle: PlannerVisual
  windowLabel: string | null
  selectedCount: number
  medicationDueCount: number
  visibleTasks: PlannerTaskRow[]
  collapsed: boolean
  onToggleCollapsed: () => void
  onAdd: () => void
  onRemove: (taskId: string) => void
  onInstructionsChange: (taskId: string, value: string) => void
  onPriorityChange: (taskId: string, value: VisitTaskPriorityCode) => void
  onEditSchedule: (taskId: string, taskName: string) => void
}) {
  const RoundIcon = roundStyle.icon

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/30 px-4 py-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1',
              roundStyle.surfaceClass,
              roundStyle.ringClass,
            )}
          >
            <RoundIcon className={cn('h-4 w-4', roundStyle.iconClass)} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-foreground">
                {formatRoundLabel(round.name)}
              </h3>
              {windowLabel ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {windowLabel}
                </span>
              ) : null}
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {selectedCount}
              </span>
              {medicationDueCount > 0 ? (
                <Link
                  to="/service-users/$serviceUserId/medication"
                  params={{ serviceUserId }}
                  search={{ view: 'calendar' }}
                  className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
                  onClick={(event) => event.stopPropagation()}
                >
                  {medicationDueCount} eMAR med
                  {medicationDueCount === 1 ? '' : 's'}
                </Link>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {collapsed
                ? `Hidden · ${selectedCount} task${selectedCount === 1 ? '' : 's'}`
                : selectedCount > 0
                  ? `${selectedCount} task${selectedCount === 1 ? '' : 's'} planned`
                  : 'No tasks yet'}
            </p>
          </div>
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 rounded-lg border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {!collapsed ? (
        selectedCount === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-primary/5"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <PlannerEmptyIcons.addFirst className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-xs text-muted-foreground">
            No tasks yet — add the first one for this time slot.
          </span>
        </button>
      ) : visibleTasks.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-4 text-xs text-muted-foreground">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
            <PlannerEmptyIcons.noMatch className="h-4 w-4" aria-hidden />
          </span>
          No planned tasks match your filter for this slot.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/20 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Task</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Schedule</th>
                <th className="min-w-[220px] px-4 py-2.5">Instructions</th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleTasks.map((meta) => {
                const taskVisual = groupVisual(meta.groupCode)
                const TaskIcon = taskVisual.icon
                const needsInput = taskNeedsRecordedInput(meta.task.flagsJson)

                return (
                  <tr key={meta.task.id} className="group align-top hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1',
                            taskVisual.surfaceClass,
                            taskVisual.ringClass,
                          )}
                        >
                          <TaskIcon className={cn('h-3.5 w-3.5', taskVisual.iconClass)} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          {meta.isEmarPrompt ? (
                            <Link
                              to="/service-users/$serviceUserId/medication"
                              params={{ serviceUserId }}
                              search={{ view: 'calendar' }}
                              className="inline-flex items-center gap-1.5 font-medium leading-snug text-rose-700 hover:underline dark:text-rose-300"
                            >
                              {meta.task.name}
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                            </Link>
                          ) : (
                            <p className="font-medium leading-snug text-foreground">{meta.task.name}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {meta.isEmarPrompt ? (
                              <Link
                                to="/service-users/$serviceUserId/medication"
                                params={{ serviceUserId }}
                                search={{ view: 'calendar' }}
                                className="inline-flex rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
                              >
                                Open MAR calendar
                              </Link>
                            ) : null}
                            {meta.task.consentRequired ? (
                              <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                Consent
                              </span>
                            ) : null}
                            {needsInput ? (
                              <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                Needs reading / notes
                              </span>
                            ) : null}
                            {meta.bodyMapRequired ? (
                              <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                Body map required
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{meta.categoryName}</td>
                    <td className="px-4 py-3">
                      <VisitTaskPriorityPicker
                        size="sm"
                        value={meta.priority}
                        onChange={(value) => onPriorityChange(meta.task.id, value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => onEditSchedule(meta.task.id, meta.task.name)}
                      >
                        <VisitTaskScheduleBadge schedule={meta.schedule} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        rows={2}
                        value={meta.carerInstructions}
                        placeholder="Instructions for the carer…"
                        className="w-full min-w-[200px] resize-y rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        onChange={(event) =>
                          onInstructionsChange(meta.task.id, event.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {meta.isEmarPrompt ? (
                          <Link
                            to="/service-users/$serviceUserId/medication"
                            params={{ serviceUserId }}
                            search={{ view: 'calendar' }}
                            className="grid h-8 w-8 place-items-center rounded-lg text-rose-700 opacity-80 transition hover:bg-rose-100 hover:opacity-100 dark:text-rose-300 dark:hover:bg-rose-950"
                            aria-label={`Open medication page for ${meta.task.name}`}
                            title="Open MAR calendar"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-lg text-primary opacity-70 transition hover:bg-primary/10 hover:opacity-100"
                          aria-label={`Edit schedule for ${meta.task.name}`}
                          onClick={() => onEditSchedule(meta.task.id, meta.task.name)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {meta.isEmarPrompt ? (
                          <span
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground/50"
                            title="Managed from eMAR — removed automatically when no scheduled meds remain for this slot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-lg text-destructive opacity-60 transition hover:bg-destructive/10 hover:opacity-100"
                            aria-label={`Remove ${meta.task.name}`}
                            onClick={() => onRemove(meta.task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      ) : null}
    </div>
  )
}

function VisitTaskScheduleBadge({ schedule }: { schedule: VisitTaskSchedule }) {
  const frequency = visitTaskFrequencyLabel(schedule.scheduleFrequency)
  const summary = formatVisitTaskScheduleSummary(schedule)

  return (
    <div
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5"
      title={summary}
    >
      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        {frequency}
      </span>
      <span className="min-w-0 truncate text-[11px] font-medium text-foreground">
        {formatVisitTaskScheduleDetail(schedule)}
        {schedule.repeatEvery > 1 ? ` · every ${schedule.repeatEvery}` : null}
      </span>
    </div>
  )
}

function SelectedTaskCard({
  meta,
  carerInstructions,
  priority,
  schedule,
  onInstructionsChange,
  onPriorityChange,
  onEditSchedule,
  onRemove,
}: {
  meta: TaskMeta
  carerInstructions: string
  priority: VisitTaskPriorityCode
  schedule: VisitTaskSchedule
  onInstructionsChange: (value: string) => void
  onPriorityChange: (value: VisitTaskPriorityCode) => void
  onEditSchedule: () => void
  onRemove: () => void
}) {
  const needsInput = taskNeedsRecordedInput(meta.task.flagsJson)
  const hasInstructions = carerInstructions.trim().length > 0
  const taskVisual = groupVisual(meta.groupCode)

  return (
    <div className="group flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <PlannerIconBadge visual={taskVisual} size="sm" className="mt-0.5 self-start" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-snug text-foreground">{meta.task.name}</h4>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-lg text-primary transition hover:bg-primary/10"
              aria-label={`Edit schedule for ${meta.task.name}`}
              onClick={onEditSchedule}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10"
              aria-label={`Remove ${meta.task.name}`}
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {meta.categoryName}
          </span>
          {priority !== DEFAULT_VISIT_TASK_PRIORITY ? (
            <span
              className={cn(
                'inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold',
                visitTaskPriorityBadgeClass(priority),
              )}
            >
              {visitTaskPriorityLabel(priority)}
            </span>
          ) : null}
          {meta.task.consentRequired ? (
            <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Consent
            </span>
          ) : null}
          {needsInput ? (
            <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Needs reading / notes on visit
            </span>
          ) : null}
          {hasInstructions ? (
            <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Guidance added
            </span>
          ) : null}
        </div>
        <button type="button" className="mt-2 w-full text-left" onClick={onEditSchedule}>
          <VisitTaskScheduleBadge schedule={schedule} />
        </button>
        <details className="group/details mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open/details:rotate-90" />
            <ListChecks className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            Task details
          </summary>
          <div className="mt-2 space-y-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Priority
              </p>
              <VisitTaskPriorityPicker
                size="sm"
                value={priority}
                onChange={onPriorityChange}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Instructions for the carer
              </p>
              <textarea
                rows={3}
                value={carerInstructions}
                placeholder="What should the carer do? Put each step on its own line."
                className="w-full resize-y rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => onInstructionsChange(event.target.value)}
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

function StatTile({
  visual,
  label,
  value,
}: {
  visual: (typeof PLANNER_STAT_VISUALS)[keyof typeof PLANNER_STAT_VISUALS]
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 transition hover:border-primary/20 hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <PlannerIconBadge visual={visual} size="sm" />
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold leading-none text-foreground">
        {value}
      </div>
    </div>
  )
}
