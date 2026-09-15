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
  emarPrompt?: ServiceUserVisitTasksEmarPromptMeta
}
