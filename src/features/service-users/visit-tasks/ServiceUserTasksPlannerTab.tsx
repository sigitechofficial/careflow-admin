import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Filter,
  ListChecks,
  ListTree,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
  SIDEBAR_ICONS,
  SUMMARY_ROW_ICONS,
} from '@/features/service-users/visit-tasks/visit-task-planner-visual.util'
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

type RoundTaskDraft = {
  carerInstructions: string
  priority: VisitTaskPriorityCode
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

  const taskById = React.useMemo(() => buildTaskLookup(catalogue), [catalogue])

  const totalCatalogueTasks = taskById.size

  const [draftByRound, setDraftByRound] = React.useState<DraftByRound>(new Map())
  const [collapsedRounds, setCollapsedRounds] = React.useState<Set<string>>(new Set())
  const [search, setSearch] = React.useState('')
  const [groupFilter, setGroupFilter] = React.useState<string>('ALL')
  const [addDialogRoundCode, setAddDialogRoundCode] = React.useState<string | null>(null)

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

  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const roundDraft of draftByRound.values()) {
      for (const taskId of roundDraft.keys()) {
        const meta = taskById.get(taskId)
        if (!meta) continue
        const row = counts.get(meta.categoryName) ?? { name: meta.categoryName, count: 0 }
        row.count++
        counts.set(meta.categoryName, row)
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)
  }, [draftByRound, taskById])

  const addDialogRound = rounds.find((round) => round.code === addDialogRoundCode) ?? null

  const getSelectedTasksForRound = React.useCallback(
    (roundCode: string): Array<TaskMeta & { carerInstructions: string; priority: VisitTaskPriorityCode }> => {
      const roundDraft = draftByRound.get(roundCode) ?? new Map<string, RoundTaskDraft>()
      const q = search.trim().toLowerCase()
      const items: Array<TaskMeta & { carerInstructions: string; priority: VisitTaskPriorityCode }> = []
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
        })
      }
      return items.sort((a, b) => {
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
            Filtering tasks shown in the timeline — your selections are unchanged.
          </p>
        ) : null}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PlannerIconBadge
                visual={{
                  ...PLANNER_STAT_VISUALS.slots,
                  icon: ListTree,
                }}
                size="sm"
              />
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                  The day, call by call
                </h2>
                <p className="text-xs text-muted-foreground">Plan tasks for each visit window</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
              {(() => {
                const CatalogueIcon = PLANNER_STAT_VISUALS.categories.icon
                return <CatalogueIcon className="h-3.5 w-3.5 text-violet-600" aria-hidden />
              })()}
              {totalCatalogueTasks} in library
            </span>
          </div>

          <div className="relative">
            {rounds.map((round, index) => {
              const roundStyle = roundVisual(round.code)
              const windowLabel = formatMedicationRoundWindow(round)
              const collapsed = collapsedRounds.has(round.code)
              const isLast = index === rounds.length - 1
              const roundDraft = draftByRound.get(round.code)
              const selectedCount = roundDraft?.size ?? 0
              const visibleTasks = getSelectedTasksForRound(round.code)

              return (
                <div key={round.id} className="relative pb-5 pl-12 sm:pl-16">
                  {!isLast ? (
                    <span
                      className="absolute bottom-0 left-[19px] top-12 w-px bg-border sm:left-[27px]"
                      aria-hidden
                    />
                  ) : null}

                  <PlannerIconBadge
                    visual={roundStyle}
                    size="lg"
                    className="absolute left-0 top-1"
                  />

                  <div className="mb-2.5 flex min-h-[40px] items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleRoundCollapsed(round.code)}
                      className="flex min-w-0 items-center gap-2 text-left"
                    >
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
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
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedCount > 0
                            ? `${selectedCount} task${selectedCount === 1 ? '' : 's'} on this visit`
                            : 'No tasks yet'}
                        </p>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1 rounded-lg border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => setAddDialogRoundCode(round.code)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>

                  {!collapsed ? (
                    <div className="space-y-2">
                      {selectedCount === 0 ? (
                        <button
                          type="button"
                          onClick={() => setAddDialogRoundCode(round.code)}
                          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-3.5 py-3.5 text-left transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <PlannerEmptyIcons.addFirst className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="text-xs text-muted-foreground">
                            No tasks yet — add the first one for this time slot.
                          </span>
                        </button>
                      ) : visibleTasks.length === 0 ? (
                        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3.5 py-3 text-xs text-muted-foreground">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                            <PlannerEmptyIcons.noMatch className="h-4 w-4" aria-hidden />
                          </span>
                          No planned tasks match your filter for this slot.
                        </div>
                      ) : (
                        visibleTasks.map((meta) => (
                          <SelectedTaskCard
                            key={meta.task.id}
                            meta={meta}
                            carerInstructions={meta.carerInstructions}
                            priority={meta.priority}
                            onInstructionsChange={(value) =>
                              updateTaskInstructions(round.code, meta.task.id, value)
                            }
                            onPriorityChange={(value) =>
                              updateTaskPriority(round.code, meta.task.id, value)
                            }
                            onRemove={() => removeTaskFromRound(round.code, meta.task.id)}
                          />
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <SidebarCard visual={SIDEBAR_ICONS.summary} title="Plan summary">
            <div className="space-y-1.5 text-xs">
              <SummaryRow icon={SUMMARY_ROW_ICONS.total} label="Total selected" value={String(totalSelected)} />
              <SummaryRow
                icon={SUMMARY_ROW_ICONS.slots}
                label="Time slots in use"
                value={`${roundsWithTasks} of ${rounds.length}`}
              />
              <SummaryRow icon={SUMMARY_ROW_ICONS.catalogue} label="Catalogue size" value={String(totalCatalogueTasks)} />
            </div>
          </SidebarCard>

          <SidebarCard visual={SIDEBAR_ICONS.category} title="By category">
            <div className="space-y-2">
              {categoryCounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tasks selected yet.</p>
              ) : (
                categoryCounts.slice(0, 8).map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-foreground">{row.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-primary">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (row.count / Math.max(totalSelected, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </SidebarCard>

          <SidebarCard visual={SIDEBAR_ICONS.timeSlot} title="By time slot">
            <div className="space-y-2">
              {rounds.map((round) => {
                const count = draftByRound.get(round.code)?.size ?? 0
                const slotVisual = roundVisual(round.code)
                const SlotIcon = slotVisual.icon
                return (
                  <div
                    key={round.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                      <span
                        className={cn(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1',
                          slotVisual.surfaceClass,
                          slotVisual.ringClass,
                        )}
                      >
                        <SlotIcon className={cn('h-3.5 w-3.5', slotVisual.iconClass)} aria-hidden />
                      </span>
                      <span className="truncate">{formatRoundLabel(round.name)}</span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                        count > 0
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </SidebarCard>
        </aside>
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
    </div>
  )
}

function SelectedTaskCard({
  meta,
  carerInstructions,
  priority,
  onInstructionsChange,
  onPriorityChange,
  onRemove,
}: {
  meta: TaskMeta
  carerInstructions: string
  priority: VisitTaskPriorityCode
  onInstructionsChange: (value: string) => void
  onPriorityChange: (value: VisitTaskPriorityCode) => void
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
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-destructive opacity-0 transition hover:bg-destructive/10 group-hover:opacity-100"
            aria-label={`Remove ${meta.task.name}`}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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

function SidebarCard({
  visual: VisualIcon,
  title,
  children,
}: {
  visual: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <VisualIcon className="h-4 w-4 text-primary" aria-hidden />
        </span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-2.5 py-2">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}
