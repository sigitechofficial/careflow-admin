export type TaskCatalogueTask = {
  id: string
  name: string
  sortOrder: number
  supportLevelApplicable: boolean
  consentRequired: boolean
  competencyGated: boolean
  competency: string | null
  outOfScope: boolean
  requiresMultipleCarers?: boolean
  flagsJson: Record<string, unknown> | null
}

export type TaskCatalogueCategory = {
  id: string
  name: string
  sortOrder: number
  tasks: TaskCatalogueTask[]
}

export type TaskCatalogueGroup = {
  id: string
  code: string
  source: string | null
  sortOrder: number
  categories: TaskCatalogueCategory[]
}

export type VisitTaskAssignment = {
  id: string
  medicationRoundCode: string
  sortOrder: number
  carerInstructions: string | null
  bodyMapRequired?: boolean
  priority: string
  /** HH:mm — task shows on the visit whose time window contains this (like medicine due times). */
  dueTime?: string | null
  schedule: import('@/features/service-users/visit-tasks/visit-task-schedule.util').VisitTaskSchedule
  createdAt?: string | null
  createdById?: string | null
  createdByName?: string | null
  isEmarPrompt?: boolean
  task: {
    id: string
    name: string
    categoryId: string
    categoryName: string
    groupCode: string
    supportLevelApplicable: boolean
    consentRequired: boolean
    competencyGated: boolean
    competency: string | null
    outOfScope: boolean
    requiresMultipleCarers?: boolean
    flagsJson: Record<string, unknown> | null
  }
}

export type MedicationRoundLookupRow = {
  id: string
  name: string
  code: string
  time: string
  windowStart: string | null
  windowEnd: string | null
  sortOrder: number
}

export type ServiceUserVisitTasksEmarPromptMeta = {
  medicationCountByRound: Record<string, number>
  addedRoundCodes: string[]
  removedRoundCodes: string[]
}

export type ServiceUserVisitTasksResponse = {
  rounds: MedicationRoundLookupRow[]
  assignmentsByRound: Record<string, VisitTaskAssignment[]>
  /** Pre-fill for a new task's due time: client's slot start for the round, else round time. */
  defaultDueTimeByRound?: Record<string, string>
  /** No visit covers a task → nearest visit only within this many minutes (null = no limit). */
  nearestVisitGraceMinutes?: number | null
  /** Next 7 days with tasks due but no live visit created — those tasks reach no carer. */
  daysWithoutVisit?: Array<{ date: string; taskCount: number }>
  /** Next 7 days: tasks on days with visits that no visit covers and none is within grace. */
  /** Per task (assignment id), next 7 days: due days vs days it reaches a visit. */
  visitLinkByAssignment?: Record<string, VisitTaskLinkSummary>
  unplacedTasks?: Array<{
    date: string
    assignmentId: string
    taskName: string
    medicationRoundCode: string
    dueTime: string | null
    nearestGapMinutes: number | null
  }>
  emarPrompt?: ServiceUserVisitTasksEmarPromptMeta
}

/** Next 7 days for one planned task: due days, days it reaches a visit, and why not on the rest. */
export type VisitTaskLinkSummary = {
  dueDays: number
  linkedDays: number
  /** Due days with no live visit created. */
  noVisitDays: number
  /** Due days with visits, but none covers the time and the nearest is beyond the grace. */
  beyondGraceDays: number
  /** Due days where the task's visit was cancelled / called off (not done, not moved). */
  cancelledDays: number
}

/** Short reason shown on the planner badge, e.g. "no visit created". */
export function visitTaskLinkReason(link: VisitTaskLinkSummary): string {
  const { noVisitDays, beyondGraceDays } = link
  if (noVisitDays > 0 && beyondGraceDays > 0) {
    return `no visit (${noVisitDays} ${noVisitDays === 1 ? 'day' : 'days'}) · beyond grace (${beyondGraceDays} ${beyondGraceDays === 1 ? 'day' : 'days'})`
  }
  if (beyondGraceDays > 0) return 'nearest visit beyond grace'
  return 'no visit created'
}
